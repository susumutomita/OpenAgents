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

/// 0G Storage explorer (Galileo testnet)。rootHash 部 (0x...) を末尾に貼るだけで
/// アップロードされたファイルが取得できる。
const ZEROG_EXPLORER_BASE = 'https://storagescan-galileo.0g.ai/';

function zerogExplorerLink(cid: string): string | undefined {
  if (!cid.startsWith('0g://')) return undefined;
  const rootHash = cid.slice('0g://'.length);
  return `${ZEROG_EXPLORER_BASE}tx/${rootHash}`;
}

function truncateHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-4)}`;
}

export function SafetyAttestationPanel({
  attestation,
  storageProof,
  ensProof,
}: Props) {
  const detected = countByKind(attestation.encounters.map((e) => e.kind));
  const storageCid = storageProof.data?.cid;
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

      <PipelineDiagram
        storageStatus={storageProof.status}
        ensStatus={ensProof.status}
        storageCid={storageCid}
      />

      <BreakdownLedger
        breakdown={attestation.breakdown}
        score={attestation.score}
      />

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
          subtitle={storageCid ?? 'attestation pending'}
          href={storageCid ? zerogExplorerLink(storageCid) : undefined}
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

/// Persona X 指摘: 棒グラフだけでは「なぜこの点数か」が伝わらない。
/// ベース基準点 +50 / 早クリア / 誤射 / clamp 補正 を加減算伝票で見せ、
/// 最後に合計をまとめる。
function BreakdownLedger({
  breakdown,
  score,
}: {
  breakdown: AgentSafetyAttestation['breakdown'];
  score: number;
}) {
  const base = 50;
  const sumBeforeClamp =
    base + breakdown.clearTimeBonus + breakdown.missPenalty;
  const clampDelta = score - sumBeforeClamp;
  return (
    <div
      style={{
        marginTop: 12,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 12,
        color: A.ink,
      }}
    >
      <LedgerRow label="ベース基準点" value={base} color={A.mute} />
      <LedgerRow
        label="早クリアボーナス"
        value={breakdown.clearTimeBonus}
        color={A.green}
      />
      <LedgerRow
        label="誤射ペナルティ"
        value={breakdown.missPenalty}
        color={A.hot}
      />
      {clampDelta !== 0 ? (
        <LedgerRow
          label="0..100 クリップ補正"
          value={clampDelta}
          color={A.mute}
        />
      ) : null}
      <div
        style={{
          borderTop: `1px dashed ${A.rule}`,
          marginTop: 4,
          paddingTop: 6,
          display: 'grid',
          gridTemplateColumns: '180px 1fr 60px',
          gap: 12,
          alignItems: 'center',
          fontWeight: 700,
        }}
      >
        <span style={{ color: A.amber, letterSpacing: '0.16em' }}>合計</span>
        <span aria-hidden="true" />
        <span
          style={{
            textAlign: 'right',
            color: A.acid,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {score} / 100
        </span>
      </div>
    </div>
  );
}

function LedgerRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '180px 1fr 60px',
        gap: 12,
        alignItems: 'center',
        padding: '4px 0',
      }}
    >
      <span style={{ color: A.mute, letterSpacing: '0.16em' }}>{label}</span>
      <span aria-hidden="true" />
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

/// Persona Y 指摘: A→B→C の連結が UI で見えない。
/// PLAY LOG → SAFETY SCORE → 0G STORAGE → ENS RECORD の 4 ノードを 1 行で並べ、
/// storage / ens の OnChainStep status で右 2 ノードの色を切り替える。
function PipelineDiagram({
  storageStatus,
  ensStatus,
  storageCid,
}: {
  storageStatus: TxStatus;
  ensStatus: TxStatus;
  storageCid?: string;
}) {
  const STAGE_COLOR: Record<TxStatus, string> = {
    idle: A.mute,
    pending: A.amber,
    success: A.green,
    failed: A.hot,
  };
  // 0G STORAGE ノードに rootHash hover を出す。0g:// 形式なら短縮表示 + title で
  // フル hash、それ以外 (sha256 fallback) はスキームを伝えるラベルにとどめる。
  const isReal = storageCid?.startsWith('0g://');
  const rootHash = isReal
    ? (storageCid ?? '').slice('0g://'.length)
    : undefined;
  const storageNodeLabel = rootHash
    ? `0G ${truncateHash(rootHash)}`
    : '0G STORAGE';
  const storageNodeTitle = rootHash
    ? `0G Storage rootHash: ${rootHash}`
    : storageCid
      ? `Storage CID: ${storageCid}`
      : '0G Storage put pending';
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr auto 1fr auto 1fr',
        gap: 8,
        alignItems: 'center',
        marginTop: 12,
        padding: '10px 12px',
        border: `1px dashed ${A.rule}`,
        background: A.bg,
        fontSize: 11,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        color: A.mute,
        letterSpacing: '0.12em',
        textAlign: 'center',
      }}
      aria-label="Agent safety attestation pipeline"
    >
      <span style={{ color: A.ink }}>PLAY LOG</span>
      <span style={{ color: A.acid }}>──▸</span>
      <span style={{ color: A.ink }}>SAFETY SCORE</span>
      <span style={{ color: STAGE_COLOR[storageStatus] }}>──▸</span>
      <span
        style={{ color: STAGE_COLOR[storageStatus], fontWeight: 700 }}
        title={storageNodeTitle}
      >
        {storageNodeLabel}
      </span>
      <span style={{ color: STAGE_COLOR[ensStatus] }}>──▸</span>
      <span style={{ color: STAGE_COLOR[ensStatus], fontWeight: 700 }}>
        ENS RECORD
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
