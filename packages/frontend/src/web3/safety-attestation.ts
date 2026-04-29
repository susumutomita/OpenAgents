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
import { sepolia } from './chains';
import { registerSubname } from './ens-register';
import type { EnsProof, OnChainStep, StorageProof } from './types';
import { putAttestation } from './zerog-storage';

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

/// Sepolia 接続を assert する。前回 Web3 Wiring の振り返りで「switchChain 漏れ」が
/// 発生しており、本機能の ENS 書込みも Sepolia 固定でないと別 chain に書く事故になる。
function ensureSepoliaChain(walletClient: WalletClient): void {
  const chainId = walletClient.chain?.id;
  if (chainId !== sepolia.id) {
    throw new Error(
      `chain mismatch — Sepolia (${sepolia.id}) に切り替えてください (現在 ${chainId ?? 'unknown'})`
    );
  }
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
    // ウォレット未接続でも attestation 本体は返す。
    let storageProof: OnChainStep<StorageProof>;
    try {
      const storage = await putAttestation(attestation);
      storageProof = { status: 'success', data: storage };
    } catch (err) {
      storageProof = { status: 'failed', error: errorMessage(err) };
    }
    return {
      attestation,
      storageProof,
      ensProof: { status: 'failed', error: 'wallet not connected' },
    };
  }

  const owner = input.ownerAddress;
  const walletClient = input.walletClient;

  // Pre-flight: chain assertion (sync) と subname 衝突チェック (async)。
  // どちらかが失敗しても storage put は走らせる (ローカル credential は得たい)。
  let preflightError: string | undefined;
  try {
    ensureSepoliaChain(walletClient);
    await ensureSubnameAvailable(input.handle, input.parentName, owner);
  } catch (err) {
    preflightError = errorMessage(err);
  }

  // 0G Storage の put は preflight と独立して走る (ENS 失敗でも CID は取りたい)。
  const storageSettled = await putAttestation(attestation).then(
    (value) => ({ ok: true as const, value }),
    (reason) => ({ ok: false as const, reason })
  );

  // ENS write は (a) preflight 通過、(b) storage 結果が揃ってから走る。
  // CID 値が定まる前に setText が呼ばれない直列を保証することで Front-running
  // 経路 (CID = undefined のまま text record が書かれる) を避ける。
  let ensSettled:
    | { ok: true; value: { name: string; resolverUrl: string } }
    | { ok: false; reason: unknown };
  if (preflightError) {
    ensSettled = { ok: false, reason: preflightError };
  } else {
    const storageData = storageSettled.ok ? storageSettled.value : undefined;
    ensSettled = await registerSubname(walletClient, {
      handle: input.handle,
      owner,
      textRecords: buildEnsTextRecords(attestation, storageData),
    }).then(
      (value) => ({ ok: true as const, value }),
      (reason) => ({ ok: false as const, reason })
    );
  }

  const storageProof: OnChainStep<StorageProof> = storageSettled.ok
    ? { status: 'success', data: storageSettled.value }
    : { status: 'failed', error: errorMessage(storageSettled.reason) };
  const ensProof: OnChainStep<EnsProof> = ensSettled.ok
    ? { status: 'success', data: ensSettled.value }
    : { status: 'failed', error: errorMessage(ensSettled.reason) };

  return { attestation, storageProof, ensProof };
}
