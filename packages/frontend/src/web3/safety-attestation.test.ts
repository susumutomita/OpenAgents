import { describe, expect, it } from 'bun:test';
import type {
  AgentSafetyAttestation,
  MisalignmentEncounter,
  MisalignmentKind,
} from '@gradiusweb3/shared/browser';
import {
  buildEnsTextRecords,
  countMisalignmentEncounters,
} from './safety-attestation';

describe('countMisalignmentEncounters - misalignment 種別ごとに件数を数える', () => {
  it('encounters 配列が空のときは全種類 0 になる', () => {
    const counts = countMisalignmentEncounters([]);
    expect(counts).toEqual({
      sycophancy: 0,
      reward_hacking: 0,
      prompt_injection: 0,
      goal_misgen: 0,
    });
  });

  it('種別ごとの出現回数を集計できる', () => {
    const encounters: MisalignmentEncounter[] = [
      { kind: 'prompt_injection', enemyId: 'a', tAtMs: 1, hit: true },
      { kind: 'prompt_injection', enemyId: 'b', tAtMs: 2, hit: false },
      { kind: 'sycophancy', enemyId: 'c', tAtMs: 3, hit: true },
      { kind: 'goal_misgen', enemyId: 'd', tAtMs: 4, hit: true },
    ];
    const counts = countMisalignmentEncounters(encounters);
    expect(counts.prompt_injection).toBe(2);
    expect(counts.sycophancy).toBe(1);
    expect(counts.goal_misgen).toBe(1);
    expect(counts.reward_hacking).toBe(0);
  });
});

describe('buildEnsTextRecords - ENS text record の組み立て', () => {
  it('score / attestation / misalignment.detected の 3 件を返す', () => {
    const att: AgentSafetyAttestation = {
      sessionId: 'sess',
      handle: 'pilot42',
      ensName: 'pilot42.gradiusweb3.eth',
      walletAddress: '0xabc',
      score: 85,
      breakdown: { clearTimeBonus: 50, missPenalty: -15, total: 85 },
      encounters: [
        { kind: 'prompt_injection', enemyId: 'a', tAtMs: 1, hit: true },
        { kind: 'sycophancy', enemyId: 'b', tAtMs: 2, hit: false },
      ],
      issuedAt: '2026-04-29T10:00:00.000Z',
      schemaVersion: 1,
    };
    const records = buildEnsTextRecords(att, {
      cid: 'sha256-deadbeef0000',
    });
    expect(records['agent.safety.score']).toBe('85');
    expect(records['agent.safety.attestation']).toContain(
      'sha256-deadbeef0000'
    );
    const detected = JSON.parse(
      records['agent.misalignment.detected'] ?? '{}'
    ) as Record<MisalignmentKind, number>;
    expect(detected.prompt_injection).toBe(1);
    expect(detected.sycophancy).toBe(1);
    expect(detected.goal_misgen).toBe(0);
    expect(detected.reward_hacking).toBe(0);
  });

  it('cid が undefined の場合 attestation 値は空文字でなく "未発行"系のフォールバックを使う', () => {
    const att: AgentSafetyAttestation = {
      sessionId: 'sess',
      handle: 'pilot42',
      ensName: 'pilot42.gradiusweb3.eth',
      walletAddress: '0xabc',
      score: 50,
      breakdown: { clearTimeBonus: 50, missPenalty: 0, total: 50 },
      encounters: [],
      issuedAt: '2026-04-29T10:00:00.000Z',
      schemaVersion: 1,
    };
    const records = buildEnsTextRecords(att, undefined);
    expect(records['agent.safety.attestation']).toBe('pending');
  });
});
