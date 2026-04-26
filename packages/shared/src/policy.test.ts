import { describe, expect, it } from 'bun:test';
import { mapProfileToPolicy } from './policy';

describe('mapProfileToPolicy', () => {
  it('協調性が高い profile では swarm policy を返す', () => {
    const policy = mapProfileToPolicy({
      attack: 54,
      defense: 48,
      intelligence: 52,
      agility: 60,
      cooperation: 74,
      combatPower: 3880,
    });

    expect(policy.swarmEnabled).toBeTrue();
    expect(policy.maxConcurrentAgents).toBe(3);
    expect(policy.executionMode).toBe('swarm');
    expect(policy.toolsAllowed).toContain('peer-orchestrator');
  });

  it('防御寄り profile では drawdown を抑える', () => {
    const policy = mapProfileToPolicy({
      attack: 34,
      defense: 78,
      intelligence: 42,
      agility: 28,
      cooperation: 22,
      combatPower: 2410,
    });

    expect(policy.executionMode).toBe('defensive');
    expect(policy.maxDrawdownPct).toBeLessThanOrEqual(7.5);
    expect(policy.stopLossPct).toBeGreaterThanOrEqual(6);
  });
});
