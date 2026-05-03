import type { Chain, WalletClient } from 'viem';
import { galileo, sepolia } from './chains';

/// 失敗 reason を画面・ログ表示用の文字列に正規化する。
/// Error / string / その他を 1 行で返す。private key やシークレットを含む
/// 値が来た場合に過剰に詳細を露出しないよう reason の origin は捨てる。
export function errorMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  return typeof reason === 'string' ? reason : 'unknown error';
}

const SUPPORTED_TESTNET_CHAIN_IDS = new Map<number, string>([
  [sepolia.id, 'Sepolia'],
  [galileo.id, '0G Galileo'],
]);

export function isSupportedTestnetChainId(chainId: number): boolean {
  return SUPPORTED_TESTNET_CHAIN_IDS.has(chainId);
}

export function describeSupportedTestnets(): string {
  return Array.from(SUPPORTED_TESTNET_CHAIN_IDS.values()).join(' / ');
}

export function formatTestnetOnlyError(
  chainId: number,
  context: string
): string {
  const label = SUPPORTED_TESTNET_CHAIN_IDS.get(chainId) ?? `chain ${chainId}`;
  return `testnet only: ${context} must be on ${describeSupportedTestnets()} (current ${label})`;
}

export function assertSupportedTestnetChainId(
  chainId: number,
  context: string
): void {
  if (!isSupportedTestnetChainId(chainId)) {
    throw new Error(formatTestnetOnlyError(chainId, context));
  }
}

/// writeContract 直前に wallet を target chain に揃える。
/// viem の writeContract({ chain }) は chain mismatch を assert で投げるだけで
/// auto switch しない (`viem/utils/chain/assertCurrentChain`)。なので各 tx の
/// 直前に明示的に switchChain を呼んで、必要なら wallet_switchEthereumChain
/// プロンプトをユーザーに見せる。chain がもう一致していれば no-op。
///
/// 流れ:
/// 1. target が testnet allowlist 外なら即 throw (mainnet writeContract を構造で防ぐ)。
/// 2. current === target なら no-op (already on target)。
/// 3. それ以外は switchChain を試みる。これが mainnet 始発の人を救う唯一の経路
///    なので、current が unsupported でも事前 reject せず switch を呼ぶ。
/// 4. switch が throw すれば user reject 等として friendly に伝播。
/// 5. switch 後の chain が target でなければ throw (defense-in-depth: ここで初めて
///    current が allowlist 外であることを検出する)。
///
/// User-facing strings は English (UI 全体が English ベースなので統一)。
export async function ensureChain(
  walletClient: WalletClient,
  target: Chain
): Promise<void> {
  assertSupportedTestnetChainId(target.id, `target chain ${target.name}`);
  const currentId = await walletClient.getChainId();
  if (currentId === target.id) return;
  try {
    await walletClient.switchChain({ id: target.id });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'unknown';
    throw new Error(
      `chain mismatch: switch to ${target.name} (${target.id}) was rejected (current chain ${currentId}): ${detail}`
    );
  }
  const switchedId = await walletClient.getChainId();
  if (switchedId !== target.id) {
    throw new Error(
      `chain mismatch: after switch, current chainId (${switchedId}) does not equal target ${target.name} (${target.id})`
    );
  }
  assertSupportedTestnetChainId(
    switchedId,
    `connected wallet after switch to ${target.name}`
  );
}
