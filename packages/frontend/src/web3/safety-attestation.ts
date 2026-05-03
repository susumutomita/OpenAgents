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
import { ensureChain, errorMessage } from './utils';
import { buildZeroGSigner, putAttestation } from './zerog-storage';

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

/// Sepolia 接続を assert する。ENS write は Sepolia 以外で走るとアテステーション
/// が別 chain に書かれる事故になるため、書込み直前で必ず通す。
async function ensureSepoliaChain(walletClient: WalletClient): Promise<void> {
  await ensureChain(walletClient, sepolia);
}

/// 0G Galileo 接続を assert する。0G Storage への put 直前のみ呼ぶ。
async function ensureGalileoChain(walletClient: WalletClient): Promise<void> {
  await ensureChain(walletClient, galileo);
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
  // putAttestation は never throw 契約 (常に PutResult を返す) なので、外側
  // try/catch は ensureGalileoChain / buildZeroGSigner の失敗のみを拾う。
  let storageProof: OnChainStep<StorageProof>;
  try {
    await ensureGalileoChain(walletClient);
    const signer = await buildZeroGSigner(walletClient);
    const result = await putAttestation(attestation, signer);
    storageProof = result.realUpload
      ? { status: 'success', data: { cid: result.cid } }
      : {
          status: 'failed',
          error: result.error ?? 'real upload skipped',
          data: { cid: result.cid },
        };
  } catch (err) {
    const fallback = await putAttestation(attestation);
    storageProof = {
      status: 'failed',
      error: errorMessage(err),
      data: { cid: fallback.cid },
    };
  }

  // Phase 2: Sepolia に戻す → ENS write。Sepolia switch / preflight が失敗したら
  // ENS は failed (storage proof は維持)。
  let ensProof: OnChainStep<EnsProof>;
  try {
    await ensureSepoliaChain(walletClient);
    await ensureSubnameAvailable(input.handle, input.parentName, owner);
    const value = await registerSubname(walletClient, {
      handle: input.handle,
      owner,
      textRecords: buildEnsTextRecords(attestation, storageProof.data),
    });
    ensProof = { status: 'success', data: value };
  } catch (err) {
    ensProof = { status: 'failed', error: errorMessage(err) };
  }

  return { attestation, storageProof, ensProof };
}
