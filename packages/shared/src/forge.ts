import { mapProfileToPolicy } from './policy';
import { mapPlayLogToProfile } from './profile';
import type {
  ActivityFeedEvent,
  AgentBirthDraft,
  AgentNode,
  AgentPolicy,
  AgentProfile,
  PlayLog,
} from './types';
import { deriveWalletFromPlayLog, hashPlayLog } from './wallet';

function slugifyPlayerName(playerName: string) {
  const normalized = playerName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized.length > 0 ? normalized : 'pilot';
}

function describeArchetype(profile: AgentProfile) {
  const entries = [
    ['Attack', profile.attack],
    ['Defense', profile.defense],
    ['Intelligence', profile.intelligence],
    ['Agility', profile.agility],
    ['Cooperation', profile.cooperation],
  ] as const;
  const topEntry = entries.reduce((best, current) =>
    current[1] > best[1] ? current : best
  );

  if (profile.cooperation >= 60 && profile.agility >= 50) {
    return 'Aggressive Swarm';
  }
  if (profile.defense >= 60) {
    return 'Aegis Guardian';
  }
  if (profile.attack >= 60) {
    return 'Razor Sharpshooter';
  }
  if (profile.intelligence >= 58) {
    return 'Oracle Operator';
  }

  return `${topEntry[0]}-leaning Balanced Agent`;
}

function buildHighlights(profile: AgentProfile, policy: AgentPolicy) {
  const highlights = [
    `Combat Power ${profile.combatPower.toLocaleString()}`,
    `${policy.executionMode} execution profile`,
    `${policy.maxConcurrentAgents} active node${policy.maxConcurrentAgents > 1 ? 's' : ''}`,
  ];

  if (policy.toolsAllowed.includes('uniswap-router')) {
    highlights.push('Uniswap routing unlocked');
  }
  if (policy.toolsAllowed.includes('circuit-breaker')) {
    highlights.push('Circuit breaker engaged');
  }

  return highlights;
}

function buildNodes(policy: AgentPolicy): AgentNode[] {
  const nodes: AgentNode[] = [
    {
      id: 'birth-server',
      role: 'birth',
      label: 'Birth Server',
      status: 'online',
    },
    {
      id: 'runtime-core',
      role: 'runtime',
      label: 'Runtime Core',
      status: 'online',
    },
  ];

  if (policy.maxConcurrentAgents > 1) {
    nodes.push({
      id: 'peer-axl',
      role: 'peer',
      label: 'Peer AXL Node',
      status: 'online',
    });
  }

  return nodes;
}

function buildFeed(
  profile: AgentProfile,
  policy: AgentPolicy,
  ensName: string
): ActivityFeedEvent[] {
  const feed: ActivityFeedEvent[] = [
    {
      id: 'birth',
      atOffsetMs: 0,
      category: 'birth',
      message: `${ensName} forged with Combat Power ${profile.combatPower.toLocaleString()}.`,
    },
    {
      id: 'policy',
      atOffsetMs: 800,
      category: 'policy',
      message: `${policy.executionMode} mode set. Max drawdown ${policy.maxDrawdownPct}%.`,
    },
    {
      id: 'network',
      atOffsetMs: 1600,
      category: 'network',
      message: policy.swarmEnabled
        ? `${policy.maxConcurrentAgents} AXL nodes synchronized for cooperative execution.`
        : 'Single-node execution path armed.',
    },
  ];

  if (policy.toolsAllowed.includes('uniswap-router')) {
    feed.push({
      id: 'market',
      atOffsetMs: 2400,
      category: 'market',
      message: `Missile-class routing ready. Position cap ${policy.maxPositionSizeUsd} USDC.`,
    });
  }

  return feed;
}

export function createAgentBirthDraft(
  playerName: string,
  playLog: PlayLog
): AgentBirthDraft {
  const wallet = deriveWalletFromPlayLog(playLog);
  const profile = mapPlayLogToProfile(playLog);
  const policy = mapProfileToPolicy(profile);
  const birthHash = hashPlayLog(playLog);
  const ensName = `${slugifyPlayerName(playerName)}-${playLog.sessionId.slice(0, 6)}.openagents.eth`;
  const tokenId = BigInt(`0x${birthHash.slice(2, 18)}`).toString(10);
  const archetype = describeArchetype(profile);
  const highlights = buildHighlights(profile, policy);
  const nodes = buildNodes(policy);
  const feed = buildFeed(profile, policy, ensName);

  return {
    sessionId: playLog.sessionId,
    playerName,
    playLog,
    agent: {
      tokenId,
      ensName,
      walletAddress: wallet.address,
      seed: wallet.seed,
      birthHash,
      archetype,
      highlights,
      profile,
      policy,
      nodes,
    },
    feed,
  };
}
