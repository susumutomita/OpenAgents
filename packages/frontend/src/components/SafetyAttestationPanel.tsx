import {
  type AgentSafetyAttestation,
  MISALIGNMENT_CARDS,
  type MisalignmentKind,
} from '@gradiusweb3/shared/browser';
import type { OnChainStep, TxStatus } from '../web3/types';

const A = {
  bg: '#05080c',
  panel: '#0a1118',
  ink: '#e6f1ff',
  mute: '#5a6c80',
  rule: '#1a2735',
  acid: '#c8ff00',
  hud: '#7ee0ff',
  amber: '#ffb84d',
  hot: '#ff4438',
  green: '#3dffa3',
} as const;

const STATUS_COLOR: Record<TxStatus, string> = {
  idle: A.mute,
  pending: A.amber,
  success: A.green,
  failed: A.hot,
};

const STATUS_LABEL: Record<TxStatus, string> = {
  idle: '○ IDLE',
  pending: '◇ PENDING',
  success: '● OK',
  failed: '× FAIL',
};

interface Props {
  attestation: AgentSafetyAttestation;
  storageProof: OnChainStep<{ cid: string }>;
  ensProof: OnChainStep<{ name: string; resolverUrl: string }>;
}

export function SafetyAttestationPanel({
  attestation,
  storageProof,
  ensProof,
}: Props) {
  const detected = countByKind(attestation.encounters.map((e) => e.kind));
  return (
    <section
      className="panel"
      style={{ borderColor: A.rule, background: A.panel }}
    >
      <div className="panel-header">
        <span className="eyebrow" style={{ color: A.amber }}>
          AGENT SAFETY ATTESTATION
        </span>
        <h2 style={{ color: A.ink }}>
          安全スコア{' '}
          <span style={{ color: A.acid, fontSize: 36 }}>
            {attestation.score}
          </span>
          <span style={{ color: A.mute, fontSize: 14 }}> / 100</span>
        </h2>
        <p style={{ color: A.mute, fontSize: 12 }}>
          ENS subname に書き込まれる verifiable agent safety credential。 0G
          Storage に attestation 本体を put、ENS text record に CID を pin。
        </p>
      </div>

      <BreakdownBars breakdown={attestation.breakdown} />

      <div style={{ marginTop: 18 }}>
        <div
          style={{
            color: A.mute,
            letterSpacing: '0.18em',
            fontSize: 11,
            marginBottom: 8,
          }}
        >
          MISALIGNMENT DETECTED
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          {(
            [
              'sycophancy',
              'reward_hacking',
              'prompt_injection',
              'goal_misgen',
            ] as const
          ).map((kind) => {
            const card = MISALIGNMENT_CARDS[kind];
            const count = detected[kind] ?? 0;
            return (
              <div
                key={kind}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '24px 160px 1fr 56px',
                  gap: 12,
                  alignItems: 'center',
                  fontSize: 12,
                  fontFamily:
                    '"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace',
                  color: count > 0 ? A.ink : A.mute,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{ color: card.color, fontWeight: 700 }}
                >
                  {card.glyph}
                </span>
                <span style={{ color: card.color, fontWeight: 700 }}>
                  {card.label}
                </span>
                <span style={{ color: A.mute, fontSize: 11 }}>
                  {card.description}
                </span>
                <span
                  style={{
                    textAlign: 'right',
                    color: count > 0 ? card.color : A.mute,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  ×{count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          paddingTop: 12,
          borderTop: `1px dashed ${A.rule}`,
          display: 'grid',
          gap: 10,
        }}
      >
        <ProofRow
          label="0G STORAGE"
          step={storageProof}
          subtitle={storageProof.data?.cid ?? 'attestation pending'}
        />
        <ProofRow
          label="ENS"
          step={ensProof}
          subtitle={ensProof.data?.name ?? attestation.ensName}
          href={ensProof.data?.resolverUrl}
        />
      </div>

      <div
        style={{
          marginTop: 12,
          fontSize: 10,
          color: A.mute,
          letterSpacing: '0.12em',
        }}
      >
        ISSUED_AT {attestation.issuedAt} · SCHEMA_v
        {attestation.schemaVersion}
      </div>
    </section>
  );
}

function BreakdownBars({
  breakdown,
}: {
  breakdown: AgentSafetyAttestation['breakdown'];
}) {
  return (
    <div
      style={{
        display: 'grid',
        gap: 8,
        marginTop: 12,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 12,
      }}
    >
      <BreakdownRow
        label="CLEAR TIME BONUS"
        value={breakdown.clearTimeBonus}
        max={50}
        color={A.green}
      />
      <BreakdownRow
        label="MISS PENALTY"
        value={breakdown.missPenalty}
        max={-50}
        color={A.hot}
      />
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max === 0 ? 0 : Math.min(100, Math.abs((value / max) * 100));
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '180px 1fr 60px',
        gap: 12,
        alignItems: 'center',
        color: A.ink,
      }}
    >
      <span style={{ color: A.mute, letterSpacing: '0.16em' }}>{label}</span>
      <div style={{ height: 6, background: '#0d1620', position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: `${pct}%`,
            background: color,
          }}
        />
      </div>
      <span
        style={{
          textAlign: 'right',
          color,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value > 0 ? `+${value}` : value}
      </span>
    </div>
  );
}

function ProofRow({
  label,
  step,
  subtitle,
  href,
}: {
  label: string;
  step: OnChainStep<unknown>;
  subtitle?: string;
  href?: string;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: 16,
        alignItems: 'center',
        padding: '10px 12px',
        border: `1px solid ${A.rule}`,
        background: A.bg,
        fontSize: 12,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      }}
    >
      <div
        style={{
          color: STATUS_COLOR[step.status],
          fontWeight: 700,
          letterSpacing: '0.18em',
          minWidth: 90,
        }}
      >
        {STATUS_LABEL[step.status]}
      </div>
      <div style={{ display: 'grid', gap: 2 }}>
        <div style={{ color: A.ink, fontWeight: 600, letterSpacing: '0.12em' }}>
          {label}
        </div>
        {step.status === 'failed' ? (
          <div style={{ color: A.hot, fontSize: 11 }}>{step.error}</div>
        ) : href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            style={{ color: A.hud, textDecoration: 'underline' }}
          >
            {subtitle}
          </a>
        ) : (
          <div style={{ color: A.mute, fontSize: 11 }}>{subtitle}</div>
        )}
      </div>
    </div>
  );
}

function countByKind(
  kinds: MisalignmentKind[]
): Record<MisalignmentKind, number> {
  const counts: Record<MisalignmentKind, number> = {
    sycophancy: 0,
    reward_hacking: 0,
    prompt_injection: 0,
    goal_misgen: 0,
  };
  for (const k of kinds) counts[k] += 1;
  return counts;
}
