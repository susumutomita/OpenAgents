import type {
  AgentSafetyAttestation,
  PlayLog,
} from '@gradiusweb3/shared/browser';
import type { WalletClient } from 'viem';
import { errorMessage } from './utils';

/// 0G Storage への real upload + sha256 stub fallback。
///
/// 設計メモ:
/// - 0G TS SDK (`@0gfoundation/0g-ts-sdk`) は ethers v6 の `Signer` を要求する。
///   呼び出し側は viem WalletClient を持っているため、`buildZeroGSigner` で
///   `BrowserProvider(walletClient.transport).getSigner()` を用意して渡す。
/// - SDK は 0G testnet が一時的に reachable でない場合や user wallet に testnet
///   トークンが無い場合に reject する。これらすべてで sha256:// stub に
///   フォールバックして既存の ENS write 経路は止めない。
/// - 戻り値は `{ cid, realUpload, error? }` の拡張形。`realUpload` は
///   orchestrator / UI が「explorer link を出すか」「local hash 表示にとどめるか」
///   判定する用途。

/// `agent.safety.attestation` ENS text record や iNFT metadata に書く CID の
/// スキーム。ENS 解決側で「real 0G upload か stub か」を 1 文字判定可能にする。
export const ZEROG_SCHEME = '0g://' as const;
export const SHA256_SCHEME = 'sha256://' as const;

/// 0G Galileo testnet の storage explorer。`?{rootHash}` を付けると検索結果に飛ぶ。
const ZEROG_EXPLORER_BASE = 'https://storagescan-galileo.0g.ai/';

const DEFAULT_INDEXER = 'https://indexer-storage-testnet-turbo.0g.ai';
const DEFAULT_RPC = 'https://evmrpc-testnet.0g.ai';

function readEnv(key: string, fallback: string): string {
  // import.meta.env は Vite 経由ではビルド時静的展開、bun test 経由では undefined。
  try {
    const value = (import.meta as { env?: Record<string, string | undefined> })
      .env?.[key];
    if (typeof value === 'string' && value.length > 0) return value;
  } catch {
    // non-Vite ランタイム (bun test) では env 解決できなくて当然
  }
  return fallback;
}

function indexerUrl(): string {
  return readEnv('VITE_ZEROG_INDEXER', DEFAULT_INDEXER);
}

function rpcUrl(): string {
  return readEnv('VITE_ZEROG_RPC', DEFAULT_RPC);
}

/// CID が real 0G upload (`0g://`) か sha256 fallback (`sha256://`) かを判定。
export function isRealZeroGCid(cid: string): boolean {
  return cid.startsWith(ZEROG_SCHEME);
}

/// `0g://0xabcd...` から rootHash 部分を取り出す。real CID でなければ undefined。
export function parseZeroGRoot(cid: string): string | undefined {
  if (!isRealZeroGCid(cid)) return undefined;
  return cid.slice(ZEROG_SCHEME.length);
}

/// real 0G CID なら storage explorer の rootHash 個別ページ URL を返す。
/// stub なら undefined (UI 側で local hash 表示にとどめる判定に使う)。
export function zerogExplorerUrl(cid: string): string | undefined {
  const root = parseZeroGRoot(cid);
  return root ? `${ZEROG_EXPLORER_BASE}tx/${root}` : undefined;
}

async function sha256ShortHex(json: string): Promise<string> {
  const data = new TextEncoder().encode(json);
  const digestBuffer = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(digestBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return hex.slice(0, 32);
}

/// 0G TS SDK の Signer 型を直接 import せず、最小限の duck-typed 形を
/// 受ける。テストでは getAddress を throw させて確実に fallback 経路に倒す。
export interface ZeroGSigner {
  getAddress(): Promise<string>;
}

/// viem WalletClient から 0G TS SDK が要求する最低限の signer (ZeroGSigner) を
/// 構築する。SDK 内部は ethers v6 の Signer を期待するため、EIP-1193 transport を
/// `ethers.BrowserProvider` でラップして getSigner を返す。動的 import にして
/// bun test 経路 (ethers が未ロード) では SDK 経路に到達しない。
export async function buildZeroGSigner(
  walletClient: WalletClient
): Promise<ZeroGSigner> {
  const ethers = await import('ethers');
  // walletClient.transport は EIP-1193 互換の `request({method, params})` を持つ。
  // ethers.Eip1193Provider の type は { request: (...) => Promise<unknown> } だが
  // viem の transport は別 type なので unknown 経由で渡す。
  const provider = new ethers.BrowserProvider(
    walletClient.transport as unknown as ConstructorParameters<
      typeof ethers.BrowserProvider
    >[0]
  );
  const signer = await provider.getSigner(walletClient.account?.address);
  return signer as unknown as ZeroGSigner;
}

export interface PutResult {
  cid: string;
  /// 0G Storage への real upload が成功した場合 true、sha256 stub fallback の場合 false。
  realUpload: boolean;
  /// fallback に落ちた場合の理由 (UI / log 用)。
  error?: string;
}

/// ZgBlob + Indexer.upload を実行して rootHash を返す。失敗時は throw する。
/// 呼び出し側で try/catch して fallback に倒す。
async function uploadJsonToZeroG(
  json: string,
  signer: ZeroGSigner
): Promise<{ rootHash: string }> {
  // SDK は import.meta.env を含む Vite ランタイムでのみ動的にロードする。
  // bun test 環境 (browser API なし) ではそもそも到達しない構造にする。
  const sdk = await import('@0gfoundation/0g-ts-sdk');
  const ZgBlob = sdk.Blob;
  const Indexer = sdk.Indexer;

  const fileLike = new File([json], 'payload.json', {
    type: 'application/json',
  });
  const zgBlob = new ZgBlob(fileLike);
  const [tree, treeErr] = await zgBlob.merkleTree();
  if (treeErr || !tree) {
    throw new Error(`merkle tree failed: ${errorMessage(treeErr)}`);
  }
  const root = tree.rootHash();
  if (!root) throw new Error('merkle tree returned empty root');

  const indexer = new Indexer(indexerUrl());
  const [, uploadErr] = await indexer.upload(
    zgBlob,
    rpcUrl(),
    // biome-ignore lint/suspicious/noExplicitAny: SDK Signer を duck-typed 経由で渡す
    signer as any
  );
  if (uploadErr) throw new Error(`upload failed: ${errorMessage(uploadErr)}`);

  return { rootHash: root };
}

/// payload を JSON.stringify した上で real upload を試行、失敗時に sha256 stub に倒す。
/// stringify は 1 度だけ実行し、real / fallback 双方で同じ文字列を再利用する。
async function putJsonPayload(
  payload: object,
  signer: ZeroGSigner | undefined
): Promise<PutResult> {
  const json = JSON.stringify(payload);
  if (!signer) {
    const short = await sha256ShortHex(json);
    return { cid: `${SHA256_SCHEME}${short}`, realUpload: false };
  }
  try {
    const { rootHash } = await uploadJsonToZeroG(json, signer);
    return { cid: `${ZEROG_SCHEME}${rootHash}`, realUpload: true };
  } catch (err) {
    const short = await sha256ShortHex(json);
    return {
      cid: `${SHA256_SCHEME}${short}`,
      realUpload: false,
      error: errorMessage(err),
    };
  }
}

/// playLog JSON を 0G Storage に put して CID を返す。signer 未指定なら
/// sha256:// stub フォールバック (テスト / wallet 未接続経路)。
export async function putPlayLog(
  playLog: PlayLog,
  signer?: ZeroGSigner
): Promise<PutResult> {
  return putJsonPayload(playLog, signer);
}

/// AgentSafetyAttestation JSON を 0G Storage に put して CID を返す。
/// 成功時は `0g://{rootHash}`、失敗時は `sha256://{hex}` (フェイルセーフ)。
/// ENS text record の parser がスキームで検証経路を判定できる構造。
export async function putAttestation(
  attestation: AgentSafetyAttestation,
  signer?: ZeroGSigner
): Promise<PutResult> {
  return putJsonPayload(attestation, signer);
}
