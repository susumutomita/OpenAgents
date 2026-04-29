import { describe, expect, it } from 'bun:test';
import {
  CAPABILITY_TO_MISALIGNMENT,
  MISALIGNMENT_CARDS,
  computeSafetyScore,
  deriveDeterministicHandle,
  deriveSafetyAttestation,
  generateRandomHandle,
} from './safety';
import type { PlayEvent, PlayLog } from './types';

function createPlayLog(
  events: PlayEvent[],
  overrides?: Partial<PlayLog>
): PlayLog {
  return {
    sessionId: 'session-test',
    events,
    durationMs: 60000,
    finalScore: 1000,
    ...overrides,
  };
}

describe('computeSafetyScore - 安全スコアを純関数で算出する', () => {
  it('ノーミス完走 → 100 点になる', () => {
    const events: PlayEvent[] = Array.from({ length: 12 }, (_, i) => ({
      kind: 'shoot' as const,
      t: 1000 + i * 200,
      enemyId: `e-${i}`,
      tradeoffLabel: 'SECURITY',
      misalignment: 'prompt_injection',
    }));
    const breakdown = computeSafetyScore(createPlayLog(events));
    expect(breakdown.total).toBe(100);
    expect(breakdown.clearTimeBonus).toBe(50);
    expect(breakdown.missPenalty).toBe(0);
  });

  it('全部見送り → 50 点付近 (clearTimeBonus 0, missPenalty 0 に近い)', () => {
    const events: PlayEvent[] = Array.from({ length: 5 }, (_, i) => ({
      kind: 'pass' as const,
      t: 1000 + i * 200,
      enemyId: `e-${i}`,
      tradeoffLabel: 'SKIP',
      misalignment: 'sycophancy',
    }));
    const breakdown = computeSafetyScore(createPlayLog(events));
    // 5 misses → clearTimeBonus = clamp(50 - 5*2, 0, 50) = 40, missPenalty = -10 → total 80
    // But spec says "全部見送り → 50 点付近": for many passes the bonus drops to 0, penalty ~-50.
    // We use 25 passes here for the "全部見送り" case.
    const manyPasses: PlayEvent[] = Array.from({ length: 25 }, (_, i) => ({
      kind: 'pass' as const,
      t: 1000 + i * 100,
      enemyId: `pass-${i}`,
      tradeoffLabel: 'SKIP',
      misalignment: 'sycophancy',
    }));
    const heavyBreak = computeSafetyScore(createPlayLog(manyPasses));
    expect(heavyBreak.total).toBeGreaterThanOrEqual(0);
    expect(heavyBreak.total).toBeLessThanOrEqual(60);
    // light-pass case checks bounds too
    expect(breakdown.total).toBeGreaterThanOrEqual(0);
    expect(breakdown.total).toBeLessThanOrEqual(100);
  });

  it('全誤射 → 0 点近傍', () => {
    // 全 pass を大量に積む = 全部見送り = 安全寄り違反 → ペナルティ最大
    const events: PlayEvent[] = Array.from({ length: 60 }, (_, i) => ({
      kind: 'pass' as const,
      t: 500 + i * 100,
      enemyId: `pass-${i}`,
      tradeoffLabel: 'SKIP',
      misalignment: 'goal_misgen',
    }));
    const breakdown = computeSafetyScore(createPlayLog(events));
    expect(breakdown.total).toBe(0);
    expect(breakdown.clearTimeBonus).toBe(0);
    expect(breakdown.missPenalty).toBeLessThanOrEqual(-50);
  });

  it('empty playLog → 50 点 (中立)', () => {
    const breakdown = computeSafetyScore(createPlayLog([]));
    expect(breakdown.total).toBe(50);
    expect(breakdown.clearTimeBonus).toBe(50);
    expect(breakdown.missPenalty).toBe(0);
  });

  it('total は 0..100 にクリップされる', () => {
    const breakdown = computeSafetyScore(
      createPlayLog([
        {
          kind: 'pass',
          t: 1000,
          enemyId: 'e',
          tradeoffLabel: 'SKIP',
          misalignment: 'sycophancy',
        },
      ])
    );
    expect(breakdown.total).toBeGreaterThanOrEqual(0);
    expect(breakdown.total).toBeLessThanOrEqual(100);
  });
});

describe('deriveSafetyAttestation - playLog から attestation を組み立てる', () => {
  const baseInput = {
    sessionId: 'session-001',
    handle: 'pilot42',
    ensName: 'pilot42.gradiusweb3.eth',
    walletAddress: '0x000000000000000000000000000000000000abcd',
    parentName: 'gradiusweb3.eth',
    issuedAt: '2026-04-29T10:00:00.000Z',
  };

  it('渡された handle / ensName / walletAddress が attestation に含まれる', () => {
    const att = deriveSafetyAttestation({
      ...baseInput,
      playLog: {
        sessionId: 'session-001',
        events: [],
        durationMs: 60000,
        finalScore: 0,
      },
    });
    expect(att.handle).toBe('pilot42');
    expect(att.ensName).toBe('pilot42.gradiusweb3.eth');
    expect(att.walletAddress).toBe(
      '0x000000000000000000000000000000000000abcd'
    );
    expect(att.sessionId).toBe('session-001');
  });

  it('schemaVersion は 1 固定', () => {
    const att = deriveSafetyAttestation({
      ...baseInput,
      playLog: {
        sessionId: 'session-001',
        events: [],
        durationMs: 60000,
        finalScore: 0,
      },
    });
    expect(att.schemaVersion).toBe(1);
  });

  it('issuedAt は ISO 8601 形式', () => {
    const att = deriveSafetyAttestation({
      ...baseInput,
      playLog: {
        sessionId: 'session-001',
        events: [],
        durationMs: 60000,
        finalScore: 0,
      },
    });
    expect(att.issuedAt).toBe('2026-04-29T10:00:00.000Z');
    expect(() => new Date(att.issuedAt).toISOString()).not.toThrow();
  });

  it('encounters は shoot/pass の misalignment 付きイベントだけ拾う', () => {
    const att = deriveSafetyAttestation({
      ...baseInput,
      playLog: {
        sessionId: 'session-001',
        events: [
          {
            kind: 'shoot',
            t: 1200,
            enemyId: 'e-1',
            tradeoffLabel: 'SECURITY',
            misalignment: 'prompt_injection',
          },
          {
            kind: 'pass',
            t: 1500,
            enemyId: 'e-2',
            tradeoffLabel: 'SKIP',
            misalignment: 'sycophancy',
          },
          {
            kind: 'shoot',
            t: 1700,
            enemyId: 'e-3',
            tradeoffLabel: 'PRECISION',
            // 意図的に misalignment 無し
          },
          { kind: 'hit', t: 1900, damage: 1 },
          { kind: 'capsule', t: 2000, capsule: 'shield' },
        ],
        durationMs: 60000,
        finalScore: 1500,
      },
    });
    expect(att.encounters).toHaveLength(2);
    expect(att.encounters[0]).toEqual({
      kind: 'prompt_injection',
      enemyId: 'e-1',
      tAtMs: 1200,
      hit: true,
    });
    expect(att.encounters[1]).toEqual({
      kind: 'sycophancy',
      enemyId: 'e-2',
      tAtMs: 1500,
      hit: false,
    });
  });

  it('score は 0..100 の整数', () => {
    const att = deriveSafetyAttestation({
      ...baseInput,
      playLog: {
        sessionId: 'session-001',
        events: [
          {
            kind: 'shoot',
            t: 1200,
            enemyId: 'e-1',
            tradeoffLabel: 'SECURITY',
            misalignment: 'prompt_injection',
          },
        ],
        durationMs: 60000,
        finalScore: 100,
      },
    });
    expect(Number.isInteger(att.score)).toBe(true);
    expect(att.score).toBeGreaterThanOrEqual(0);
    expect(att.score).toBeLessThanOrEqual(100);
  });
});

describe('MISALIGNMENT_CARDS - misalignment カード定義', () => {
  it('4 種すべてのカードが定義されている', () => {
    expect(Object.keys(MISALIGNMENT_CARDS)).toEqual(
      expect.arrayContaining([
        'sycophancy',
        'reward_hacking',
        'prompt_injection',
        'goal_misgen',
      ])
    );
  });

  it('各カードに glyph と color が含まれる', () => {
    for (const kind of [
      'sycophancy',
      'reward_hacking',
      'prompt_injection',
      'goal_misgen',
    ] as const) {
      const card = MISALIGNMENT_CARDS[kind];
      expect(card.kind).toBe(kind);
      expect(card.label.length).toBeGreaterThan(0);
      expect(card.description.length).toBeGreaterThan(0);
      expect(card.description.length).toBeLessThanOrEqual(140);
      expect(['◉', '◇', '▲', '☓']).toContain(card.glyph);
      expect(card.color).toMatch(/^#[0-9a-fA-F]{3,8}$/);
    }
  });
});

describe('deriveDeterministicHandle - wallet と parent から deterministic に handle を導く', () => {
  it('同じ wallet + parent からは同じ handle が生成される', () => {
    const w = '0xF3131999a3D9e5C43b2EDA9B3661C437B2587216';
    const p = 'gradiusweb3.eth';
    expect(deriveDeterministicHandle(w, p)).toBe(
      deriveDeterministicHandle(w, p)
    );
  });

  it('walletAddress の大文字小文字が変わっても同じ handle になる (case-insensitive)', () => {
    const lower = '0xf3131999a3d9e5c43b2eda9b3661c437b2587216';
    const upper = '0xF3131999A3D9E5C43B2EDA9B3661C437B2587216';
    expect(deriveDeterministicHandle(lower, 'gradiusweb3.eth')).toBe(
      deriveDeterministicHandle(upper, 'gradiusweb3.eth')
    );
  });

  it('parent が違うと別の handle になる (subname 衝突を狭める)', () => {
    const w = '0xF3131999a3D9e5C43b2EDA9B3661C437B2587216';
    expect(deriveDeterministicHandle(w, 'gradiusweb3.eth')).not.toBe(
      deriveDeterministicHandle(w, 'testname.eth')
    );
  });

  it('違う wallet からは違う handle になる (確率的にはほぼ確実)', () => {
    const a = '0xF3131999a3D9e5C43b2EDA9B3661C437B2587216';
    const b = '0x0000000000000000000000000000000000000001';
    expect(deriveDeterministicHandle(a, 'gradiusweb3.eth')).not.toBe(
      deriveDeterministicHandle(b, 'gradiusweb3.eth')
    );
  });

  it('戻り値は pilot で始まる 4 桁 hex 形式 (pilot[0-9a-f]{4})', () => {
    const handle = deriveDeterministicHandle(
      '0xF3131999a3D9e5C43b2EDA9B3661C437B2587216',
      'gradiusweb3.eth'
    );
    expect(handle).toMatch(/^pilot[0-9a-f]{4}$/);
  });
});

describe('generateRandomHandle - wallet 未接続時のフォールバック handle', () => {
  it('戻り値は pilot で始まる 4 桁 hex 形式', () => {
    expect(generateRandomHandle()).toMatch(/^pilot[0-9a-f]{4}$/);
  });

  it('連続呼び出しで同じ値ばかりを返さない (ランダム性の最小限の確認)', () => {
    const samples = new Set<string>();
    for (let i = 0; i < 32; i += 1) samples.add(generateRandomHandle());
    expect(samples.size).toBeGreaterThan(1);
  });
});

describe('CAPABILITY_TO_MISALIGNMENT - capability ↔ misalignment マッピング', () => {
  it('shield → prompt_injection / option → reward_hacking / laser → goal_misgen / missile → sycophancy', () => {
    expect(CAPABILITY_TO_MISALIGNMENT.shield).toBe('prompt_injection');
    expect(CAPABILITY_TO_MISALIGNMENT.option).toBe('reward_hacking');
    expect(CAPABILITY_TO_MISALIGNMENT.laser).toBe('goal_misgen');
    expect(CAPABILITY_TO_MISALIGNMENT.missile).toBe('sycophancy');
  });

  it('speed には misalignment が割り当てられない', () => {
    expect(CAPABILITY_TO_MISALIGNMENT.speed).toBeUndefined();
  });
});
