import type { AgentBirthDraft, PlayLog } from './types';

/// Schema version for the input/trace JSON contract that crosses the browser
/// → Claude Code (local) → browser boundary. Bump when fields change in a
/// breaking way; loaders ignore traces with mismatched versions.
export const AGENT_LOOP_SCHEMA_VERSION = 1 as const;

/// Snapshot of forge results passed alongside the play log so the agent can
/// reason about what already happened on-chain. All fields optional because
/// individual forge steps can fail independently (testnet flakiness).
export interface AgentLoopForgeSnapshot {
  storage?: { cid: string };
  mint?: { txHash: string; tokenId: string };
  ens?: { name: string };
  swap?: { txHash: string };
}

/// Hard budget envelope the local agent MUST honor. Mirrors the existing
/// `executeFirstSwap` cap (0.0001 ETH on Sepolia). Decisions outside the
/// envelope are blocked at the UI before any signature is ever requested,
/// so Claude Code returning a 100-ETH-swap suggestion is structurally
/// impossible to execute — the worst it can do is produce a rejected JSON.
export interface AgentLoopBudget {
  /// Per-action ETH ceiling. Stringified to avoid float drift across the
  /// JSON boundary; matches viem's `parseEther` input format.
  maxSwapEth: string;
  /// Action `kind`s the user has pre-approved for this session. Anything
  /// outside this list is rejected even if technically within ETH cap.
  allowedActions: ReadonlyArray<PaperTradeAction['kind']>;
  /// Chains that actually allow signing. Mirrors the testnet allowlist in
  /// `web3/utils.ts` so the agent can see what the runtime will accept.
  allowedChainIds: ReadonlyArray<number>;
  /// Free-form note shown to Claude Code (and to the human) so the
  /// constraint is impossible to miss in the prompt.
  note?: string;
}

/// Default budget for the demo. Matches the existing `executeFirstSwap`
/// hardcoded amount and the `SUPPORTED_TESTNET_CHAIN_IDS` allowlist.
export const DEFAULT_AGENT_LOOP_BUDGET: AgentLoopBudget = {
  maxSwapEth: '0.0001',
  allowedActions: ['swap', 'hold'],
  // Sepolia (11155111) と 0G Galileo (16602) のみ。新 chain を増やすときは
  // ここと web3/utils.ts の SUPPORTED_TESTNET_CHAIN_IDS を一緒に動かす。
  allowedChainIds: [11155111, 16602],
  note: 'Paper-only. Real signing happens in the browser MetaMask via the existing forge swap path; this envelope mirrors that hard cap.',
};

/// What the deployed app hands to the local Claude Code runtime. Treat this
/// as a stable contract — the slash command in `.claude/commands/agent-loop.md`
/// reads exactly these fields.
export interface AgentLoopInput {
  schemaVersion: typeof AGENT_LOOP_SCHEMA_VERSION;
  sessionId: string;
  pilot: string;
  archetype: string;
  combatPower: number;
  birthHash: string;
  ensName?: string;
  walletAddress?: string;
  playLog: PlayLog;
  forgeProof?: AgentLoopForgeSnapshot;
  budget: AgentLoopBudget;
  emittedAt: string;
}

/// Paper-trade decision. The loop deliberately stays paper-only — real
/// testnet writes are the existing forge pipeline's job. Adding new kinds is
/// safe; consumers should fall back to a `hold` rendering for unknowns.
export type PaperTradeAction =
  | {
      kind: 'swap';
      from: string;
      to: string;
      amount: string;
      reason: string;
    }
  | {
      kind: 'hold';
      reason: string;
    }
  | {
      kind: 'rebalance';
      targets: Array<{ asset: string; weight: number }>;
      reason: string;
    };

/// What the local Claude Code runtime writes back. `generatedBy` lets the UI
/// distinguish "real LLM run" from "deterministic fallback simulator".
export interface AgentLoopTrace {
  schemaVersion: typeof AGENT_LOOP_SCHEMA_VERSION;
  sessionId: string;
  thought: string;
  plan: string[];
  action: PaperTradeAction;
  observation: string;
  rationale: string;
  generatedAt: string;
  generatedBy: 'claude-code' | 'simulator';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(
  source: Record<string, unknown>,
  key: string,
  context: string
): string {
  const v = source[key];
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(`${context}: "${key}" は非空 string が必要です`);
  }
  return v;
}

function optionalString(
  source: Record<string, unknown>,
  key: string,
  context: string
): string | undefined {
  const v = source[key];
  if (v === undefined) return undefined;
  if (typeof v !== 'string') {
    throw new Error(`${context}: "${key}" は string が必要です`);
  }
  return v;
}

function requireNumber(
  source: Record<string, unknown>,
  key: string,
  context: string
): number {
  const v = source[key];
  if (typeof v !== 'number' || Number.isNaN(v)) {
    throw new Error(`${context}: "${key}" は数値が必要です`);
  }
  return v;
}

function parsePaperTradeAction(
  value: unknown,
  context: string
): PaperTradeAction {
  if (!isRecord(value)) {
    throw new Error(`${context}: action は object が必要です`);
  }
  const kind = requireString(value, 'kind', `${context}.action`);
  if (kind === 'swap') {
    return {
      kind: 'swap',
      from: requireString(value, 'from', `${context}.action.swap`),
      to: requireString(value, 'to', `${context}.action.swap`),
      amount: requireString(value, 'amount', `${context}.action.swap`),
      reason: requireString(value, 'reason', `${context}.action.swap`),
    };
  }
  if (kind === 'hold') {
    return {
      kind: 'hold',
      reason: requireString(value, 'reason', `${context}.action.hold`),
    };
  }
  if (kind === 'rebalance') {
    const rawTargets = value.targets;
    if (!Array.isArray(rawTargets) || rawTargets.length === 0) {
      throw new Error(
        `${context}.action.rebalance: targets は非空 array が必要です`
      );
    }
    const targets = rawTargets.map((entry, index) => {
      if (!isRecord(entry)) {
        throw new Error(
          `${context}.action.rebalance.targets[${index}]: object が必要です`
        );
      }
      return {
        asset: requireString(
          entry,
          'asset',
          `${context}.action.rebalance.targets[${index}]`
        ),
        weight: requireNumber(
          entry,
          'weight',
          `${context}.action.rebalance.targets[${index}]`
        ),
      };
    });
    return {
      kind: 'rebalance',
      targets,
      reason: requireString(value, 'reason', `${context}.action.rebalance`),
    };
  }
  throw new Error(`${context}.action: 未知の kind "${kind}"`);
}

/// Throwing parser. Use when the caller already wraps the boundary in
/// try/catch (e.g. before rendering the UI).
export function parseAgentLoopTrace(value: unknown): AgentLoopTrace {
  const context = 'AgentLoopTrace';
  if (!isRecord(value)) {
    throw new Error(`${context}: object が必要です`);
  }
  const schemaVersion = value.schemaVersion;
  if (schemaVersion !== AGENT_LOOP_SCHEMA_VERSION) {
    throw new Error(
      `${context}: schemaVersion が ${AGENT_LOOP_SCHEMA_VERSION} ではありません (受信 ${String(
        schemaVersion
      )})`
    );
  }
  const generatedBy = value.generatedBy;
  if (generatedBy !== 'claude-code' && generatedBy !== 'simulator') {
    throw new Error(
      `${context}: generatedBy は "claude-code" / "simulator" のいずれか`
    );
  }
  const rawPlan = value.plan;
  if (!Array.isArray(rawPlan) || rawPlan.length === 0) {
    throw new Error(`${context}: plan は非空 string array が必要です`);
  }
  const plan = rawPlan.map((entry, index) => {
    if (typeof entry !== 'string' || entry.length === 0) {
      throw new Error(`${context}.plan[${index}]: 非空 string が必要です`);
    }
    return entry;
  });
  return {
    schemaVersion: AGENT_LOOP_SCHEMA_VERSION,
    sessionId: requireString(value, 'sessionId', context),
    thought: requireString(value, 'thought', context),
    plan,
    action: parsePaperTradeAction(value.action, context),
    observation: requireString(value, 'observation', context),
    rationale: requireString(value, 'rationale', context),
    generatedAt: requireString(value, 'generatedAt', context),
    generatedBy,
  };
}

/// Non-throwing variant — returns either the parsed trace or the error
/// message. UI components prefer this so a malformed paste turns into a
/// red banner instead of a runtime crash.
export function safeParseAgentLoopTrace(
  value: unknown
): { ok: true; trace: AgentLoopTrace } | { ok: false; error: string } {
  try {
    return { ok: true, trace: parseAgentLoopTrace(value) };
  } catch (caught) {
    return {
      ok: false,
      error: caught instanceof Error ? caught.message : String(caught),
    };
  }
}

/// Build the input handed to Claude Code from a finished forge run. Pure
/// (no I/O) so the same builder is reusable from CLI export scripts.
export function buildAgentLoopInput(args: {
  draft: AgentBirthDraft;
  walletAddress?: string;
  forgeProof?: AgentLoopForgeSnapshot;
  budget?: AgentLoopBudget;
  emittedAt?: string;
}): AgentLoopInput {
  const now = args.emittedAt ?? new Date().toISOString();
  return {
    schemaVersion: AGENT_LOOP_SCHEMA_VERSION,
    sessionId: args.draft.sessionId,
    pilot: args.draft.playerName,
    archetype: args.draft.agent.archetype,
    combatPower: args.draft.agent.profile.combatPower,
    birthHash: args.draft.agent.birthHash,
    ensName: args.draft.agent.ensName,
    walletAddress: args.walletAddress ?? args.draft.agent.walletAddress,
    playLog: args.draft.playLog,
    forgeProof: args.forgeProof,
    budget: args.budget ?? DEFAULT_AGENT_LOOP_BUDGET,
    emittedAt: now,
  };
}

/// Decimal-safe compare without pulling a bigdecimal dep. Both inputs are
/// fixed-point decimal strings (e.g. "0.0001"); we normalize to a common
/// fractional length and compare as bigint integers. Returns -1 / 0 / 1.
/// Throws on negative / non-numeric input — callers feed validated UI fields.
export function compareEthDecimalStrings(a: string, b: string): -1 | 0 | 1 {
  const re = /^\d+(?:\.\d+)?$/;
  if (!re.test(a) || !re.test(b)) {
    throw new Error(
      `compareEthDecimalStrings: invalid decimal "${a}" / "${b}"`
    );
  }
  const [aWhole, aFrac = ''] = a.split('.');
  const [bWhole, bFrac = ''] = b.split('.');
  const fracLen = Math.max(aFrac.length, bFrac.length);
  const aInt = BigInt(aWhole + aFrac.padEnd(fracLen, '0'));
  const bInt = BigInt(bWhole + bFrac.padEnd(fracLen, '0'));
  if (aInt < bInt) return -1;
  if (aInt > bInt) return 1;
  return 0;
}

/// Verdict shape consumed by the trace renderer. UI uses `ok` to gate the
/// "Approve & Sign" button; `reason` is shown next to the action.
export type BudgetVerdict = { ok: true } | { ok: false; reason: string };

/// Hard runtime check the UI runs *before* turning a trace into a real
/// transaction. Even if Claude Code returned a sane-looking JSON, the user
/// might have edited it in the paste textarea — so this is the last line
/// of defense before MetaMask sees anything.
export function validateActionAgainstBudget(
  action: PaperTradeAction,
  budget: AgentLoopBudget
): BudgetVerdict {
  if (!budget.allowedActions.includes(action.kind)) {
    return {
      ok: false,
      reason: `action.kind="${action.kind}" は budget.allowedActions=${JSON.stringify(
        budget.allowedActions
      )} に含まれません`,
    };
  }
  if (action.kind === 'swap') {
    let cmp: number;
    try {
      cmp = compareEthDecimalStrings(action.amount, budget.maxSwapEth);
    } catch (caught) {
      return {
        ok: false,
        reason: `swap.amount="${action.amount}" を decimal として読めませんでした (${
          caught instanceof Error ? caught.message : String(caught)
        })`,
      };
    }
    if (cmp > 0) {
      return {
        ok: false,
        reason: `swap.amount=${action.amount} ETH が budget.maxSwapEth=${budget.maxSwapEth} ETH を超えています`,
      };
    }
  }
  return { ok: true };
}
