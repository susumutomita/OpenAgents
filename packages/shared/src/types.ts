import type { MOAI_IDS, SLOT_CAPSULES, TOOLS } from './powerups';

export type Capsule = (typeof SLOT_CAPSULES)[number];

export type MoaiId = (typeof MOAI_IDS)[number];

export type Tool = (typeof TOOLS)[number];

export type PlayEvent =
  | { kind: 'shoot'; t: number; enemyId: string; tradeoffLabel: string }
  | { kind: 'pass'; t: number; enemyId: string; tradeoffLabel: string }
  | { kind: 'capsule'; t: number; capsule: Capsule }
  | { kind: 'barAdvance'; t: number; position: number }
  | { kind: 'commit'; t: number; position: number; capsule: Capsule }
  | { kind: 'moaiKill'; t: number; moaiId: MoaiId }
  | { kind: 'hit'; t: number; damage: number };

export interface PlayLog {
  sessionId: string;
  events: PlayEvent[];
  durationMs: number;
  finalScore: number;
}

export interface AgentProfile {
  attack: number;
  defense: number;
  intelligence: number;
  agility: number;
  cooperation: number;
  combatPower: number;
}

export type ExecutionMode = 'defensive' | 'balanced' | 'aggressive' | 'swarm';

export interface AgentPolicy {
  toolsAllowed: Tool[];
  swarmEnabled: boolean;
  maxConcurrentAgents: number;
  executionMode: ExecutionMode;
  maxPositionSizeUsd: number;
  maxDrawdownPct: number;
  slippageTolerancePct: number;
  rebalanceIntervalSec: number;
  stopLossPct: number;
}

export interface DerivedWallet {
  seed: string;
  privateKey: string;
  address: string;
}

export interface AgentNode {
  id: string;
  role: 'birth' | 'runtime' | 'peer';
  label: string;
  status: 'online' | 'warming';
}

export interface ActivityFeedEvent {
  id: string;
  atOffsetMs: number;
  category: 'birth' | 'policy' | 'network' | 'market';
  message: string;
}

export interface ForgedAgent {
  tokenId: string;
  ensName: string;
  walletAddress: string;
  seed: string;
  birthHash: string;
  archetype: string;
  highlights: string[];
  profile: AgentProfile;
  policy: AgentPolicy;
  nodes: AgentNode[];
}

export interface AgentBirthDraft {
  sessionId: string;
  playerName: string;
  playLog: PlayLog;
  agent: ForgedAgent;
  feed: ActivityFeedEvent[];
}

export interface StoredAgentBirth extends AgentBirthDraft {
  createdAt: string;
}
