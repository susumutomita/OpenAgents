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

describe('deriveWalletFromPlayLog', () => {
  it('同じプレイログなら同じ wallet を返す', () => {
    expect(deriveWalletFromPlayLog(basePlayLog)).toEqual(
      deriveWalletFromPlayLog(basePlayLog)
    );
  });

  it('プレイヤー名から ENS 名と tokenId を組み立てる', () => {
    const draft = createAgentBirthDraft('Kotetsu Pilot', basePlayLog);

    expect(draft.agent.ensName).toStartWith('kotetsu-pilot-');
    expect(Number(draft.agent.tokenId)).toBeGreaterThan(0);
  });
});
