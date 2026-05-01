import type {
  AgentSafetyAttestation,
  PlayLog,
} from '@gradiusweb3/shared/browser';

/// 0G Storage への real upload + sha256 stub fallback。
///
/// 設計メモ:
/// - 0G TS SDK (`@0gfoundation/0g-ts-sdk`) は ethers v6 の `Signer` を要求する。
///   呼び出し側は viem WalletClient を持っているため、orchestrator 側で
///   `BrowserProvider(walletClient.transport).getSigner()` を用意して渡す。
///   本モジュールは ethers.Signer を引数で受ける純粋なラッパとし、
///   ethers / viem ブリッジ自体には踏み込まない (テスト容易性のため)。
/// - SDK は 0G testnet が一時的に reachable でない場合や user wallet に testnet
///   トークンが無い場合に reject する。これらすべてで sha256:// stub に
///   フォールバックして既存の ENS write 経路は止めない。
/// - 戻り値は `{ cid, realUpload, error? }` の拡張形。`realUpload` は
///   orchestrator / UI が「explorer link を出すか」「local hash 表示にとどめるか」
///   判定する用途。

const DEFAULT_INDEXER = 'https://indexer-storage-testnet-turbo.0g.ai';
const DEFAULT_RPC = 'https://evmrpc-testnet.0g.ai';

function readEnv(key: string, fallback: string): string {
  // import.meta.env は Vite 経由ではビルド時静的展開、bun test 経由では undefined。
  // 後者の場合は fallback を返す。
  try {
    const value = (import.meta as { env?: Record<string, string | undefined> })
      .env?.[key];
    if (typeof value === 'string' && value.length > 0) return value;
  } catch {
    // ignore — non-Vite ランタイム (bun test) では env 解決できなくて当然
  }
  return fallback;
}

function indexerUrl(): string {
  return readEnv('VITE_ZEROG_INDEXER', DEFAULT_INDEXER);
}

function rpcUrl(): string {
  return readEnv('VITE_ZEROG_RPC', DEFAULT_RPC);
}

async function sha256ShortHex(json: string): Promise<string> {
  const data = new TextEncoder().encode(json);
  const digestBuffer = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(digestBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return hex.slice(0, 32);
}

async function sha256Cid(payload: object): Promise<string> {
  const short = await sha256ShortHex(JSON.stringify(payload));
  return `sha256://${short}`;
}

/// 0G TS SDK の Signer 型を直接 import せず、最小限の duck-typed 形を
/// 受ける。テストでは getAddress を throw させて確実に fallback 経路に倒す。
export interface ZeroGSigner {
  getAddress(): Promise<string>;
}

export interface PutResult {
  cid: string;
  /// 0G Storage への real upload が成功した場合 true、sha256 stub fallback の場合 false。
  realUpload: boolean;
  /// fallback に落ちた場合の理由 (UI / log 用)。
  error?: string;
}

function errorMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  return typeof reason === 'string' ? reason : 'unknown error';
}

/// ZgBlob + Indexer.upload を実行して rootHash を返す。失敗時は throw する。
/// 呼び出し側で try/catch して fallback に倒す。
async function uploadJsonToZeroG(
  payload: object,
  signer: ZeroGSigner
): Promise<{ rootHash: string }> {
  // dynamic import によって SDK が import.meta.env を含む Vite ランタイムでのみ
  // ロードされ、bun test 環境 (browser API なし) ではそもそも到達しない構造にする。
  // SDK の types は @0gfoundation/0g-ts-sdk の Blob / Indexer をそのまま使う。
  const sdk = await import('@0gfoundation/0g-ts-sdk');
  const ZgBlob = sdk.Blob;
  const Indexer = sdk.Indexer;

  const json = JSON.stringify(payload);
  const fileLike = new File([json], 'payload.json', {
    type: 'application/json',
  });
  // ZgBlob の constructor は File を受ける。ESM では型が衝突しないように
  // 名前空間 (sdk.Blob) で参照する。
  const zgBlob = new ZgBlob(fileLike);
  const [tree, treeErr] = await zgBlob.merkleTree();
  if (treeErr || !tree) {
    throw new Error(`merkle tree failed: ${errorMessage(treeErr)}`);
  }
  const root = tree.rootHash();
  if (!root) throw new Error('merkle tree returned empty root');

  const indexer = new Indexer(indexerUrl());
  // SDK の Signer 型は ethers.Signer。本モジュールでは duck-typed ZeroGSigner で
  // 受け取り、SDK 側に as unknown as Signer で渡す。実 wallet を渡す責務は
  // orchestrator (safety-attestation.ts) 側にある。
  const [, uploadErr] = await indexer.upload(
    zgBlob,
    rpcUrl(),
    // biome-ignore lint/suspicious/noExplicitAny: SDK Signer を duck-typed 経由で渡す
    signer as any
  );
  if (uploadErr) throw new Error(`upload failed: ${errorMessage(uploadErr)}`);

  return { rootHash: root };
}

/// Put a play log JSON onto 0G Storage and return the CID.
/// signer 未指定なら sha256:// stub を返す (テスト / wallet 未接続経路)。
export async function putPlayLog(
  playLog: PlayLog,
  signer?: ZeroGSigner
): Promise<PutResult> {
  if (!signer) {
    const cid = await sha256Cid(playLog);
    return { cid, realUpload: false };
  }
  try {
    const { rootHash } = await uploadJsonToZeroG(playLog, signer);
    return { cid: `0g://${rootHash}`, realUpload: true };
  } catch (err) {
    const cid = await sha256Cid(playLog);
    return { cid, realUpload: false, error: errorMessage(err) };
  }
}

/// Put an AgentSafetyAttestation JSON onto 0G Storage and return the CID.
/// 成功時は `0g://{rootHash}`、失敗時は `sha256://{hex}` (フェイルセーフ)。
/// ENS text record の parser がスキームで検証経路を判定できる構造。
export async function putAttestation(
  attestation: AgentSafetyAttestation,
  signer?: ZeroGSigner
): Promise<PutResult> {
  if (!signer) {
    const cid = await sha256Cid(attestation);
    return { cid, realUpload: false };
  }
  try {
    const { rootHash } = await uploadJsonToZeroG(attestation, signer);
    return { cid: `0g://${rootHash}`, realUpload: true };
  } catch (err) {
    const cid = await sha256Cid(attestation);
    return { cid, realUpload: false, error: errorMessage(err) };
  }
}
