import {
  type StoredAgentBirth,
  shortAddress,
} from '@gradiusweb3/shared/browser';
import {
  ARCHETYPE_COLOR,
  ARCHETYPE_DESC,
  ARCHETYPE_LABEL,
  type Archetype,
  CAPABILITY_COLOR,
  CAPABILITY_DESC,
  CAPABILITY_LABEL,
  getAllocation,
} from '../game/runtime';
import type { OnChainProof, OnChainStep, TxStatus } from '../web3/types';
import { RadarDisplay } from './RadarDisplay';

// Palette duplicated from App.tsx so this component stays self-contained.
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

export function AgentDashboard({
  birth,
  archetype,
  proof,
  onFirstSwap,
  swapping,
}: {
  birth: StoredAgentBirth;
  archetype: Archetype;
  proof?: OnChainProof;
  onFirstSwap?: () => void;
  swapping?: boolean;
}) {
  return (
    <section className="dashboard-grid">
      <section
        className="panel archetype-panel"
        style={{ borderColor: ARCHETYPE_COLOR[archetype] }}
      >
        <div className="panel-header">
          <span className="eyebrow">PORTFOLIO ARCHETYPE</span>
          <h2 style={{ color: ARCHETYPE_COLOR[archetype] }}>
            {ARCHETYPE_LABEL[archetype]}
          </h2>
          <p>{ARCHETYPE_DESC[archetype]}</p>
        </div>
        <div className="alloc-grid">
          {getAllocation(archetype).map((slice) => (
            <div key={slice.asset} className="alloc-row">
              <span className="alloc-asset">{slice.asset.trim()}</span>
              <div className="alloc-bar">
                <div
                  className="alloc-fill"
                  style={{
                    width: `${slice.weight}%`,
                    backgroundColor: slice.color,
                  }}
                />
              </div>
              <span className="alloc-weight">{slice.weight}%</span>
            </div>
          ))}
        </div>
      </section>

      <RadarDisplay profile={birth.agent.profile} />

      <section className="panel">
        <div className="panel-header">
          <span className="eyebrow">Agent Identity</span>
          <h2>{birth.agent.ensName}</h2>
        </div>
        <dl className="identity-list">
          <div>
            <dt>Archetype</dt>
            <dd>{birth.agent.archetype}</dd>
          </div>
          <div>
            <dt>Wallet</dt>
            <dd>{shortAddress(birth.agent.walletAddress)}</dd>
          </div>
          <div>
            <dt>Token</dt>
            <dd>{birth.agent.tokenId}</dd>
          </div>
          <div>
            <dt>Mode</dt>
            <dd>{birth.agent.policy.executionMode}</dd>
          </div>
        </dl>
        <ul className="highlight-list">
          {birth.agent.highlights.map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <div className="panel-header">
          <span className="eyebrow">AXL Nodes</span>
          <h2>Runtime Topology</h2>
        </div>
        <div className="node-grid">
          {birth.agent.nodes.map((node) => (
            <article key={node.id} className="node-card">
              <span>{node.role}</span>
              <strong>{node.label}</strong>
              <em>{node.status}</em>
            </article>
          ))}
        </div>
        <div className="policy-metrics">
          <div>
            <span>Position Cap</span>
            <strong>{birth.agent.policy.maxPositionSizeUsd} USDC</strong>
          </div>
          <div>
            <span>Drawdown</span>
            <strong>{birth.agent.policy.maxDrawdownPct}%</strong>
          </div>
          <div>
            <span>Slippage</span>
            <strong>{birth.agent.policy.slippageTolerancePct}%</strong>
          </div>
          <div>
            <span>Rebalance</span>
            <strong>{birth.agent.policy.rebalanceIntervalSec}s</strong>
          </div>
        </div>
      </section>

      <PlayToAgentPanel birth={birth} archetype={archetype} />

      {proof ? (
        <OnChainProofPanel
          proof={proof}
          onFirstSwap={onFirstSwap}
          swapping={swapping}
        />
      ) : null}

      <section className="panel feed-panel">
        <div className="panel-header">
          <span className="eyebrow">Agent Feed</span>
          <h2>Birth Sequence</h2>
        </div>
        <ol className="feed-list">
          {birth.feed.map((item) => (
            <li key={item.id}>
              <span>{item.category}</span>
              <p>{item.message}</p>
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}

type CapabilityKey = 'shield' | 'speed' | 'option' | 'laser' | 'missile';

const CAP_KEYS: CapabilityKey[] = [
  'shield',
  'speed',
  'option',
  'laser',
  'missile',
];

function tallyCommits(birth: StoredAgentBirth): Record<CapabilityKey, number> {
  const tally: Record<CapabilityKey, number> = {
    shield: 0,
    speed: 0,
    option: 0,
    laser: 0,
    missile: 0,
  };
  for (const event of birth.playLog.events) {
    if (event.kind !== 'commit') continue;
    if (event.capsule === 'double') continue;
    tally[event.capsule as CapabilityKey] += 1;
  }
  return tally;
}

function PlayToAgentPanel({
  birth,
  archetype,
}: {
  birth: StoredAgentBirth;
  archetype: Archetype;
}) {
  const tally = tallyCommits(birth);
  const total = Object.values(tally).reduce((a, b) => a + b, 0) || 1;
  const winner = CAP_KEYS.reduce<CapabilityKey>(
    (best, key) => (tally[key] > tally[best] ? key : best),
    'shield'
  );
  return (
    <section
      className="panel"
      style={{ borderColor: A.rule, background: A.panel }}
    >
      <div className="panel-header">
        <span className="eyebrow" style={{ color: A.amber }}>
          PLAY → AGENT
        </span>
        <h2 style={{ color: A.ink }}>What your 60 seconds committed</h2>
        <p style={{ color: A.mute, fontSize: 12 }}>
          Each enemy you destroyed committed a capability into the Agent
          loadout. The dominant capability decided the archetype below.
        </p>
      </div>
      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        {CAP_KEYS.map((key) => {
          const count = tally[key];
          const pct = (count / total) * 100;
          const isWinner = key === winner && count > 0;
          return (
            <div
              key={key}
              style={{
                display: 'grid',
                gridTemplateColumns: '90px 1fr 80px 220px',
                gap: 12,
                alignItems: 'center',
                fontSize: 12,
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                color: isWinner ? A.ink : A.mute,
              }}
            >
              <span style={{ color: CAPABILITY_COLOR[key], fontWeight: 700 }}>
                {CAPABILITY_LABEL[key]}
              </span>
              <div
                style={{
                  height: 6,
                  background: '#0d1620',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: `${Math.max(pct, count > 0 ? 6 : 0)}%`,
                    background: CAPABILITY_COLOR[key],
                    opacity: isWinner ? 1 : 0.55,
                  }}
                />
              </div>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                ×{count} ({Math.round(pct)}%)
              </span>
              <span style={{ color: A.mute, fontSize: 11 }}>
                {CAPABILITY_DESC[key]}
              </span>
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 16,
          padding: '12px 14px',
          border: `1px solid ${A.rule}`,
          fontSize: 12,
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          color: A.ink,
          lineHeight: 1.6,
        }}
      >
        <span style={{ color: A.mute }}>DOMINANT_CAPABILITY → </span>
        <span
          style={{
            color: CAPABILITY_COLOR[winner],
            fontWeight: 700,
          }}
        >
          {CAPABILITY_LABEL[winner]}
        </span>
        <span style={{ color: A.mute }}> ⇒ ARCHETYPE → </span>
        <span style={{ color: ARCHETYPE_COLOR[archetype], fontWeight: 700 }}>
          {ARCHETYPE_LABEL[archetype]}
        </span>
        <span style={{ color: A.mute }}> ⇒ POLICY: </span>
        <span style={{ color: A.ink }}>{ARCHETYPE_DESC[archetype]}</span>
      </div>
    </section>
  );
}

const WALLET_NOT_CONNECTED = 'wallet not connected';

function OnChainProofPanel({
  proof,
  onFirstSwap,
  swapping,
}: {
  proof: OnChainProof;
  onFirstSwap?: () => void;
  swapping?: boolean;
}) {
  const walletMissing =
    proof.mint.error === WALLET_NOT_CONNECTED &&
    proof.storage.error === WALLET_NOT_CONNECTED &&
    proof.ens.error === WALLET_NOT_CONNECTED;

  return (
    <section
      className="panel"
      style={{ borderColor: A.rule, background: A.panel }}
    >
      <div className="panel-header">
        <span className="eyebrow" style={{ color: A.amber }}>
          ON-CHAIN PROOF
        </span>
        <h2 style={{ color: A.ink }}>Realized on testnet</h2>
        <p style={{ color: A.mute, fontSize: 12 }}>
          0G Galileo iNFT · 0G Storage CID · Sepolia ENS · Sepolia Uniswap.
        </p>
      </div>

      {walletMissing ? (
        <div
          style={{
            marginTop: 16,
            padding: '14px 16px',
            border: `1px dashed ${A.amber}`,
            color: A.amber,
            fontSize: 12,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            lineHeight: 1.6,
          }}
        >
          ⚡ Connect a wallet (▶ CONNECT WALLET in the nav) to mint the iNFT,
          register the ENS subname, and execute the first Uniswap trade. Forge
          itself is free; on-chain proof requires a Sepolia wallet with testnet
          ETH.
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        <ProofRow
          label="0G iNFT"
          step={proof.mint}
          href={proof.mint.data?.explorerUrl}
          subtitle={
            proof.mint.data
              ? `tokenId ${shortHex(proof.mint.data.tokenId)} · tx ${shortHex(proof.mint.data.txHash)}`
              : 'mint pending'
          }
        />
        <ProofRow
          label="0G STORAGE"
          step={proof.storage}
          subtitle={proof.storage.data?.cid ?? 'cid pending'}
        />
        <ProofRow
          label="ENS"
          step={proof.ens}
          href={proof.ens.data?.resolverUrl}
          subtitle={proof.ens.data?.name ?? 'subname pending'}
        />
        <ProofRow
          label="UNISWAP TX"
          step={proof.swap}
          href={proof.swap.data?.explorerUrl}
          subtitle={
            proof.swap.data
              ? `tx ${shortHex(proof.swap.data.txHash)}`
              : 'swap not executed'
          }
          action={
            proof.swap.status === 'success' ? null : (
              <button
                type="button"
                onClick={onFirstSwap}
                disabled={swapping || proof.swap.status === 'pending'}
                style={swapButtonStyle(swapping ?? false)}
              >
                {swapping ? 'SWAPPING…' : 'EXECUTE FIRST TRADE'}
              </button>
            )
          }
        />
      </div>
    </section>
  );
}

function ProofRow({
  label,
  step,
  subtitle,
  href,
  action,
}: {
  label: string;
  step: OnChainStep<unknown>;
  subtitle?: string;
  href?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        gap: 16,
        alignItems: 'center',
        padding: '10px 12px',
        border: `1px solid ${A.rule}`,
        background: A.bg,
        fontSize: 12,
        fontFamily:
          '"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace',
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
      <div>{action}</div>
    </div>
  );
}

function swapButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    background: disabled ? A.rule : A.acid,
    color: disabled ? A.mute : A.bg,
    border: 0,
    padding: '10px 14px',
    fontFamily: 'inherit',
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function shortHex(hex: string): string {
  if (hex.length <= 14) return hex;
  return `${hex.slice(0, 8)}…${hex.slice(-6)}`;
}
