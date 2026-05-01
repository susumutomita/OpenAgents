/// 失敗 reason を画面・ログ表示用の文字列に正規化する。
/// Error / string / その他を 1 行で返す。private key やシークレットを含む
/// 値が来た場合に過剰に詳細を露出しないよう reason の origin は捨てる。
export function errorMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  return typeof reason === 'string' ? reason : 'unknown error';
}
