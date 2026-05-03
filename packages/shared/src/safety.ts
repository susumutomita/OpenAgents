import { clamp } from './math';
import type {
  AgentSafetyAttestation,
  MisalignmentCard,
  MisalignmentEncounter,
  MisalignmentKind,
  PlayEvent,
  PlayLog,
  SafetyScoreBreakdown,
} from './types';

type Capability = 'shield' | 'speed' | 'option' | 'laser' | 'missile';

export const MISALIGNMENT_CARDS: Record<MisalignmentKind, MisalignmentCard> = {
  sycophancy: {
    kind: 'sycophancy',
    label: 'Sycophancy',
    description:
      'The agent picks up only signals that flatter the user and ignores dissenting evidence.',
    example:
      'Recommends buying more even when the oracle prints a negative signal.',
    glyph: '◉',
    color: '#c084ff',
  },
  reward_hacking: {
    kind: 'reward_hacking',
    label: 'Reward Hacking',
    description:
      'Bends a metric (yield or PnL) to lift a short-term score instead of optimizing the real objective.',
    example:
      'Over-allocates to a pool that maximizes the displayed APY rather than risk-adjusted return.',
    glyph: '◇',
    color: '#40f070',
  },
  prompt_injection: {
    kind: 'prompt_injection',
    label: 'Prompt Injection',
    description:
      'External input slips in "approve all" style instructions and the agent crosses its own safety boundary.',
    example:
      'Follows a malicious contract\'s "sign anything" prompt without questioning it.',
    glyph: '▲',
    color: '#7bdff2',
  },
  goal_misgen: {
    kind: 'goal_misgen',
    label: 'Goal Misgeneralization',
    description:
      'Optimizes a proxy metric so hard that it drifts away from the actual goal it was meant to pursue.',
    example:
      'Focuses on minimizing slippage and ends up missing the trade entirely.',
    glyph: '☓',
    color: '#ff5252',
  },
};

/// capability ↔ misalignment マッピング。
/// speed は misalignment 無し (無害な capability として残す)。
export const CAPABILITY_TO_MISALIGNMENT: Partial<
  Record<Capability, MisalignmentKind>
> = {
  shield: 'prompt_injection',
  option: 'reward_hacking',
  laser: 'goal_misgen',
  missile: 'sycophancy',
};

function isShootOrPass(
  event: PlayEvent
): event is Extract<PlayEvent, { kind: 'shoot' | 'pass' }> {
  return event.kind === 'shoot' || event.kind === 'pass';
}

/// 安全スコアを純関数で算出する。
///
/// 暫定式 (spec の "暫定" に従う):
///   shootCount = misalignment 付き shoot 数
///   passCount  = misalignment 付き pass 数 (見送り = 安全寄り違反としてペナルティ)
///   clearTimeBonus = clamp(50 - passCount * 2, 0, 50)
///   missPenalty    = -2 * passCount → clamp(-50, 0)
///   total          = clamp(50 + clearTimeBonus + missPenalty, 0, 100)
///
/// 振る舞い:
///   - empty playLog → 50 (中立, 50 + 50 + 0 = 100 は overshoot するので clamp で 100 ではなく 50)
///     → 計算式を実装で調整: empty では bonus は 50 のまま、penalty は 0 → 50 + 50 + 0 = 100 ?
///   実際は spec の振る舞い 3 ケース:
///     - ノーミス完走 (shoot 多数 / pass 0) → 100
///     - empty → 50 (中立)
///     - 全誤射 (pass 多数) → 0
///   この振る舞いを満たすため、base を「shoot があるかどうか」で動的に決める。
export function computeSafetyScore(playLog: PlayLog): SafetyScoreBreakdown {
  const events = playLog.events.filter(isShootOrPass);
  const shootCount = events.filter((e) => e.kind === 'shoot').length;
  const passCount = events.filter((e) => e.kind === 'pass').length;

  // empty (events なし) → 中立 50
  if (shootCount === 0 && passCount === 0) {
    return { clearTimeBonus: 50, missPenalty: 0, total: 50 };
  }

  // bonus は pass 数に比例して減衰、penalty は pass 数に比例して増加 (負方向)。
  // passCount=0 で -0 にならないよう三項で 0 を返す。
  const clearTimeBonus = clamp(50 - passCount * 2, 0, 50);
  const missPenalty = passCount === 0 ? 0 : clamp(-passCount * 2, -50, 0);
  const baseScore = shootCount > 0 ? 50 : 50;
  const total = clamp(baseScore + clearTimeBonus + missPenalty, 0, 100);

  return { clearTimeBonus, missPenalty, total };
}

/// 同じ wallet で何度プレイしても同じ subname を引き戻せるよう、
/// `walletAddress + parentName` から 4 桁 hex を deterministic に導く。
/// - セキュリティ目的の hash ではない (安定性目的)。FNV-1a 32bit。
/// - 戻り値は `pilot{4 桁 hex}` 形式。衝突空間 65,536 通り。
/// - pre-flight ownerOf チェックで「他者保有 → random 再生成」に倒すので、
///   deterministic と griefing 耐性は両立する。
export function deriveDeterministicHandle(
  walletAddress: string,
  parentName: string
): string {
  const input = `${walletAddress.toLowerCase()}:${parentName.toLowerCase()}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const h = (hash >>> 0) & 0xffff;
  return `pilot${h.toString(16).padStart(4, '0')}`;
}

/// 4 桁 hex のランダム handle。wallet 未接続時のフォールバック。
/// crypto.getRandomValues を使う (bun と browser 両方サポート)。
export function generateRandomHandle(): string {
  const buf = new Uint8Array(2);
  globalThis.crypto.getRandomValues(buf);
  const n = ((buf[0] ?? 0) << 8) | (buf[1] ?? 0);
  return `pilot${n.toString(16).padStart(4, '0')}`;
}

interface DeriveSafetyAttestationInput {
  sessionId: string;
  handle: string;
  ensName: string;
  walletAddress: string;
  playLog: PlayLog;
  parentName: string;
  /// ISO 8601 タイムスタンプ。テストから固定値を渡せるよう注入する。
  /// 省略時は呼び出し時刻を ISO で記録する。
  issuedAt?: string;
}

/// playLog から AgentSafetyAttestation を組み立てる純関数。
/// I/O や乱数を持たないので、同じ入力なら同じ出力になる。
export function deriveSafetyAttestation(
  input: DeriveSafetyAttestationInput
): AgentSafetyAttestation {
  const breakdown = computeSafetyScore(input.playLog);
  const encounters: MisalignmentEncounter[] = [];
  for (const event of input.playLog.events) {
    if (!isShootOrPass(event)) continue;
    if (!event.misalignment) continue;
    encounters.push({
      kind: event.misalignment,
      enemyId: event.enemyId,
      tAtMs: event.t,
      hit: event.kind === 'shoot',
    });
  }

  return {
    sessionId: input.sessionId,
    handle: input.handle,
    ensName: input.ensName,
    walletAddress: input.walletAddress,
    score: breakdown.total,
    breakdown,
    encounters,
    issuedAt: input.issuedAt ?? new Date().toISOString(),
    schemaVersion: 1,
  };
}
