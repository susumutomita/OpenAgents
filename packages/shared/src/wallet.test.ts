import { describe, expect, it } from 'bun:test';
import { createAgentBirthDraft } from './forge';
import type { PlayLog } from './types';
import { deriveWalletFromPlayLog } from './wallet';

const basePlayLog: PlayLog = {
  sessionId: 'session-seed',
  durationMs: 48000,
  finalScore: 3600,
  events: [
    { kind: 'capsule', t: 1000, capsule: 'laser' },
    { kind: 'barAdvance', t: 1001, position: 3 },
    { kind: 'commit', t: 1400, position: 3, capsule: 'laser' },
    { kind: 'moaiKill', t: 2200, moaiId: 'razor' },
  ],
};

describe('プレイログからウォレットを導出する', () => {
  it('同じプレイログなら同じ wallet を返す', async () => {
    const a = await deriveWalletFromPlayLog(basePlayLog);
    const b = await deriveWalletFromPlayLog(basePlayLog);
    expect(a).toEqual(b);
  });

  it('プレイヤー名から ENS 名と tokenId を組み立てる', async () => {
    const draft = await createAgentBirthDraft('Kotetsu Pilot', basePlayLog);

    expect(draft.agent.ensName).toStartWith('kotetsu-pilot-');
    expect(Number(draft.agent.tokenId)).toBeGreaterThan(0);
  });
});
