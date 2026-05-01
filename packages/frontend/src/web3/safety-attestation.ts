import {
  type AgentSafetyAttestation,
  type MisalignmentEncounter,
  type MisalignmentKind,
  type PlayLog,
  deriveSafetyAttestation,
} from '@gradiusweb3/shared/browser';
import {
  http,
  type Address,
  type WalletClient,
  createPublicClient,
  namehash,
} from 'viem';
import { galileo, sepolia } from './chains';
import { registerSubname } from './ens-register';
import type { EnsProof, OnChainStep, StorageProof } from './types';
import { type ZeroGSigner, putAttestation } from './zerog-storage';

/// Sepolia の ENS Registry。NameWrapper とは別、namehash → owner address を引く。
/// 値は ENS deployments registry の deterministic deploy アドレス。
const ENS_REGISTRY_SEPOLIA =
  '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' as const satisfies Address;

const REGISTRY_OWNER_ABI = [
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/// 任意の chain id への switch を試行する共通ヘルパ。
/// 既に同 chain ならば no-op。switchChain が throw した場合は friendly な
/// 日本語メッセージで上位に伝播する (private key 等は露出させない)。
async function ensureChain(
  walletClient: WalletClient,
  targetId: number,
  label: string
): Promise<void> {
  const chainId = walletClient.chain?.id;
  if (chainId === targetId) return;
  try {
    await walletClient.switchChain({ id: targetId });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'unknown';
    throw new Error(
      `chain mismatch — ${label} (${targetId}) への切替に失敗しました (現在 ${chainId ?? 'unknown'}): ${detail}`
    );
  }
}

/// Sepolia 接続を assert する。ENS write は Sepolia 以外で走るとアテステーション
/// が別 chain に書かれる事故になるため、書込み直前で必ず通す。
async function ensureSepoliaChain(walletClient: WalletClient): Promise<void> {
  await ensureChain(walletClient, sepolia.id, 'Sepolia');
}

/// 0G Galileo 接続を assert する。0G Storage への put 直前のみ呼ぶ。
async function ensureGalileoChain(walletClient: WalletClient): Promise<void> {
  await ensureChain(walletClient, galileo.id, '0G Galileo');
}

/// viem WalletClient から 0G TS SDK が要求する最低限の signer (ZeroGSigner) を
/// 構築する。SDK 内部は ethers v6 の Signer を期待するため、EIP-1193 transport を
/// `ethers.BrowserProvider` でラップして getSigner を返す。動的 import にして
/// bun test 経路 (ethers が未ロード) では SDK 経路に到達しない。
async function buildZeroGSigner(
  walletClient: WalletClient
): Promise<ZeroGSigner> {
  const ethers = await import('ethers');
  // walletClient.transport は EIP-1193 互換の `request({method, params})` を持つ。
  // BrowserProvider はこれを直接受けて Signer を返せる。
  // ethers.Eip1193Provider は { request: ({method, params}) => Promise<unknown> }
  // でしかないので unknown 経由で渡す。
  const provider = new ethers.BrowserProvider(
    walletClient.transport as unknown as ConstructorParameters<
      typeof ethers.BrowserProvider
    >[0]
  );
  // address を渡すと unlock prompt をスキップして既存 account の signer を取れる。
  const account = walletClient.account;
  const signer = await provider.getSigner(account?.address);
  return signer as unknown as ZeroGSigner;
}

/// pilot{4 桁 hex} の handle が「自分以外のオーナーに先取りされていない」ことを
/// pre-flight で検査する。NameWrapper.setSubnodeRecord は parent owner 権限で
/// 既存 subnode を上書きしてしまうため、これを通さないと前回 tokenId griefing と
/// 同型の「他者の subname を上書き」事故が起きる。
async function ensureSubnameAvailable(
  handle: string,
  parent: string,
  expectedOwner: Address
): Promise<void> {
  const node = namehash(`${handle}.${parent}`);
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
  });
  const owner = (await publicClient.readContract({
    address: ENS_REGISTRY_SEPOLIA,
    abi: REGISTRY_OWNER_ABI,
    functionName: 'owner',
    args: [node],
  })) as Address;
  const isFree = owner === ZERO_ADDRESS;
  const isSameOwner = owner.toLowerCase() === expectedOwner.toLowerCase();
  if (!isFree && !isSameOwner) {
    throw new Error(
      `handle ${handle}.${parent} は別のオーナーが保有しています。再生成してください`
    );
  }
}

const MISALIGNMENT_KINDS: MisalignmentKind[] = [
  'sycophancy',
  'reward_hacking',
  'prompt_injection',
  'goal_misgen',
];

/// 純関数: encounter 配列を misalignment 種別ごとの件数オブジェクトに集計する。
/// 全 4 種を 0 で初期化するので、未検出種別も明示的に "0" として ENS に
/// 書き込める (= 検査済みであることが verifiable になる)。
export function countMisalignmentEncounters(
  encounters: MisalignmentEncounter[]
): Record<MisalignmentKind, number> {
  const counts = Object.fromEntries(
    MISALIGNMENT_KINDS.map((k) => [k, 0])
  ) as Record<MisalignmentKind, number>;
  for (const enc of encounters) {
    counts[enc.kind] += 1;
  }
  return counts;
}

/// 純関数: AgentSafetyAttestation + 0G CID から ENS text record の
/// key/value マップを組み立てる。CID 未確定時は "pending" フォールバック。
export function buildEnsTextRecords(
  att: AgentSafetyAttestation,
  storage: { cid: string } | undefined
): Record<string, string> {
  const detected = countMisalignmentEncounters(att.encounters);
  return {
    'agent.safety.score': String(att.score),
    'agent.safety.attestation': storage?.cid ?? 'pending',
    'agent.misalignment.detected': JSON.stringify(detected),
  };
}

export interface SafetyAttestationResult {
  attestation: AgentSafetyAttestation;
  storageProof: OnChainStep<StorageProof>;
  ensProof: OnChainStep<EnsProof>;
}

export interface RunSafetyAttestationInput {
  walletClient?: WalletClient;
  playLog: PlayLog;
  handle: string;
  ownerAddress?: Address;
  sessionId: string;
  parentName: string;
}

function errorMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  return typeof reason === 'string' ? reason : 'unknown error';
}

/// orchestrator: deriveSafetyAttestation で score を計算し、
/// 0G Storage put と ENS subname registration を Promise.allSettled で並列実行。
/// どの一方が失敗しても score 計算とローカル表示は完走する (フェイルセーフ)。
export async function runSafetyAttestation(
  input: RunSafetyAttestationInput
): Promise<SafetyAttestationResult> {
  const ensName = `${input.handle}.${input.parentName}`;
  const attestation = deriveSafetyAttestation({
    sessionId: input.sessionId,
    handle: input.handle,
    ensName,
    walletAddress: input.ownerAddress ?? '',
    playLog: input.playLog,
    parentName: input.parentName,
  });

  if (!input.walletClient || !input.ownerAddress) {
    // ウォレット未接続でも attestation 本体は返す。signer も無いため
    // sha256 stub にしか倒せない (それで 100% OK — 賞金提出には wallet 接続必須)。
    const storage = await putAttestation(attestation);
    return {
      attestation,
      storageProof: { status: 'success', data: { cid: storage.cid } },
      ensProof: { status: 'failed', error: 'wallet not connected' },
    };
  }

  const owner = input.ownerAddress;
  const walletClient = input.walletClient;

  // Phase 1: 0G Galileo に切替えて real put を試行する。chain switch / signer
  // 構築 / SDK 呼び出しいずれの失敗も sha256:// stub にフォールバックして
  // ENS 経路は止めない (フェイルセーフ要件)。
  let storageData: { cid: string } | undefined;
  let storageError: string | undefined;
  try {
    await ensureGalileoChain(walletClient);
    const signer = await buildZeroGSigner(walletClient);
    const result = await putAttestation(attestation, signer);
    storageData = { cid: result.cid };
    if (!result.realUpload && result.error) {
      storageError = result.error;
    }
  } catch (err) {
    // chain switch 失敗 / signer 構築失敗 — sha256 fallback で継続
    const fallback = await putAttestation(attestation);
    storageData = { cid: fallback.cid };
    storageError = errorMessage(err);
  }

  // Phase 2: Sepolia に戻す → ENS write。Sepolia switch 自体が失敗したら
  // ENS は failed 状態 (storage proof は維持)。
  let ensSettled:
    | { ok: true; value: { name: string; resolverUrl: string } }
    | { ok: false; reason: unknown };

  let preflightError: string | undefined;
  try {
    await ensureSepoliaChain(walletClient);
    await ensureSubnameAvailable(input.handle, input.parentName, owner);
  } catch (err) {
    preflightError = errorMessage(err);
  }

  if (preflightError) {
    ensSettled = { ok: false, reason: preflightError };
  } else {
    ensSettled = await registerSubname(walletClient, {
      handle: input.handle,
      owner,
      textRecords: buildEnsTextRecords(attestation, storageData),
    }).then(
      (value) => ({ ok: true as const, value }),
      (reason) => ({ ok: false as const, reason })
    );
  }

  const storageProof: OnChainStep<StorageProof> = storageData
    ? storageError
      ? { status: 'failed', error: storageError, data: storageData }
      : { status: 'success', data: storageData }
    : { status: 'failed', error: 'storage put returned no cid' };
  const ensProof: OnChainStep<EnsProof> = ensSettled.ok
    ? { status: 'success', data: ensSettled.value }
    : { status: 'failed', error: errorMessage(ensSettled.reason) };

  return { attestation, storageProof, ensProof };
}
