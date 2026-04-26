import type { DerivedWallet, PlayLog } from './types';

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const buffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  const bytes = Array.from(new Uint8Array(buffer));
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashPlayLog(playLog: PlayLog): Promise<string> {
  return `0x${await sha256Hex(JSON.stringify(playLog.events))}`;
}

export async function deriveWalletFromPlayLog(
  playLog: PlayLog
): Promise<DerivedWallet> {
  const seed = await hashPlayLog(playLog);
  const privateKey = `0x${await sha256Hex(`${seed}:${playLog.durationMs}:${playLog.finalScore}`)}`;
  const address = `0x${(await sha256Hex(`${privateKey}:address`)).slice(0, 40)}`;

  return {
    seed,
    privateKey,
    address,
  };
}
