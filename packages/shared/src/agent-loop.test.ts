import { describe, expect, it } from 'bun:test';
import {
  AGENT_LOOP_SCHEMA_VERSION,
  type AgentLoopBudget,
  type AgentLoopTrace,
  DEFAULT_AGENT_LOOP_BUDGET,
  buildAgentLoopInput,
  compareEthDecimalStrings,
  parseAgentLoopTrace,
  safeParseAgentLoopTrace,
  validateActionAgainstBudget,
} from './agent-loop';
import type { AgentBirthDraft } from './types';

const SAMPLE_DRAFT: AgentBirthDraft = {
  sessionId: 'sess-loop-1',
  playerName: 'Kotetsu',
  playLog: {
    sessionId: 'sess-loop-1',
    events: [],
    durationMs: 60_000,
    finalScore: 1234,
  },
  agent: {
    tokenId: '0',
    ensName: 'kotetsu-abc.gradiusweb3.eth',
    walletAddress: '0x000000000000000000000000000000000000dEaD',
    seed: 'sha256:deadbeef',
    birthHash: '0xabc',
    archetype: 'balanced',
    highlights: [],
    profile: {
      attack: 50,
      defense: 50,
      intelligence: 50,
      agility: 50,
      cooperation: 50,
      combatPower: 4321,
    },
    policy: {
      toolsAllowed: [],
      swarmEnabled: false,
      maxConcurrentAgents: 1,
      executionMode: 'balanced',
      maxPositionSizeUsd: 100,
      maxDrawdownPct: 5,
      slippageTolerancePct: 0.5,
      rebalanceIntervalSec: 60,
      stopLossPct: 5,
    },
    nodes: [],
  },
  feed: [],
};

const SAMPLE_TRACE: AgentLoopTrace = {
  schemaVersion: AGENT_LOOP_SCHEMA_VERSION,
  sessionId: 'sess-loop-1',
  thought: 'pilot は balanced archetype。slippage 上限を尊重する',
  plan: ['observe combat power', 'pick smallest swap', 'log result'],
  action: {
    kind: 'swap',
    from: 'WETH',
    to: 'USDC',
    amount: '0.0001',
    reason: 'budget 上限ピッタリで demo に最も映える',
  },
  observation: '0.0001 ETH 相当の USDC が wallet に着くはず',
  rationale: 'AGENT.md の testnet-only と budget envelope を遵守',
  generatedAt: '2026-05-03T06:00:00.000Z',
  generatedBy: 'claude-code',
};

describe('compareEthDecimalStrings - 浮動小数点誤差を避けて ETH 文字列を比較する', () => {
  it('"0.0001" は "0.0001" と等しい (= 0)', () => {
    expect(compareEthDecimalStrings('0.0001', '0.0001')).toBe(0);
  });
  it('"0.00009" は "0.0001" より小さい (< 0)', () => {
    expect(compareEthDecimalStrings('0.00009', '0.0001')).toBe(-1);
  });
  it('"0.001" は "0.0001" より大きい (> 0)', () => {
    expect(compareEthDecimalStrings('0.001', '0.0001')).toBe(1);
  });
  it('整数同士もちゃんと比較できる', () => {
    expect(compareEthDecimalStrings('1', '2')).toBe(-1);
    expect(compareEthDecimalStrings('5', '5')).toBe(0);
  });
  it('decimal でない入力は throw する (UI 側で reject させたいケース)', () => {
    expect(() => compareEthDecimalStrings('not-a-number', '0.1')).toThrow(
      'invalid decimal'
    );
  });
});

describe('validateActionAgainstBudget - 署名ボタンの最後の砦', () => {
  const budget: AgentLoopBudget = DEFAULT_AGENT_LOOP_BUDGET;

  it('budget 上限ピッタリの swap は ok', () => {
    const verdict = validateActionAgainstBudget(
      {
        kind: 'swap',
        from: 'WETH',
        to: 'USDC',
        amount: '0.0001',
        reason: 'limit',
      },
      budget
    );
    expect(verdict.ok).toBe(true);
  });

  it('budget を超える swap は ok=false で reason を返す (人間が読める)', () => {
    const verdict = validateActionAgainstBudget(
      {
        kind: 'swap',
        from: 'WETH',
        to: 'USDC',
        amount: '1.0',
        reason: 'too big',
      },
      budget
    );
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.reason).toContain('0.0001');
      expect(verdict.reason).toContain('1.0');
    }
  });

  it('hold は amount を持たないので常に ok (allowedActions に含まれていれば)', () => {
    const verdict = validateActionAgainstBudget(
      { kind: 'hold', reason: 'wait for better entry' },
      budget
    );
    expect(verdict.ok).toBe(true);
  });

  it('allowedActions に含まれない kind は reject', () => {
    const verdict = validateActionAgainstBudget(
      {
        kind: 'rebalance',
        targets: [{ asset: 'USDC', weight: 1 }],
        reason: 'demo only allows swap/hold',
      },
      budget
    );
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.reason).toContain('rebalance');
    }
  });

  it('amount が decimal でない (e.g. 注入を狙った文字列) は reject', () => {
    const verdict = validateActionAgainstBudget(
      {
        kind: 'swap',
        from: 'WETH',
        to: 'USDC',
        amount: '0.0001; rm -rf /',
        reason: 'injection',
      },
      budget
    );
    expect(verdict.ok).toBe(false);
  });
});

describe('parseAgentLoopTrace - Claude Code が貼った JSON を validate する', () => {
  it('正しい trace はそのまま型付きで返る', () => {
    const trace = parseAgentLoopTrace(SAMPLE_TRACE);
    expect(trace.sessionId).toBe('sess-loop-1');
    expect(trace.action.kind).toBe('swap');
  });

  it('schemaVersion が違うと拒否する (将来の breaking change を検出)', () => {
    expect(() =>
      parseAgentLoopTrace({ ...SAMPLE_TRACE, schemaVersion: 999 })
    ).toThrow('schemaVersion');
  });

  it('plan が空 array だと拒否する (考えていない agent を弾く)', () => {
    expect(() => parseAgentLoopTrace({ ...SAMPLE_TRACE, plan: [] })).toThrow(
      'plan'
    );
  });

  it('未知の action.kind は拒否する', () => {
    expect(() =>
      parseAgentLoopTrace({
        ...SAMPLE_TRACE,
        action: { kind: 'liquidate-all', reason: 'sus' },
      })
    ).toThrow('unknown kind');
  });

  it('generatedBy が claude-code / simulator 以外は拒否する', () => {
    expect(() =>
      parseAgentLoopTrace({ ...SAMPLE_TRACE, generatedBy: 'rogue-script' })
    ).toThrow('generatedBy');
  });
});

describe('safeParseAgentLoopTrace - UI が壊れた paste を赤バナーで返す', () => {
  it('壊れた JSON 相当の値でも throw せず ok:false で返す', () => {
    const result = safeParseAgentLoopTrace({ schemaVersion: 1, garbage: true });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  it('正しい trace では ok:true でラップされる', () => {
    const result = safeParseAgentLoopTrace(SAMPLE_TRACE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.trace.sessionId).toBe('sess-loop-1');
    }
  });
});

describe('buildAgentLoopInput - draft から Claude Code に渡す input を組み立てる', () => {
  it('draft の playLog / archetype / birthHash を素通しで含める', () => {
    const input = buildAgentLoopInput({
      draft: SAMPLE_DRAFT,
      emittedAt: '2026-05-03T06:00:00.000Z',
    });
    expect(input.sessionId).toBe('sess-loop-1');
    expect(input.archetype).toBe('balanced');
    expect(input.birthHash).toBe('0xabc');
    expect(input.combatPower).toBe(4321);
    expect(input.playLog.finalScore).toBe(1234);
  });

  it('budget を渡さない場合は DEFAULT_AGENT_LOOP_BUDGET が必ず付与される', () => {
    const input = buildAgentLoopInput({ draft: SAMPLE_DRAFT });
    expect(input.budget).toEqual(DEFAULT_AGENT_LOOP_BUDGET);
    expect(input.budget.maxSwapEth).toBe('0.0001');
    expect(input.budget.allowedChainIds).toContain(11155111);
    expect(input.budget.allowedChainIds).toContain(16602);
  });

  it('walletAddress が引数で上書きされる (ConnectButton の address を優先)', () => {
    const input = buildAgentLoopInput({
      draft: SAMPLE_DRAFT,
      walletAddress: '0x1111111111111111111111111111111111111111',
    });
    expect(input.walletAddress).toBe(
      '0x1111111111111111111111111111111111111111'
    );
  });
});
