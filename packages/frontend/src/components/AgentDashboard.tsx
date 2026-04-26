import type { StoredAgentBirth } from '@openagents/shared/browser';
import { RadarDisplay } from './RadarDisplay';

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function AgentDashboard({ birth }: { birth: StoredAgentBirth }) {
  return (
    <section className="dashboard-grid">
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
