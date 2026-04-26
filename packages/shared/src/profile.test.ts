import { describe, expect, it } from 'bun:test';
import { mapPlayLogToProfile } from './profile';
import type { PlayLog } from './types';

function createPlayLog(events: PlayLog['events']): PlayLog {
  return {
    sessionId: 'session-alpha',
    events,
    durationMs: 54000,
    finalScore: 4200,
  };
}

describe('mapPlayLogToProfile', () => {
  it('同じプレイログなら同じ profile を返す', () => {
    const playLog = createPlayLog([
      { kind: 'capsule', t: 1200, capsule: 'option' },
      { kind: 'barAdvance', t: 1201, position: 1 },
      { kind: 'commit', t: 1500, position: 4, capsule: 'option' },
      { kind: 'moaiKill', t: 1900, moaiId: 'hive' },
      {
        kind: 'shoot',
        t: 2200,
        enemyId: 'enemy-1',
        tradeoffLabel: 'Solo / Cooperative',
      },
      {
        kind: 'shoot',
        t: 2600,
        enemyId: 'enemy-2',
        tradeoffLabel: 'Slow & Safe / Fast & Risky',
      },
    ]);

    expect(mapPlayLogToProfile(playLog)).toEqual(mapPlayLogToProfile(playLog));
  });

  it('OPTION commit が多いと cooperation が高くなる', () => {
    const cooperativePlayLog = createPlayLog([
      { kind: 'capsule', t: 800, capsule: 'option' },
      { kind: 'commit', t: 1000, position: 4, capsule: 'option' },
      { kind: 'capsule', t: 1200, capsule: 'option' },
      { kind: 'commit', t: 1400, position: 4, capsule: 'option' },
      { kind: 'moaiKill', t: 1900, moaiId: 'hive' },
      {
        kind: 'pass',
        t: 2300,
        enemyId: 'enemy-3',
        tradeoffLabel: 'Solo / Cooperative',
      },
    ]);

    const profile = mapPlayLogToProfile(cooperativePlayLog);

    expect(profile.cooperation).toBeGreaterThanOrEqual(50);
    expect(profile.combatPower).toBeGreaterThan(0);
  });
});
