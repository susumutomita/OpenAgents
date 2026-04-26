import { createHash } from 'node:crypto';
import type { DerivedWallet, PlayLog } from './types';

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function hashPlayLog(playLog: PlayLog) {
  return `0x${sha256(JSON.stringify(playLog.events))}`;
}

export function deriveWalletFromPlayLog(playLog: PlayLog): DerivedWallet {
  const seed = hashPlayLog(playLog);
  const privateKey = `0x${sha256(`${seed}:${playLog.durationMs}:${playLog.finalScore}`)}`;
  const address = `0x${sha256(`${privateKey}:address`).slice(0, 40)}`;

  return {
    seed,
    privateKey,
    address,
  };
}
