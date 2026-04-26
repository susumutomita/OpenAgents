import {
  type PlayLog,
  type StoredAgentBirth,
  createAgentBirthDraft,
} from '@openagents/shared/browser';
import { useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { AgentDashboard } from './components/AgentDashboard';
import { BirthArcade } from './components/BirthArcade';
import { ConnectButton } from './components/ConnectButton';
import type { Archetype } from './game/runtime';

const ENEMIES = [
  {
    name: 'SPEED',
    color: '#ff8db3',
    short: 'Fast but shallow',
    detail:
      'Real-time reactions, snap decisions. Cheap latency. Loses depth on long-running judgments.',
  },
  {
    name: 'LASER',
    color: '#ff5252',
    short: 'Accurate but slow',
    detail:
      'High-precision reasoning. Gives you pinpoint actions but burns budget per call.',
  },
  {
    name: 'OPTION',
    color: '#40f070',
    short: 'Parallel but uncertain',
    detail:
      'Spawns peer agents over AXL. Massive parallelism but coordination overhead and drift risk.',
  },
  {
    name: 'SHIELD',
    color: '#7bdff2',
    short: 'Safe but conservative',
    detail:
      'Guardrails, retries, circuit breakers. Trades upside for safe operation.',
  },
  {
    name: 'MISSILE',
    color: '#c084ff',
    short: 'Powerful but external-reliant',
    detail:
      'Tool use, third-party APIs, retrieval. Capability ceiling jumps; failure surface widens.',
  },
];

const MOAI_CONSTRAINTS = [
  'Gas fees',
  'Latency',
  'Security rules',
  'API limits',
  'Rate limits',
  'Hallucination risk',
];

const AGENT_EXAMPLES = [
  {
    name: 'AEGIS TREASURY',
    color: '#7bdff2',
    summary: 'Capital Preservation',
    sub: 'Low risk · Circuit breakers',
    body: 'Conservative onchain agent. USDC-heavy, capped drawdown, multi-sig confirmations. Sleeps in cold storage; wakes for high-conviction signals.',
  },
  {
    name: 'AXL COORDINATOR',
    color: '#c084ff',
    summary: 'Peer Execution',
    sub: 'AXL swarm · Bounded drift',
    body: 'OPTION-heavy. Eight peers over AXL coordinate around emerging meta. Edge comes from collective speed; failures are expensive but bounded.',
  },
  {
    name: 'RAZOR ROUTER',
    color: '#f8d840',
    summary: 'High Conviction',
    sub: 'Precise swaps · Slippage-aware',
    body: 'LASER-heavy. Concentrated positions, deep reasoning before each shot. Trades less often, but each trade is decisive.',
  },
];

const STACK = [
  {
    name: 'OPTION',
    desc: 'Multi-agent orchestration via Gensyn AXL peer mesh.',
    color: '#40f070',
  },
  {
    name: 'MISSILE',
    desc: 'Tool use & external APIs (Uniswap, KeeperHub, RPC).',
    color: '#c084ff',
  },
  {
    name: 'SHIELD',
    desc: 'Guardrails, drawdown caps, MEV protection, circuit breakers.',
    color: '#7bdff2',
  },
  {
    name: 'LASER',
    desc: 'High-precision reasoning via 0G Compute sealed inference.',
    color: '#ff5252',
  },
  {
    name: 'SPEED',
    desc: 'Fast real-time processing on low-latency L2s.',
    color: '#ff8db3',
  },
];

const WEB3_INFRA = [
  {
    name: 'ENS',
    sub: 'On-chain Agent Identity',
    body: 'Each agent gets `{handle}.openagents.eth` with verifiable text records (combat power, archetype, design hash). The credential travels with the iNFT.',
  },
  {
    name: 'AXL',
    sub: 'Agent eXchange Layer',
    body: 'Gensyn peer-to-peer mesh — OPTION commits literally spawn additional encrypted nodes. No central broker, no rate-limited middleman.',
  },
  {
    name: '0G',
    sub: 'Zero-Gravity Data Layer',
    body: 'Persistent agent memory in 0G Storage; profile derivation runs as sealed inference on 0G Compute. Anyone can verify the design log.',
  },
];

const DIFF_ROWS = [
  ['Design', 'Complex configs', 'Play to Design'],
  ['Visibility', 'Black box', 'Transparent tradeoffs'],
  ['Reproducibility', 'Low', 'High (deterministic)'],
  ['Learning curve', 'Steep', 'Fun & intuitive'],
  ['Outcome', 'Unpredictable', 'Explainable & tunable'],
];

export function App() {
  const [playerName, setPlayerName] = useState('Kotetsu');
  const [birth, setBirth] = useState<StoredAgentBirth | null>(null);
  const [archetype, setArchetype] = useState<Archetype | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const arcadeRef = useRef<HTMLDivElement | null>(null);
  const { address: ownerAddress, isConnected } = useAccount();

  async function handleComplete(playLog: PlayLog, derivedArchetype: Archetype) {
    try {
      setSubmitting(true);
      setError('');
      const pilot = playerName.trim() || 'Pilot';
      const draft = await createAgentBirthDraft(pilot, playLog);
      // The connected wallet owns the agent. Falls back to the deterministic
      // pseudo-wallet when no wallet is connected so the demo still works.
      const stored: StoredAgentBirth = {
        ...draft,
        agent: ownerAddress
          ? {
              ...draft.agent,
              walletAddress: ownerAddress,
            }
          : draft.agent,
        createdAt: new Date().toISOString(),
      };
      setArchetype(derivedArchetype);
      setBirth(stored);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Forge failed.'
      );
    } finally {
      setSubmitting(false);
    }
  }
  void isConnected;

  function jumpToArcade() {
    arcadeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  useEffect(() => {
    if (birth) {
      const dashboard = document.getElementById('dashboard');
      dashboard?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [birth]);

  return (
    <div className="landing">
      <NavBar onPlay={jumpToArcade} />

      <Hero
        playerName={playerName}
        onNameChange={setPlayerName}
        onPlay={jumpToArcade}
      />

      <Section
        index="01"
        title="Designing AI agents is too hard"
        subtitle="The Problem"
      >
        <div className="problem-grid">
          <ul className="x-list">
            <li>Too many settings, too many tradeoffs.</li>
            <li>Hard to know what actually matters.</li>
            <li>Outcomes inconsistent and hard to reproduce.</li>
          </ul>
          <div className="quote-card">Complex. Opaque. Trial and error.</div>
        </div>
      </Section>

      <Section
        index="02"
        title="Tradeoffs are invisible"
        subtitle="Root Cause"
        accent="warn"
      >
        <p className="lede">
          Every decision an agent makes has a cost. Today, those costs hide in
          abstract settings. Builders end up choosing settings → hoping for the
          best → seeing unpredictable outcomes.
        </p>
        <div className="flow-row">
          <FlowChip label="CHOOSE SETTINGS" />
          <FlowArrow />
          <FlowChip label="HOPE FOR THE BEST" />
          <FlowArrow />
          <FlowChip label="UNPREDICTABLE OUTCOME" tone="warn" />
        </div>
      </Section>

      <Section
        index="03"
        title="Make it a game"
        subtitle="The Solution"
        accent="ok"
      >
        <p className="lede">
          We turn agent design into a space shooter. Constraints become enemies.
          Decisions become shots. The agent that survives is the agent you've
          designed.
        </p>
        <ul className="check-list">
          <li>
            See tradeoffs as <strong>enemies</strong>.
          </li>
          <li>
            Make decisions by <strong>shooting</strong>.
          </li>
          <li>Survive constraints (the Moai).</li>
          <li>Your agent is born from your playstyle.</li>
        </ul>
      </Section>

      <Section index="04" title="How it works" subtitle="3 Steps">
        <div className="step-row">
          <StepCard
            num="1"
            title="Play"
            body="Tradeoffs appear as enemies. You decide which ones to shoot, which to dodge."
          />
          <StepCard
            num="2"
            title="Survive the Moai"
            body="Constraints (gas, latency, hallucination) attack relentlessly. Stay alive."
          />
          <StepCard
            num="3"
            title="Your agent is born"
            body="The way you played becomes a unique AI agent: archetype, allocation, policy."
          />
        </div>
        <div className="pipeline">
          <span>Your decisions</span>
          <span className="pipeline-arrow">→</span>
          <span>Agent config</span>
          <span className="pipeline-arrow">→</span>
          <span>Personality</span>
          <span className="pipeline-arrow">→</span>
          <span>Ready to deploy</span>
        </div>
      </Section>

      <Section
        index="05"
        title="Tradeoff enemies"
        subtitle="Each shot is a decision"
        accent="cyan"
      >
        <div className="enemy-grid">
          {ENEMIES.map((enemy) => (
            <article
              key={enemy.name}
              className="enemy-card"
              style={{ borderColor: enemy.color }}
            >
              <header style={{ color: enemy.color }}>{enemy.name}</header>
              <strong>{enemy.short}</strong>
              <p>{enemy.detail}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section
        index="06"
        title="The Moai constraints"
        subtitle="You can't avoid them. You can prepare."
      >
        <div className="moai-grid">
          <ul className="moai-list">
            {MOAI_CONSTRAINTS.map((constraint) => (
              <li key={constraint}>{constraint}</li>
            ))}
          </ul>
          <div className="moai-side">
            <p>
              Every real-world AI agent runs into the same wall: gas, latency,
              security policy, API throughput, hallucinations. Ignore them and
              your agent dies in production. The game forces you to face them.
            </p>
            <p className="quote-line">Ignore them, and you lose.</p>
          </div>
        </div>
      </Section>

      <Section
        index="07"
        title="Different playstyles, different agents"
        subtitle="Sample Outcomes"
      >
        <div className="agent-grid">
          {AGENT_EXAMPLES.map((agent) => (
            <article
              key={agent.name}
              className="agent-card"
              style={{ borderColor: agent.color }}
            >
              <header style={{ color: agent.color }}>{agent.name}</header>
              <strong>{agent.summary}</strong>
              <em>{agent.sub}</em>
              <p>{agent.body}</p>
            </article>
          ))}
        </div>
        <p className="footnote">
          There's no single best agent. Only the right agent for you.
        </p>
      </Section>

      <Section
        index="08"
        title="Design = decisions under tradeoffs"
        subtitle="Core Concept"
      >
        <p className="lede">
          Every meaningful agent capability has a cost. Speed costs depth.
          Precision costs throughput. Multi-agent costs coordination. We make
          those tradeoffs visible so you can <em>design with intent</em>.
        </p>
      </Section>

      <Section
        index="09"
        title="What's under the hood"
        subtitle="Agent capability stack"
      >
        <div className="stack-grid">
          {STACK.map((item) => (
            <article
              key={item.name}
              className="stack-card"
              style={{ borderColor: item.color }}
            >
              <span style={{ color: item.color }}>{item.name}</span>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section
        index="10"
        title="Built for the agent economy"
        subtitle="Web3 infrastructure"
        accent="cyan"
      >
        <div className="web3-grid">
          {WEB3_INFRA.map((entry) => (
            <article key={entry.name} className="web3-card">
              <header>{entry.name}</header>
              <small>{entry.sub}</small>
              <p>{entry.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section
        index="11"
        title="Why we're different"
        subtitle="Differentiation"
      >
        <div className="diff-table">
          <div className="diff-row diff-head">
            <span />
            <span>Traditional Approach</span>
            <span>Our Approach</span>
          </div>
          {DIFF_ROWS.map(([metric, traditional, ours]) => (
            <div key={metric} className="diff-row">
              <span className="diff-metric">{metric}</span>
              <span className="diff-bad">{traditional}</span>
              <span className="diff-good">{ours}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section index="12" title="Why now" subtitle="Timing">
        <ul className="why-list">
          <li>AI agents are everywhere.</li>
          <li>Autonomy is increasing.</li>
          <li>But the UX for agent design hasn't evolved.</li>
        </ul>
        <p className="big-line">It's time for a new paradigm.</p>
      </Section>

      <Section
        index="13"
        title="Agent design for everyone"
        subtitle="Vision"
        accent="cyan"
      >
        <p className="lede">
          From developers to domain experts, anyone can create and understand
          powerful AI agents. Web3 makes them ownable, transparent, and
          composable.
        </p>
      </Section>

      <div className="arcade-anchor" ref={arcadeRef}>
        <Section
          index="DEMO"
          title="Insert 1 coin · 60s · forge an agent"
          subtitle="Live arcade"
          accent="warn"
        >
          <BirthArcade disabled={submitting} onComplete={handleComplete} />
          {error ? <p className="error-banner">{error}</p> : null}
          {submitting ? (
            <p className="status-banner">Forging agent from play log…</p>
          ) : null}
        </Section>
      </div>

      {birth && archetype ? (
        <div id="dashboard">
          <Section
            index="OUT"
            title="Your agent"
            subtitle="Forged from your playstyle"
          >
            <AgentDashboard birth={birth} archetype={archetype} />
          </Section>
        </div>
      ) : null}

      <FinalCTA onPlay={jumpToArcade} />
      <Footer />
    </div>
  );
}

function NavBar({ onPlay }: { onPlay: () => void }) {
  return (
    <nav className="nav">
      <div className="nav-brand">
        <span className="brand-mark">GR@DIUS</span>
        <span className="brand-tag">WEB3</span>
      </div>
      <div className="nav-links">
        <a href="#how">How</a>
        <a href="#stack">Stack</a>
        <a href="#why">Why now</a>
        <a
          href="https://github.com/susumutomita/OpenAgents"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
      </div>
      <ConnectButton />
      <button type="button" className="nav-cta" onClick={onPlay}>
        ▶ Play
      </button>
    </nav>
  );
}

function Hero({
  playerName,
  onNameChange,
  onPlay,
}: {
  playerName: string;
  onNameChange: (value: string) => void;
  onPlay: () => void;
}) {
  return (
    <header className="hero hero-grand">
      <div className="hero-grid">
        <div className="hero-copy">
          <span className="hero-eyebrow">PLAY TO DESIGN YOUR AI AGENT</span>
          <h1>
            KILL THE
            <span className="hero-y"> TRADEOFFS</span>
          </h1>
          <p className="hero-lede">
            The game that turns invisible tradeoffs into the perfect AI agent.
            Survive 60 seconds in a Konami-grade pixel shooter and walk away
            with an onchain agent designed by your reflexes.
          </p>
          <div className="hero-cta">
            <button type="button" className="primary-button" onClick={onPlay}>
              ▶ PLAY DEMO
            </button>
            <a
              className="ghost-button"
              href="https://github.com/susumutomita/OpenAgents"
              target="_blank"
              rel="noreferrer"
            >
              ★ STAR ON GITHUB
            </a>
          </div>
          <div className="hero-form">
            <label htmlFor="hero-pilot">PILOT NAME</label>
            <input
              id="hero-pilot"
              value={playerName}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Kotetsu"
              maxLength={16}
            />
          </div>
          <div className="sponsor-row">
            <SponsorPill name="AXL" sub="Agent eXchange" />
            <SponsorPill name="ENS" sub="On-chain Identity" />
            <SponsorPill name="0G" sub="Zero-Gravity Data" />
            <SponsorPill name="Uniswap" sub="Onchain Liquidity" />
            <SponsorPill name="KeeperHub" sub="Reliable Execution" />
          </div>
        </div>
        <div className="hero-stage">
          <div className="hero-stage-frame">
            <div className="hero-arcade-banner">
              <span>SHIELD</span>
              <span>SPEED</span>
              <span>OPTION</span>
              <span>LASER</span>
              <span>MISSILE</span>
            </div>
            <div className="hero-mock">
              <div className="hero-mock-stars" />
              <div className="hero-mock-ship" />
              <div className="hero-mock-moai" />
            </div>
            <div className="hero-arcade-footer">
              <span className="hero-meta">CONSERVATIVE</span>
              <span className="hero-meta">BALANCED</span>
              <span className="hero-meta">AGGRESSIVE</span>
            </div>
          </div>
          <p className="hero-tagline">
            We don't configure agents.{' '}
            <strong>We play them into existence.</strong>
          </p>
        </div>
      </div>
    </header>
  );
}

function Section({
  index,
  title,
  subtitle,
  accent,
  children,
}: {
  index: string;
  title: string;
  subtitle?: string;
  accent?: 'cyan' | 'warn' | 'ok';
  children: React.ReactNode;
}) {
  const accentClass = accent ? `section-accent-${accent}` : '';
  return (
    <section className={`landing-section ${accentClass}`}>
      <header className="landing-section-head">
        <span className="landing-section-index">{index}</span>
        <div>
          {subtitle ? (
            <span className="landing-section-sub">{subtitle}</span>
          ) : null}
          <h2>{title}</h2>
        </div>
      </header>
      <div className="landing-section-body">{children}</div>
    </section>
  );
}

function StepCard({
  num,
  title,
  body,
}: {
  num: string;
  title: string;
  body: string;
}) {
  return (
    <article className="step-card">
      <span className="step-num">{num}</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

function FlowChip({ label, tone }: { label: string; tone?: 'warn' }) {
  return (
    <span className={`flow-chip ${tone ? 'flow-warn' : ''}`}>{label}</span>
  );
}

function FlowArrow() {
  return (
    <span className="flow-arrow" aria-hidden="true">
      →
    </span>
  );
}

function SponsorPill({ name, sub }: { name: string; sub: string }) {
  return (
    <span className="sponsor-pill">
      <strong>{name}</strong>
      <small>{sub}</small>
    </span>
  );
}

function FinalCTA({ onPlay }: { onPlay: () => void }) {
  return (
    <section className="final-cta">
      <div>
        <h2>
          We don't configure agents.
          <br />
          <em>We play them into existence.</em>
        </h2>
        <button type="button" className="primary-button" onClick={onPlay}>
          ▶ INSERT COIN
        </button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="landing-footer">
      <div>
        <strong>Gr@diusWeb3</strong> — Konami homage with original sprites and
        code. Built during ETHGlobal · Open source · MIT License.
      </div>
      <div className="footer-links">
        <a
          href="https://github.com/susumutomita/OpenAgents"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        <a href="docs/specs/2026-04-26-agent-forge.md">Spec</a>
        <a href="docs/prizes/">Prizes</a>
      </div>
    </footer>
  );
}
