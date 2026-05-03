import type { Chain, WalletClient } from 'viem';

/// 失敗 reason を画面・ログ表示用の文字列に正規化する。
/// Error / string / その他を 1 行で返す。private key やシークレットを含む
/// 値が来た場合に過剰に詳細を露出しないよう reason の origin は捨てる。
export function errorMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  return typeof reason === 'string' ? reason : 'unknown error';
}

/// writeContract 直前に wallet を target chain に揃える。
/// viem の writeContract({ chain }) は chain mismatch を assert で投げるだけで
/// auto switch しない (`viem/utils/chain/assertCurrentChain`)。なので各 tx の
/// 直前に明示的に switchChain を呼んで、必要なら wallet_switchEthereumChain
/// プロンプトをユーザーに見せる。chain がもう一致していれば no-op。
export async function ensureChain(
  walletClient: WalletClient,
  target: Chain
): Promise<void> {
  const currentId = await walletClient.getChainId();
  if (currentId === target.id) return;
  await walletClient.switchChain({ id: target.id });
}
