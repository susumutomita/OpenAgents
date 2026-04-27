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

/// Display-only wallet metadata derived deterministically from the play log.
/// `seed` is exposed for reproducibility narrative; `address` is shown only
/// when no real wallet is connected. No private key is derived or stored.
export interface DerivedWallet {
  seed: string;
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

/// On-chain pipeline status (re-exported for the frontend OnChainProof
/// surface — kept here so non-frontend consumers can import the same shape).
export type TxStatus = 'idle' | 'pending' | 'success' | 'failed';

export interface OnChainStep<T> {
  status: TxStatus;
  data?: T;
  error?: string;
}

export interface OnChainMintProof {
  txHash: string;
  tokenId: string;
  explorerUrl: string;
}

export interface OnChainStorageProof {
  cid: string;
}

export interface OnChainEnsProof {
  name: string;
  resolverUrl: string;
}

export interface OnChainSwapProof {
  txHash: string;
  explorerUrl: string;
}

export interface OnChainProof {
  mint: OnChainStep<OnChainMintProof>;
  storage: OnChainStep<OnChainStorageProof>;
  ens: OnChainStep<OnChainEnsProof>;
  swap: OnChainStep<OnChainSwapProof>;
}
