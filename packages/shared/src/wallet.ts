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
  // Display-only address. We hash the seed twice with disjoint domain tags so
  // the derivation can never accidentally produce a usable secp256k1 key, and
  // we never expose a private key field to consumers.
  const address = `0x${(await sha256Hex(`${seed}:display-address:v1`)).slice(0, 40)}`;

  return {
    seed,
    address,
  };
}

export function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
