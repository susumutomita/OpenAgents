import type { AgentPolicy, AgentProfile, ExecutionMode } from './types';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, fractionDigits: number) {
  const multiplier = 10 ** fractionDigits;
  return Math.round(value * multiplier) / multiplier;
}

function resolveExecutionMode(profile: AgentProfile): ExecutionMode {
  if (profile.cooperation >= 60) {
    return 'swarm';
  }
  if (profile.defense >= profile.attack + 10) {
    return 'defensive';
  }
  if (profile.attack >= profile.defense + 10 || profile.agility >= 65) {
    return 'aggressive';
  }
  return 'balanced';
}

export function mapProfileToPolicy(profile: AgentProfile): AgentPolicy {
  const toolsAllowed = ['axl-messaging'];

  if (profile.intelligence >= 42) {
    toolsAllowed.push('market-scanner');
  }
  if (profile.attack >= 52) {
    toolsAllowed.push('uniswap-router');
  }
  if (profile.defense >= 50) {
    toolsAllowed.push('circuit-breaker');
  }
  if (profile.cooperation >= 52) {
    toolsAllowed.push('peer-orchestrator');
  }

  const executionMode = resolveExecutionMode(profile);
  const maxConcurrentAgents =
    profile.cooperation >= 70 ? 3 : profile.cooperation >= 50 ? 2 : 1;

  return {
    toolsAllowed,
    swarmEnabled: maxConcurrentAgents > 1,
    maxConcurrentAgents,
    executionMode,
    maxPositionSizeUsd: Math.round(
      clamp(
        12 +
          profile.attack * 0.74 +
          profile.cooperation * 0.24 -
          profile.defense * 0.1,
        10,
        100
      )
    ),
    maxDrawdownPct: round(
      clamp(4 + (100 - profile.defense) * 0.07 + profile.attack * 0.02, 4, 18),
      1
    ),
    slippageTolerancePct: round(
      clamp(
        0.2 +
          profile.attack * 0.011 +
          profile.agility * 0.009 -
          profile.defense * 0.006,
        0.2,
        2.5
      ),
      2
    ),
    rebalanceIntervalSec: Math.round(
      clamp(
        7200 -
          profile.agility * 44 -
          profile.intelligence * 24 +
          profile.defense * 16,
        900,
        7200
      )
    ),
    stopLossPct: round(
      clamp(2 + profile.defense * 0.075 - profile.attack * 0.02, 2, 10),
      1
    ),
  };
}
