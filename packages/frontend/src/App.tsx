import {
  type PlayLog,
  type StoredAgentBirth,
  createAgentBirthDraft,
  shortAddress,
} from '@gradiusweb3/shared/browser';
import {
  type CSSProperties,
  type Ref,
  forwardRef,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useAccount } from 'wagmi';
import { AgentDashboard } from './components/AgentDashboard';
import { BirthArcade } from './components/BirthArcade';
import { ConnectButton } from './components/ConnectButton';
import { Fighter } from './components/Fighter';
import { Callout, HUDCorners, Reticle } from './components/HUD';
import type { Archetype } from './game/runtime';

const A = {
  bg: '#05080c',
  bgAlt: '#08111a',
  panel: '#0a1118',
  ink: '#e6f1ff',
  mute: '#5a6c80',
  rule: '#1a2735',
  acid: '#c8ff00',
  hud: '#7ee0ff',
  amber: '#ffb84d',
  hot: '#ff4438',
  green: '#3dffa3',
  body: '#a8b8c8',
} as const;

const ARCHETYPES = [
  {
    id: '01',
    name: 'SPEED',
    short: 'Fast but shallow',
    body: 'Real-time reactions, snap decisions. Cheap latency. Loses depth on long-running judgments.',
    tag: 'PINK',
    color: '#ff8db3',
  },
  {
    id: '02',
    name: 'LASER',
    short: 'Accurate but slow',
    body: 'High-precision reasoning. Pinpoint actions but burns budget per call.',
    tag: 'RED',
    color: '#ff5252',
  },
  {
    id: '03',
    name: 'OPTION',
    short: 'Parallel but uncertain',
    body: 'Spawns peer agents. Massive parallelism, coordination overhead, drift risk.',
    tag: 'GREEN',
    color: '#40f070',
  },
  {
    id: '04',
    name: 'SHIELD',
    short: 'Safe but conservative',
    body: 'Guardrails, retries, circuit breakers. Trades upside for safe operation.',
    tag: 'CYAN',
    color: '#7bdff2',
  },
  {
    id: '05',
    name: 'MISSILE',
    short: 'Powerful but external-reliant',
    body: 'Tool use, third-party APIs, retrieval. Capability ceiling jumps; failure surface widens.',
    tag: 'PURPLE',
    color: '#c084ff',
  },
  {
    id: '06',
    name: 'MOAI',
    short: 'The constraints you cannot shoot',
    body: 'Gas, latency, security policy, API limits, hallucination risk. Dodge or die.',
    tag: 'BOSS',
    color: A.hot,
  },
] as const;

type ForgeStatus = 'open' | 'gate' | 'live' | 'critical';

const STATUS_DISPLAY: Record<ForgeStatus, { color: string; label: string }> = {
  open: { color: A.mute, label: '○ OPEN' },
  gate: { color: A.ink, label: '▲ GATE' },
  live: { color: A.acid, label: '● LIVE' },
  critical: { color: A.hot, label: '◆ CRIT' },
};

const FORGE_FLOW: Array<[string, string, string, string, ForgeStatus]> = [
  [
    'STEP_01',
    'T-60s',
    'Insert coin · move · auto-fire',
    'WASD or arrow keys. Color you destroy most decides your archetype.',
    'live',
  ],
  [
    'STEP_02',
    'T-00s',
    'Stage clear → play log finalised',
    'Deterministic capture: each shot, hit, dodge, and Moai survival.',
    'gate',
  ],
  [
    'STEP_03',
    'POST',
    'Play log → profile → policy',
    'Pure functions in `packages/shared/src/forge.ts`. Same log, same agent.',
    'open',
  ],
  [
    'STEP_04',
    'POST',
    'Wallet derived in browser',
    'Web Crypto SubtleCrypto seeds the agent wallet from play log hash.',
    'open',
  ],
  [
    'STEP_05',
    'CHAIN',
    'ENS subname registered',
    '{handle}.gradiusweb3.eth + verifiable text records (combat-power, archetype, design-hash).',
    'critical',
  ],
  [
    'STEP_06',
    'CHAIN',
    'iNFT minted on 0G',
    'ERC-7857-style: agent body, policy blob, play log hash all on-chain.',
    'critical',
  ],
  [
    'STEP_07',
    'CHAIN',
    'Uniswap routing unlocked',
    'Agent executes its first swap on Sepolia. FEEDBACK.md captures DX learnings.',
    'critical',
  ],
];

const SPONSOR_PAYLOAD = [
  {
    code: '0G',
    prize: '$15,000',
    weight: 60,
    role: 'iNFT body + storage + sealed compute',
    body: 'ERC-7857-style iNFT for the agent body. play_log + memory in 0G Storage. Profile derivation runs as sealed inference on 0G Compute.',
    where: 'contracts/src/AgentForgeINFT.sol · packages/shared/src/forge.ts',
    color: A.acid,
  },
  {
    code: 'ENS',
    prize: '$5,000',
    weight: 20,
    role: 'On-chain agent identity (Creative track)',
    body: 'Auto-issued subname `{handle}.gradiusweb3.eth` with verifiable text records. The credential is portable, the iNFT carries it.',
    where: 'contracts/src/AgentForgeSubnameRegistry.sol',
    color: A.hud,
  },
  {
    code: 'UNI',
    prize: '$5,000',
    weight: 20,
    role: "Agent's real on-chain action",
    body: 'Sepolia swap via Uniswap API closes the loop: play → forge → trade. FEEDBACK.md documents DX friction.',
    where: 'FEEDBACK.md',
    color: A.hot,
  },
];

const SPONSOR_TIERS: Array<[string, string[]]> = [
  ['PRIMARY', ['0G $15K', 'ENS $5K', 'UNISWAP $5K']],
  ['INFRA', ['VITE', 'REACT_19', 'VIEM', 'WAGMI', 'FOUNDRY', 'BUN', 'BIOME']],
  ['CHAINS', ['SEPOLIA', 'BASE_SEPOLIA', 'OP_SEPOLIA', 'ARB_SEPOLIA']],
];

const DIFF_ROWS: Array<[string, string, string]> = [
  [
    'DESIGN_SURFACE',
    'complex configs / abstract sliders',
    'play to design (visible tradeoffs)',
  ],
  ['TRADEOFF_VISIBILITY', 'black box', 'every shot is a vote — explicit'],
  [
    'REPRODUCIBILITY',
    'low (settings drift)',
    'high (deterministic from play log)',
  ],
  [
    'LEARNING_CURVE',
    'steep · read docs to start',
    'mario 1-1 · 2-second tutorial',
  ],
  [
    'WEB3_INTEGRATION',
    'bolted on later',
    'native (iNFT + ENS + UNI from day 1)',
  ],
];

export function App() {
  const [playerName, setPlayerName] = useState('Kotetsu');
  const [birth, setBirth] = useState<StoredAgentBirth | null>(null);
  const [archetype, setArchetype] = useState<Archetype | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const arcadeRef = useRef<HTMLDivElement | null>(null);
  const { address: ownerAddress } = useAccount();

  async function handleComplete(playLog: PlayLog, derivedArchetype: Archetype) {
    try {
      setSubmitting(true);
      setError('');
      const pilot = playerName.trim() || 'Pilot';
      const draft = await createAgentBirthDraft(pilot, playLog);
      const stored: StoredAgentBirth = {
        ...draft,
        agent: ownerAddress
          ? { ...draft.agent, walletAddress: ownerAddress }
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
    <div style={S.shell}>
      <StatusBar />
      <Nav onPlay={jumpToArcade} />
      <Hero
        playerName={playerName}
        onNameChange={setPlayerName}
        onPlay={jumpToArcade}
        birth={birth}
      />
      <ArchetypesSection />
      <ForgeProtocolSection />
      <SponsorPayloadSection />
      <DifferentiationSection />
      <SponsorsSection />
      <ArcadeSection
        ref={arcadeRef}
        disabled={submitting}
        onComplete={handleComplete}
        error={error}
        submitting={submitting}
      />
      {birth && archetype ? (
        <DashboardSection birth={birth} archetype={archetype} />
      ) : null}
      <CTASection onPlay={jumpToArcade} />
      <FooterBar />
    </div>
  );
}

function formatUtc(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function StatusCell({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'baseline' }}>
      <span style={{ color: A.mute }}>{k}</span>
      <span
        style={{ color: color || A.ink, fontVariantNumeric: 'tabular-nums' }}
      >
        {v}
      </span>
    </span>
  );
}

function StatusBar() {
  const [clock, setClock] = useState(() => formatUtc(new Date()));
  useEffect(() => {
    const id = setInterval(() => setClock(formatUtc(new Date())), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="lp-status-bar" style={S.statusBar}>
      <span>
        <span style={{ color: A.green }}>●</span> NETWORK_ONLINE ·
        GR@DIUS_FORGE_v1.0
      </span>
      <StatusCell k="ICAO" v="GNSH" />
      <StatusCell k="HDG" v="027°" color={A.hud} />
      <StatusCell k="CHAIN" v="SEPOLIA" color={A.hud} />
      <StatusCell k="UTC" v={clock} color={A.green} />
      <StatusCell k="OP" v="ETHGLOBAL_TOKYO" />
      <span style={{ color: A.amber, justifySelf: 'end' }}>
        ◆ MASTER_ARM · OPEN
      </span>
    </div>
  );
}

function Nav({ onPlay }: { onPlay: () => void }) {
  return (
    <div className="lp-nav" style={S.nav}>
      <div style={S.logo}>
        <span style={{ color: A.acid }}>▮▮</span> GR@DIUS
        <span style={{ color: A.mute }}>/WEB3</span>
      </div>
      <div className="lp-nav-links" style={S.navLinks}>
        <a href="#tradeoffs" style={S.navLink}>
          [01] Tradeoffs
        </a>
        <a href="#forge" style={S.navLink}>
          [02] Forge
        </a>
        <a href="#sponsors" style={S.navLink}>
          [03] Payload
        </a>
        <a href="#arcade" style={S.navLink}>
          [04] Arcade
        </a>
        <a
          href="https://github.com/susumutomita/Gr-diusWeb3"
          target="_blank"
          rel="noreferrer"
          style={S.navLink}
        >
          [05] GitHub
        </a>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <ConnectButton />
        <button type="button" style={S.applyBtn} onClick={onPlay}>
          ▶ Insert Coin
        </button>
      </div>
    </div>
  );
}

const SPEC_ROWS: Array<[string, string]> = [
  ['ROLE', 'Autonomous DeFi · multi-chain'],
  ['CREW', '1 (player → agent)'],
  ['PROPULSION', '2× WebCrypto turbofan'],
  ['AVIONICS', '0G storage · ERC-7857 iNFT'],
  ['ARMAMENT', 'ENS subname · Uniswap router'],
  ['DATALINK', 'wagmi + viem · EIP-1193'],
  ['CEILING', '∞ · permissionless'],
];

const SPEC_STATS: Array<[string, string]> = [
  ['SPD', '60 fps'],
  ['G', '+9.0'],
  ['RNG', 'GLOBAL'],
];

const FOOTER_LINKS: Array<[string, string]> = [
  ['GITHUB', 'https://github.com/susumutomita/Gr-diusWeb3'],
  [
    'SPEC',
    'https://github.com/susumutomita/Gr-diusWeb3/blob/main/docs/specs/2026-04-26-agent-forge.md',
  ],
  [
    'PRIZES',
    'https://github.com/susumutomita/Gr-diusWeb3/tree/main/docs/prizes',
  ],
  [
    'FEEDBACK',
    'https://github.com/susumutomita/Gr-diusWeb3/blob/main/FEEDBACK.md',
  ],
];

function Hero({
  playerName,
  onNameChange,
  onPlay,
  birth,
}: {
  playerName: string;
  onNameChange: (v: string) => void;
  onPlay: () => void;
  birth: StoredAgentBirth | null;
}) {
  return (
    <section style={S.hero}>
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
        preserveAspectRatio="none"
        viewBox="0 0 1440 900"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="horizon" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#0a1a26" />
            <stop offset="0.55" stopColor="#06121c" />
            <stop offset="0.56" stopColor="#030608" />
            <stop offset="1" stopColor="#020406" />
          </linearGradient>
        </defs>
        <rect width="1440" height="900" fill="url(#horizon)" />
        <ellipse
          cx="1080"
          cy="500"
          rx="380"
          ry="60"
          fill="#3a8aa8"
          opacity="0.14"
        />
        <ellipse
          cx="1080"
          cy="500"
          rx="180"
          ry="20"
          fill="#7ee0ff"
          opacity="0.08"
        />
        <g stroke="#3a8aa8" strokeWidth="1" opacity="0.4">
          {Array.from({ length: 14 }).map((_, i) => {
            const x = 720 + (i - 7) * 14;
            return (
              <line
                key={`run-${x}`}
                x1={720}
                y1={520}
                x2={x * 8 - 720 * 7}
                y2={900}
              />
            );
          })}
          {[540, 580, 640, 720, 820].map((y, i) => (
            <line
              key={`hz-${y}`}
              x1="0"
              y1={y}
              x2="1440"
              y2={y}
              opacity={0.15 + i * 0.05}
            />
          ))}
        </g>
        <g stroke={A.amber} strokeWidth="2" opacity="0.5">
          <line x1="720" y1="540" x2="720" y2="900" strokeDasharray="6 18" />
        </g>
      </svg>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: `radial-gradient(circle at 20% 30%, ${A.hud}11, transparent 40%), radial-gradient(circle at 80% 70%, ${A.amber}0a, transparent 50%)`,
        }}
      />

      <div style={{ position: 'relative', padding: '32px 0 64px' }}>
        <div style={S.missionHeader}>
          <div>
            <span style={{ color: A.amber }}>▸ MISSION FILE</span>
            <span style={{ margin: '0 14px', color: A.rule }}>│</span>
            CLASSIFICATION: OPEN-SOURCE
            <span style={{ margin: '0 14px', color: A.rule }}>│</span>
            CALLSIGN: GR@DIUS
            <span style={{ margin: '0 14px', color: A.rule }}>│</span>
            OP: AGENT_FORGE
          </div>
          <div>SHEET 01 / 06</div>
        </div>

        <div className="lp-hero-stage" style={S.heroStage}>
          <div className="lp-fighter" style={S.fighterFrame}>
            <Fighter width={1180} />
          </div>

          <div
            className="lp-hud-overlay"
            style={{ position: 'absolute', top: '6%', left: '62%' }}
          >
            <Reticle size={140} label="TGT · AGENT-FORGE" color={A.amber} />
          </div>
          <div
            className="lp-hud-overlay"
            style={{ position: 'absolute', top: '60%', left: '14%' }}
          >
            <Reticle size={100} label="WPT · INSERT_COIN" color={A.hud} />
          </div>

          <Callout
            className="lp-hud-overlay"
            x="58%"
            y="24%"
            label="CANOPY"
            sub="Bubble · 360° vis"
            color={A.hud}
          />
          <Callout
            className="lp-hud-overlay"
            x="12%"
            y="26%"
            label="F100-PW"
            sub="2× WebCrypto turbofan"
            color={A.hud}
          />
          <Callout
            className="lp-hud-overlay"
            x="22%"
            y="74%"
            label="AIM-9X"
            sub="ENS · subname missile"
            color={A.amber}
            flip
          />
          <Callout
            className="lp-hud-overlay"
            x="66%"
            y="74%"
            label="LINK-16"
            sub="0G storage · datalink"
            color={A.hud}
            flip
          />

          <div style={S.heroBanner}>── INSERT COIN · 60 SECONDS ──</div>
        </div>

        <div className="lp-hero-lower" style={S.heroLower}>
          <div>
            <h1 style={S.heroH1}>
              KILL THE
              <br />
              TRADEOFFS.
              <br />
              <span style={S.heroH1Italic}>fly your agent.</span>
            </h1>
            <p style={S.heroLede}>
              Gr<span style={{ color: A.hud }}>@</span>dius is a 60-second
              arcade dogfight that doubles as the world's fastest onboarding for
              autonomous on-chain agents. Stick. Throttle. Trigger.{' '}
              <span style={{ color: A.ink }}>
                The agent that survives is the agent you ship.
              </span>
            </p>
            <div
              style={{
                display: 'flex',
                gap: 12,
                marginTop: 32,
                alignItems: 'stretch',
                flexWrap: 'wrap',
              }}
            >
              <button type="button" style={S.amberBtn} onClick={onPlay}>
                <span style={{ marginRight: 10 }}>▸</span> CLEARED FOR TAKEOFF
              </button>
              <a
                href="https://github.com/susumutomita/Gr-diusWeb3"
                target="_blank"
                rel="noreferrer"
                style={S.cyanBtn}
              >
                ░ READ_FLIGHT_MANUAL
              </a>
            </div>
            <div style={S.pilotForm}>
              <label htmlFor="hero-pilot" style={S.pilotLabel}>
                ▸ PILOT_CALLSIGN
              </label>
              <input
                id="hero-pilot"
                value={playerName}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Kotetsu"
                maxLength={16}
                style={S.pilotInput}
              />
            </div>
            <div style={S.countStrip}>
              {[
                ['60s', 'BUILD_WINDOW'],
                ['5+1', 'ARCHETYPES'],
                ['$25K', 'PRIZE_TARGET'],
                ['1', 'iNFT_PER_RUN'],
              ].map(([n, l], i) => (
                <div
                  key={l}
                  style={{
                    padding: '20px 16px',
                    borderRight: i < 3 ? `1px solid ${A.rule}` : 'none',
                  }}
                >
                  <div style={S.countNum}>{n}</div>
                  <div style={S.countLabel}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={S.specCard}>
            <HUDCorners color={A.hud} />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  color: A.amber,
                  letterSpacing: '0.24em',
                  fontSize: 11,
                }}
              >
                ◆ AIRCRAFT 01-A
              </span>
              <span
                style={{ color: A.mute, letterSpacing: '0.24em', fontSize: 11 }}
              >
                SPEC SHEET
              </span>
            </div>
            <div
              style={{
                fontSize: 22,
                color: A.ink,
                fontWeight: 700,
                letterSpacing: '0.04em',
                marginBottom: 4,
              }}
            >
              GR-15 EAGLE / @
            </div>
            <div
              style={{
                color: A.mute,
                letterSpacing: '0.18em',
                marginBottom: 18,
                fontSize: 11,
              }}
            >
              MULTI-ROLE · ON-CHAIN AIR-SUPERIORITY
            </div>
            {SPEC_ROWS.map(([k, v], i) => (
              <div
                key={k}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '110px 1fr',
                  padding: '7px 0',
                  borderBottom:
                    i < SPEC_ROWS.length - 1 ? `1px dashed ${A.rule}` : 'none',
                  fontSize: 11,
                }}
              >
                <span style={{ color: A.mute, letterSpacing: '0.18em' }}>
                  {k}
                </span>
                <span style={{ color: A.ink }}>{v}</span>
              </div>
            ))}
            <div style={S.specStats}>
              {SPEC_STATS.map(([k, v]) => (
                <div key={k} style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      color: A.hud,
                      fontSize: 18,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {v}
                  </div>
                  <div
                    style={{
                      color: A.mute,
                      fontSize: 9,
                      letterSpacing: '0.24em',
                    }}
                  >
                    {k}
                  </div>
                </div>
              ))}
            </div>
            {birth ? (
              <div style={S.specForgeRow}>
                <div
                  style={{
                    color: A.green,
                    fontSize: 10,
                    letterSpacing: '0.24em',
                    marginBottom: 6,
                  }}
                >
                  ◆ AIRBORNE · LAST_FORGE
                </div>
                <div
                  style={{
                    display: 'grid',
                    gap: 4,
                    fontSize: 11,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <div>
                    PILOT{' '}
                    <span style={{ color: A.ink }}>{birth.agent.ensName}</span>
                  </div>
                  <div>
                    COMBAT_POWER{' '}
                    <span style={{ color: A.amber }}>
                      {birth.agent.profile.combatPower.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    WALLET{' '}
                    <span style={{ color: A.hud }}>
                      {shortAddress(birth.agent.walletAddress)}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function ArchetypesSection() {
  return (
    <section id="tradeoffs" style={S.section}>
      <SectionHead
        num="§ 01 / TRADEOFFS"
        title="Six enemies. One agent."
        right="EACH_SHOT_IS_A_VOTE"
      />
      <div className="lp-grid-three" style={S.gridThree}>
        {ARCHETYPES.map((t, i) => (
          <div
            key={t.id}
            style={{
              padding: '28px 24px',
              borderRight: (i + 1) % 3 !== 0 ? `1px solid ${A.rule}` : 'none',
              borderBottom: i < 3 ? `1px solid ${A.rule}` : 'none',
              minHeight: 220,
              position: 'relative',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{ fontSize: 11, color: A.mute, letterSpacing: '0.2em' }}
              >
                ENEMY_{t.id}
              </div>
              <div
                style={{
                  fontSize: 10,
                  padding: '3px 8px',
                  background: t.tag === 'BOSS' ? A.hot : 'transparent',
                  color: t.tag === 'BOSS' ? A.bg : t.color,
                  border: t.tag === 'BOSS' ? 'none' : `1px solid ${t.color}`,
                  letterSpacing: '0.18em',
                  fontWeight: 700,
                }}
              >
                {t.tag}
              </div>
            </div>
            <h3
              style={{
                fontSize: 22,
                fontWeight: 700,
                margin: '14px 0 6px',
                letterSpacing: '-0.01em',
                color: t.color,
              }}
            >
              {t.name}
            </h3>
            <div
              style={{
                fontSize: 14,
                color: A.ink,
                fontWeight: 600,
                marginBottom: 12,
              }}
            >
              {t.short}
            </div>
            <p
              style={{
                fontSize: 13,
                color: A.body,
                margin: 0,
                lineHeight: 1.55,
              }}
            >
              {t.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ForgeProtocolSection() {
  return (
    <section id="forge" style={S.section}>
      <SectionHead
        num="§ 02 / FORGE_PROTOCOL"
        title="Seven steps from joystick to iNFT."
      />
      <div style={{ padding: '0 28px' }}>
        <div className="lp-table-row" style={{ ...S.tableHead }}>
          <div>STEP</div>
          <div>PHASE</div>
          <div>EVENT</div>
          <div>NOTES</div>
          <div style={{ textAlign: 'right' }}>STATUS</div>
        </div>
        {FORGE_FLOW.map(([d, t, ev, n, s], i) => (
          <div
            key={d}
            className="lp-table-row"
            style={{
              ...S.tableRow,
              borderBottom:
                i < FORGE_FLOW.length - 1 ? `1px dashed ${A.rule}` : 'none',
            }}
          >
            <div style={{ fontWeight: 700 }}>{d}</div>
            <div style={{ color: A.mute, fontVariantNumeric: 'tabular-nums' }}>
              {t}
            </div>
            <div style={{ fontWeight: s === 'critical' ? 700 : 500 }}>{ev}</div>
            <div style={{ color: A.body }}>{n}</div>
            <div
              style={{
                textAlign: 'right',
                color: STATUS_DISPLAY[s].color,
                fontSize: 10,
                letterSpacing: '0.2em',
                fontWeight: 700,
              }}
            >
              {STATUS_DISPLAY[s].label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SponsorPayloadSection() {
  return (
    <section id="sponsors" style={S.section}>
      <div
        className="lp-sponsor-split"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr' }}
      >
        <div
          style={{ padding: '60px 28px', borderRight: `1px solid ${A.rule}` }}
        >
          <div style={S.sectionEyebrow}>§ 03 / SPONSOR_PAYLOAD</div>
          <div style={S.bigNumber}>$25K</div>
          <div style={{ fontSize: 14, color: A.mute, marginTop: 8 }}>
            target — three load-bearing integrations, no cosmetic name-drops.
          </div>
          <p
            style={{
              fontSize: 14,
              color: A.body,
              maxWidth: 460,
              marginTop: 36,
              lineHeight: 1.55,
            }}
          >
            Each prize fits the product narrative.{' '}
            <span style={{ color: A.ink }}>0G</span> for the agent body and
            memory. <span style={{ color: A.ink }}>ENS</span> for a portable
            identity. <span style={{ color: A.ink }}>Uniswap</span> as the
            agent's first real on-chain action. Gensyn AXL and KeeperHub were
            dropped to keep depth over breadth.
          </p>
        </div>
        <div style={{ padding: '60px 28px' }}>
          <div style={S.sectionEyebrow}>BREAKDOWN · BY_PRIZE_WEIGHT</div>
          <div style={{ marginTop: 24 }}>
            {SPONSOR_PAYLOAD.map((s) => (
              <div key={s.code} style={{ marginBottom: 26 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 13,
                    marginBottom: 6,
                  }}
                >
                  <span>
                    <strong style={{ color: A.ink }}>{s.code}</strong>{' '}
                    <span style={{ color: A.mute }}>· {s.role}</span>
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      color: s.color,
                    }}
                  >
                    {s.prize}
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    background: '#181815',
                    position: 'relative',
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: `${s.weight}%`,
                      background: s.color,
                    }}
                  />
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: A.body,
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {s.body}
                </p>
                <div
                  style={{
                    fontSize: 11,
                    color: A.mute,
                    marginTop: 6,
                    letterSpacing: '0.04em',
                  }}
                >
                  → {s.where}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DifferentiationSection() {
  return (
    <section style={S.section}>
      <SectionHead
        num="§ 04 / DIFFERENTIATION"
        title="Why play, not configure."
      />
      <div style={{ padding: '0 28px 40px' }}>
        <div className="lp-diff-row" style={S.diffHead}>
          <span />
          <span>TRADITIONAL</span>
          <span style={{ color: A.acid }}>GR@DIUS_WEB3</span>
        </div>
        {DIFF_ROWS.map(([metric, bad, good], i) => (
          <div
            key={metric}
            className="lp-diff-row"
            style={{
              ...S.diffRow,
              borderBottom:
                i < DIFF_ROWS.length - 1 ? `1px dashed ${A.rule}` : 'none',
            }}
          >
            <span
              style={{ fontSize: 11, color: A.mute, letterSpacing: '0.18em' }}
            >
              {metric}
            </span>
            <span style={{ color: A.body, textDecoration: 'line-through' }}>
              {bad}
            </span>
            <span style={{ color: A.ink, fontWeight: 600 }}>{good}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SponsorsSection() {
  return (
    <section style={S.section}>
      <SectionHead
        num="§ 05 / STACK"
        title="Backed by the protocols we build on."
      />
      {SPONSOR_TIERS.map(([tier, list], idx) => (
        <div
          key={tier}
          style={{
            borderBottom:
              idx < SPONSOR_TIERS.length - 1 ? `1px solid ${A.rule}` : 'none',
          }}
        >
          <div style={S.tierLabel}>
            ── {tier} ─ ({list.length})
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${list.length}, 1fr)`,
            }}
          >
            {list.map((name, i) => (
              <div
                key={name}
                style={{
                  padding: tier === 'PRIMARY' ? '28px 8px' : '18px 8px',
                  borderRight:
                    i < list.length - 1 ? `1px solid ${A.rule}` : 'none',
                  fontSize:
                    tier === 'PRIMARY' ? 22 : tier === 'INFRA' ? 14 : 12,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textAlign: 'center',
                  color: tier === 'PRIMARY' ? A.ink : A.mute,
                }}
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

type ArcadeSectionProps = {
  disabled: boolean;
  onComplete: (log: PlayLog, a: Archetype) => void;
  error: string;
  submitting: boolean;
};

const ArcadeSection = forwardRef<HTMLDivElement, ArcadeSectionProps>(
  function ArcadeSection(
    { disabled, onComplete, error, submitting },
    ref: Ref<HTMLDivElement>
  ) {
    return (
      <section id="arcade" ref={ref} style={S.section}>
        <SectionHead
          num="§ 06 / ARCADE"
          title="Insert coin · 60 seconds · forge an agent."
          right="LIVE_DEMO"
        />
        <div style={{ padding: '24px 28px 40px' }}>
          <BirthArcade disabled={disabled} onComplete={onComplete} />
          {error ? <div style={S.errorBanner}>! {error}</div> : null}
          {submitting ? (
            <div style={S.statusBanner}>▸ FORGING_AGENT_FROM_PLAY_LOG…</div>
          ) : null}
        </div>
      </section>
    );
  }
);

function DashboardSection({
  birth,
  archetype,
}: { birth: StoredAgentBirth; archetype: Archetype }) {
  return (
    <section id="dashboard" style={S.section}>
      <SectionHead
        num="§ 07 / AGENT_DASHBOARD"
        title="Forged from your playstyle."
        right="OUTPUT"
      />
      <div style={{ padding: '24px 28px 40px' }}>
        <AgentDashboard birth={birth} archetype={archetype} />
      </div>
    </section>
  );
}

function CTASection({ onPlay }: { onPlay: () => void }) {
  return (
    <section style={S.cta}>
      <div style={{ padding: '80px 28px 60px', position: 'relative' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.2em', marginBottom: 16 }}>
          ▸ FINAL_CALL · NO_MENU · NO_CONFIG · 60s
        </div>
        <h2 style={S.ctaH2}>
          INSERT_
          <br />
          COIN.
        </h2>
        <div
          style={{
            marginTop: 40,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button type="button" style={S.ctaBtn} onClick={onPlay}>
            ► PLAY NOW
          </button>
          <span style={{ fontSize: 13, marginLeft: 8 }}>
            or read the spec at{' '}
            <a
              href="https://github.com/susumutomita/Gr-diusWeb3"
              target="_blank"
              rel="noreferrer"
              style={{ color: A.bg, textDecoration: 'underline' }}
            >
              github
            </a>
          </span>
        </div>
      </div>
    </section>
  );
}

function FooterBar() {
  return (
    <div className="lp-footer" style={S.footer}>
      <span>© 2026 GR@DIUS_WEB3 · MIT LICENSE · ETHGLOBAL</span>
      {FOOTER_LINKS.map(([label, href]) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noreferrer"
          style={S.footerLink}
        >
          {label}
        </a>
      ))}
    </div>
  );
}

function SectionHead({
  num,
  title,
  right,
}: { num: string; title: string; right?: string }) {
  return (
    <div style={S.sectionHead}>
      <div style={S.sectionEyebrow}>{num}</div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginTop: 12,
        }}
      >
        <h2 style={S.sectionH2}>{title}</h2>
        {right ? (
          <div style={{ fontSize: 11, color: A.mute, letterSpacing: '0.18em' }}>
            {right}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const S = {
  shell: {
    background: A.bg,
    color: A.ink,
    fontFamily: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace',
    fontSize: 13,
    lineHeight: 1.55,
    width: '100%',
    minHeight: '100vh',
    letterSpacing: '0.01em',
  },
  statusBar: {
    display: 'grid',
    gridTemplateColumns: '1.6fr repeat(5, auto) 1fr',
    gap: 22,
    padding: '8px 24px',
    borderBottom: `1px solid ${A.rule}`,
    background: 'linear-gradient(180deg, #07101a, #04080d)',
    fontSize: 10,
    color: A.mute,
    textTransform: 'uppercase',
    letterSpacing: '0.18em',
    alignItems: 'center',
  },
  nav: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto',
    alignItems: 'center',
    padding: '20px 28px',
    borderBottom: `1px solid ${A.rule}`,
    gap: 32,
  },
  logo: { fontSize: 18, fontWeight: 700, letterSpacing: '0.02em' },
  navLinks: {
    display: 'flex',
    gap: 24,
    fontSize: 12,
    color: A.mute,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  navLink: { color: A.mute, textDecoration: 'none', cursor: 'pointer' },
  applyBtn: {
    background: A.acid,
    color: A.bg,
    padding: '10px 18px',
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    border: 0,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  hero: {
    borderBottom: `1px solid ${A.rule}`,
    position: 'relative',
    overflow: 'hidden',
  },
  missionHeader: {
    padding: '0 28px',
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    alignItems: 'center',
    fontSize: 10,
    color: A.mute,
    letterSpacing: '0.24em',
    textTransform: 'uppercase',
  },
  heroStage: {
    position: 'relative',
    marginTop: 32,
    minHeight: 460,
  },
  fighterFrame: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    transform: 'rotate(-6deg)',
    filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.7))',
  },
  heroBanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    textAlign: 'center',
    pointerEvents: 'none',
    fontSize: 11,
    color: A.amber,
    letterSpacing: '0.5em',
  },
  heroLower: {
    position: 'relative',
    padding: '0 28px',
    marginTop: -40,
    display: 'grid',
    gridTemplateColumns: '1.3fr 1fr',
    gap: 60,
    alignItems: 'end',
  },
  eyebrow: {
    fontSize: 11,
    color: A.mute,
    letterSpacing: '0.2em',
    marginBottom: 28,
  },
  heroH1: {
    fontSize: 'clamp(56px, 8vw, 112px)',
    lineHeight: 0.92,
    margin: 0,
    fontWeight: 700,
    letterSpacing: '-0.03em',
    textShadow: `0 0 40px ${A.bg}`,
  },
  heroH1Italic: {
    color: A.hud,
    fontStyle: 'italic',
    fontFamily: '"Instrument Serif", Georgia, serif',
    fontWeight: 400,
    letterSpacing: '-0.01em',
  },
  amberBtn: {
    background: A.amber,
    color: '#000',
    padding: '18px 28px',
    fontFamily: 'inherit',
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    border: 0,
    cursor: 'pointer',
    boxShadow: `0 0 0 1px #000, 0 0 0 2px ${A.amber}`,
    display: 'inline-flex',
    alignItems: 'center',
  },
  cyanBtn: {
    background: 'transparent',
    color: A.hud,
    padding: '18px 24px',
    fontFamily: 'inherit',
    fontWeight: 600,
    fontSize: 13,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    border: `1px solid ${A.hud}`,
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
  },
  specCard: {
    border: `1px solid ${A.rule}`,
    background: 'rgba(8,16,24,0.78)',
    backdropFilter: 'blur(6px)',
    padding: 20,
    fontSize: 11,
    position: 'relative',
  },
  specStats: {
    marginTop: 16,
    paddingTop: 12,
    borderTop: `1px solid ${A.rule}`,
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
  },
  specForgeRow: {
    marginTop: 16,
    paddingTop: 12,
    borderTop: `1px solid ${A.rule}`,
  },
  heroLede: {
    maxWidth: 540,
    fontSize: 15,
    lineHeight: 1.55,
    color: A.body,
    marginTop: 32,
  },
  pilotForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 32,
    maxWidth: 360,
  },
  pilotLabel: { fontSize: 11, color: A.mute, letterSpacing: '0.2em' },
  pilotInput: {
    background: A.bgAlt,
    color: A.ink,
    border: `1px solid ${A.rule}`,
    padding: '12px 14px',
    fontFamily: 'inherit',
    fontSize: 14,
    letterSpacing: '0.04em',
  },
  countStrip: {
    marginTop: 56,
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    borderTop: `1px solid ${A.rule}`,
    borderBottom: `1px solid ${A.rule}`,
  },
  countNum: { fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' },
  countLabel: {
    fontSize: 10,
    color: A.mute,
    letterSpacing: '0.2em',
    marginTop: 4,
  },
  section: { borderBottom: `1px solid ${A.rule}` },
  sectionHead: {
    padding: '40px 28px 24px',
    borderBottom: `1px solid ${A.rule}`,
  },
  sectionEyebrow: { fontSize: 11, color: A.mute, letterSpacing: '0.2em' },
  sectionH2: {
    fontSize: 'clamp(32px, 4vw, 44px)',
    margin: 0,
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  gridThree: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' },
  tableHead: {
    display: 'grid',
    gridTemplateColumns: '90px 90px 1fr 2fr 80px',
    fontSize: 11,
    color: A.mute,
    letterSpacing: '0.2em',
    padding: '14px 0',
    borderBottom: `1px solid ${A.rule}`,
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '90px 90px 1fr 2fr 80px',
    padding: '16px 0',
    fontSize: 13,
    alignItems: 'center',
  },
  bigNumber: {
    fontSize: 'clamp(80px, 11vw, 160px)',
    fontWeight: 700,
    letterSpacing: '-0.04em',
    lineHeight: 0.9,
    marginTop: 18,
  },
  diffHead: {
    display: 'grid',
    gridTemplateColumns: '180px 1fr 1fr',
    gap: 24,
    padding: '14px 0',
    borderBottom: `1px solid ${A.rule}`,
    fontSize: 11,
    color: A.mute,
    letterSpacing: '0.2em',
  },
  diffRow: {
    display: 'grid',
    gridTemplateColumns: '180px 1fr 1fr',
    gap: 24,
    padding: '16px 0',
    fontSize: 13,
    alignItems: 'center',
  },
  tierLabel: {
    padding: '12px 28px',
    fontSize: 11,
    color: A.mute,
    letterSpacing: '0.2em',
    borderBottom: `1px dashed ${A.rule}`,
  },
  errorBanner: {
    marginTop: 16,
    padding: '12px 16px',
    border: `1px solid ${A.hot}`,
    color: A.hot,
    fontSize: 12,
    letterSpacing: '0.12em',
  },
  statusBanner: {
    marginTop: 16,
    padding: '12px 16px',
    border: `1px solid ${A.acid}`,
    color: A.acid,
    fontSize: 12,
    letterSpacing: '0.12em',
  },
  cta: { background: A.acid, color: A.bg },
  ctaH2: {
    fontSize: 'clamp(80px, 12vw, 180px)',
    fontWeight: 700,
    lineHeight: 0.9,
    letterSpacing: '-0.04em',
    margin: 0,
  },
  ctaBtn: {
    background: A.bg,
    color: A.acid,
    padding: '20px 32px',
    fontFamily: 'inherit',
    fontWeight: 700,
    fontSize: 15,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    border: 0,
    cursor: 'pointer',
  },
  footer: {
    background: A.bg,
    color: A.ink,
    borderTop: `1px solid ${A.bg}`,
    padding: '14px 28px',
    fontSize: 11,
    letterSpacing: '0.18em',
    display: 'grid',
    gridTemplateColumns: '1fr auto auto auto auto',
    gap: 24,
  },
  footerLink: { color: A.ink, textDecoration: 'none' },
} satisfies Record<string, CSSProperties>;
