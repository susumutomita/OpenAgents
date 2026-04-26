import {
  type Capsule,
  type PlayLog,
  capsuleAtBarPosition,
} from '@openagents/shared/browser';
import {
  type CSSProperties,
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { CHAINS, type ChainId } from '../game/chains';
import { drawBigText, pixelText } from '../game/font';
import { PAL, RH, RW } from '../game/palette';
import {
  ARCHETYPE_COLOR,
  ARCHETYPE_DESC,
  ARCHETYPE_LABEL,
  type Archetype,
  BAR_SLOTS,
  GAME_DURATION_FRAMES,
  type InputState,
  type SimulatedTrade,
  buildPlayLog,
  commit,
  createRuntime,
  deriveArchetype,
  getAllocation,
  render as renderRuntime,
  setChain,
  simulateTrades,
  step as stepRuntime,
} from '../game/runtime';
import {
  MOAI,
  MOAI_KEY,
  VIC_KEY,
  VIC_VIPER,
  drawSprite,
} from '../game/sprites';

interface BirthArcadeProps {
  disabled?: boolean;
  playerName: string;
  onComplete: (playLog: PlayLog, archetype: Archetype) => void | Promise<void>;
}

type Phase = 'title' | 'countdown' | 'play' | 'debrief';

const SCALE = 3;
const TITLE_BLINK_FRAMES = 32;

export function BirthArcade({
  disabled = false,
  playerName,
  onComplete,
}: BirthArcadeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<ReturnType<typeof createRuntime> | null>(null);
  const inputRef = useRef<InputState>({
    up: false,
    down: false,
    left: false,
    right: false,
    fire: false,
  });
  const phaseRef = useRef<Phase>('title');
  const onCompleteRef = useRef(onComplete);
  const [phase, setPhase] = useState<Phase>('title');
  const [tick, setTick] = useState(0);
  const [chain, setChainState] = useState<ChainId>('ARB');
  const [countdown, setCountdown] = useState(3);
  const [archetype, setArchetype] = useState<Archetype | null>(null);
  const [trades, setTrades] = useState<SimulatedTrade[]>([]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const startGame = useCallback(() => {
    if (disabled || phase !== 'title') return;
    setCountdown(3);
    setPhase('countdown');
  }, [disabled, phase]);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'countdown') return;
    const timers = [
      window.setTimeout(() => setCountdown(2), 700),
      window.setTimeout(() => setCountdown(1), 1400),
      window.setTimeout(() => {
        runtimeRef.current = createRuntime(chain);
        setPhase('play');
      }, 2100),
    ];
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [phase, chain]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = RW;
    canvas.height = RH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const FRAME = 1000 / 60;

    const titleStarsRuntime = createRuntime(chain);

    const onKey = (event: KeyboardEvent, down: boolean) => {
      const key = event.key.toLowerCase();
      if (
        ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)
      ) {
        event.preventDefault();
      }
      const inputs = inputRef.current;
      if (key === 'arrowup' || key === 'w') inputs.up = down;
      if (key === 'arrowdown' || key === 's') inputs.down = down;
      if (key === 'arrowleft' || key === 'a') inputs.left = down;
      if (key === 'arrowright' || key === 'd') inputs.right = down;
      if (key === ' ' || key === 'j') inputs.fire = down;
      if (down) {
        if (key === 'z' || key === 'enter') {
          const currentPhase = phaseRef.current;
          if (currentPhase === 'title') startGame();
          else if (currentPhase === 'play' && runtimeRef.current) {
            commit(runtimeRef.current);
          }
        }
      }
    };
    const onDown = (e: KeyboardEvent) => onKey(e, true);
    const onUp = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);

    const loop = (now: number) => {
      acc += now - last;
      last = now;
      while (acc >= FRAME) {
        const currentPhase = phaseRef.current;
        if (currentPhase === 'play') {
          const rt = runtimeRef.current;
          if (rt) {
            stepRuntime(rt, inputRef.current);
            if (rt.finished) {
              const arch = deriveArchetype(rt);
              setArchetype(arch);
              setTrades(simulateTrades(arch));
              setPhase('debrief');
              const log = buildPlayLog(rt, globalThis.crypto.randomUUID());
              void onCompleteRef.current(log, arch);
            }
          }
        } else {
          titleStarsRuntime.t += 1;
          for (const s of titleStarsRuntime.stars) {
            s.x -= s.speed * 0.018;
            if (s.x < 0) {
              s.x = RW;
              s.y = Math.random() * (RH - 24);
            }
          }
        }
        acc -= FRAME;
      }

      const currentPhase = phaseRef.current;
      if (currentPhase === 'play' && runtimeRef.current) {
        renderRuntime(ctx, runtimeRef.current);
      } else if (currentPhase === 'title') {
        renderTitle(ctx, titleStarsRuntime.t, titleStarsRuntime.stars);
      } else if (currentPhase === 'countdown') {
        renderCountdown(ctx, titleStarsRuntime.t, titleStarsRuntime.stars);
      } else if (currentPhase === 'debrief') {
        renderDebrief(
          ctx,
          titleStarsRuntime.t,
          titleStarsRuntime.stars,
          archetype
        );
      }

      setTick((value) => (value + 1) % 1024);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      cancelAnimationFrame(raf);
    };
  }, [archetype, chain, startGame]);

  const handleChainChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value as ChainId;
    setChainState(next);
    if (runtimeRef.current) setChain(runtimeRef.current, next);
  };

  const stageStyle: CSSProperties = {
    width: RW * SCALE,
    height: RH * SCALE,
    aspectRatio: `${RW} / ${RH}`,
  };

  return (
    <section className="panel arcade-panel">
      <div className="arcade-shell">
        <div className="arcade-controls-top">
          <div className="hint-pill">
            <span className="hint-key">←→↑↓ / WASD</span>
            <span className="hint-act">MOVE</span>
          </div>
          <div className="hint-pill">
            <span className="hint-key">SPACE</span>
            <span className="hint-act">FIRE</span>
          </div>
          <div className="hint-pill">
            <span className="hint-key">Z / ENTER</span>
            <span className="hint-act">COMMIT</span>
          </div>
          <div className="chain-pill">
            <label htmlFor="chain-select">CHAIN</label>
            <select
              id="chain-select"
              value={chain}
              onChange={handleChainChange}
              disabled={phase === 'play' || phase === 'countdown'}
            >
              {(Object.keys(CHAINS) as ChainId[]).map((id) => (
                <option key={id} value={id}>
                  {CHAINS[id].name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="crt crt-on" style={stageStyle}>
          <canvas
            ref={canvasRef}
            width={RW}
            height={RH}
            style={{
              width: '100%',
              height: '100%',
              imageRendering: 'pixelated',
              display: 'block',
            }}
          />
          <div className="crt-scanlines" />
          <div className="crt-vignette" />
          {phase === 'title' ? (
            <div className="arcade-overlay">
              <div className="arcade-card title-card">
                <div className="title-eyebrow">
                  PILOT · {playerName.trim() || 'ANON'}
                </div>
                <h3>INSERT 1 COIN · DESIGN AN AGENT IN 60s</h3>
                <p>
                  Shoot to choose, dodge to commit. Every action shapes a real
                  on-chain DeFi portfolio for the agent you're forging.
                </p>
                <div className="archetype-row">
                  <div
                    className="archetype-chip"
                    style={{ borderColor: PAL.ringCyan }}
                  >
                    <span>CONSERVATIVE</span>
                    <small>USDC · multi-sig · stop-loss</small>
                  </div>
                  <div
                    className="archetype-chip"
                    style={{ borderColor: PAL.shipFlame }}
                  >
                    <span>BALANCED</span>
                    <small>ETH · ARB · rotating yield</small>
                  </div>
                  <div
                    className="archetype-chip"
                    style={{ borderColor: PAL.warn }}
                  >
                    <span>AGGRESSIVE</span>
                    <small>memecoins · leverage · all-in</small>
                  </div>
                </div>
                <button
                  type="button"
                  className="primary-button"
                  onClick={startGame}
                  disabled={disabled}
                >
                  PRESS Z · INSERT COIN
                </button>
              </div>
            </div>
          ) : null}
          {phase === 'debrief' && archetype ? (
            <div className="arcade-overlay arcade-debrief">
              <div className="arcade-card debrief-card">
                <div
                  className="debrief-header"
                  style={{ color: ARCHETYPE_COLOR[archetype] }}
                >
                  <span className="debrief-eyebrow">PORTFOLIO LOCKED</span>
                  <h3>{ARCHETYPE_LABEL[archetype]} AGENT</h3>
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
                <div className="trade-feed">
                  <div className="trade-feed-title">
                    AGENT IS LIVE · LAST 6 TX
                  </div>
                  <ul>
                    {trades.map((trade, idx) => (
                      <li key={`${trade.pair}-${idx}`}>
                        <span className="trade-time">T+{trade.t}s</span>
                        <span className="trade-pair">{trade.pair}</span>
                        <span className="trade-amount">{trade.amount}</span>
                        <span
                          className="trade-pct"
                          style={{ color: trade.color }}
                        >
                          {trade.result}
                          {trade.pct}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="debrief-hint">
                  AGENT FORGED ON {CHAINS[chain].name} · TX HASH STREAMING ↓
                </div>
              </div>
            </div>
          ) : null}
          {phase === 'countdown' ? (
            <div className="arcade-overlay arcade-countdown">
              <div>{countdown}</div>
              <small>STAND BY</small>
            </div>
          ) : null}
        </div>
        {phase === 'play' && runtimeRef.current ? (
          <ArcadeStatus
            tick={tick}
            durationFrames={GAME_DURATION_FRAMES}
            runtime={runtimeRef.current}
          />
        ) : null}
      </div>
    </section>
  );
}

interface ArcadeStatusProps {
  tick: number;
  durationFrames: number;
  runtime: ReturnType<typeof createRuntime>;
}

function ArcadeStatus({
  runtime,
  durationFrames,
  tick: _tick,
}: ArcadeStatusProps) {
  const sec = Math.max(0, Math.ceil((durationFrames - runtime.t) / 60));
  const slot = runtime.bar >= 0 ? capsuleAtBarPosition(runtime.bar) : null;
  return (
    <div className="arcade-status">
      <div>
        <span>TIME</span>
        <strong>{String(sec).padStart(2, '0')}s</strong>
      </div>
      <div>
        <span>HULL</span>
        <strong>{runtime.player.hp}</strong>
      </div>
      <div>
        <span>SCORE</span>
        <strong>{runtime.score.toLocaleString()}</strong>
      </div>
      <div>
        <span>BAR</span>
        <strong>{slot ? capsuleEmoji(slot) : '—'}</strong>
      </div>
      <div>
        <span>COMMITS</span>
        <strong>
          {Object.values(runtime.commits).reduce((a, b) => a + b, 0)}
        </strong>
      </div>
      <div>
        <span>MOAI</span>
        <strong>{runtime.moaisDown}/5</strong>
      </div>
    </div>
  );
}

function capsuleEmoji(c: Capsule) {
  switch (c) {
    case 'speed':
      return 'SPD';
    case 'missile':
      return 'MIS';
    case 'double':
      return 'DBL';
    case 'laser':
      return 'LSR';
    case 'option':
      return 'OPT';
    case 'shield':
      return 'SHD';
  }
}

function renderTitle(
  ctx: CanvasRenderingContext2D,
  t: number,
  stars: ReturnType<typeof createRuntime>['stars']
) {
  ctx.fillStyle = PAL.black;
  ctx.fillRect(0, 0, RW, RH);
  for (const s of stars) {
    ctx.fillStyle = s.bright ? PAL.starBright : PAL.starDim;
    ctx.fillRect(s.x | 0, s.y | 0, 1, 1);
  }

  // Demo Vic Viper drift
  const px = ((t * 0.4) % (RW + 24)) - 24;
  drawSprite(ctx, VIC_VIPER, VIC_KEY, px | 0, RH / 2 - 6);
  // Moai watching
  drawSprite(ctx, MOAI, MOAI_KEY, RW - 56, 80);

  // Big banner
  drawBigText(ctx, 'GR@DIUS', RW / 2 - 42, 30, PAL.hudYellow);
  drawBigText(ctx, ' WEB 3', RW / 2 - 42, 56, PAL.ringCyan);
  pixelText(ctx, 'PLAY TO DESIGN AGENTS', RW / 2 - 60, 82, PAL.shipWhite);
  pixelText(ctx, 'KONAMI HOMAGE  ORIGINAL ART', RW / 2 - 78, 98, PAL.starDim);

  // Beat hint
  if ((t >> 5) % 2 === 0) {
    pixelText(ctx, 'PRESS Z TO INSERT COIN', RW / 2 - 66, 200, PAL.hudOrange);
  }
}

function renderCountdown(
  ctx: CanvasRenderingContext2D,
  _t: number,
  stars: ReturnType<typeof createRuntime>['stars']
) {
  ctx.fillStyle = PAL.black;
  ctx.fillRect(0, 0, RW, RH);
  for (const s of stars) {
    ctx.fillStyle = s.bright ? PAL.starBright : PAL.starDim;
    ctx.fillRect(s.x | 0, s.y | 0, 1, 1);
  }
  drawBigText(ctx, 'STAGE 1', RW / 2 - 42, 90, PAL.hudYellow);
  pixelText(ctx, 'MOAI · WEB3 ONBOARDING', RW / 2 - 66, 116, PAL.shipWhite);
}

function renderDebrief(
  ctx: CanvasRenderingContext2D,
  t: number,
  stars: ReturnType<typeof createRuntime>['stars'],
  archetype: Archetype | null
) {
  ctx.fillStyle = PAL.black;
  ctx.fillRect(0, 0, RW, RH);
  for (const s of stars) {
    s.x -= s.speed * 0.018;
    if (s.x < 0) {
      s.x = RW;
      s.y = Math.random() * RH;
    }
    ctx.fillStyle = s.bright ? PAL.starBright : PAL.starDim;
    ctx.fillRect(s.x | 0, s.y | 0, 1, 1);
  }
  drawBigText(ctx, 'STAGE CLEAR', RW / 2 - 66, 60, PAL.hudYellow);
  if (archetype) {
    pixelText(
      ctx,
      `${ARCHETYPE_LABEL[archetype]} AGENT DEPLOYED`,
      RW / 2 - 84,
      100,
      ARCHETYPE_COLOR[archetype]
    );
  }
  pixelText(ctx, 'AGENT IS NOW TRADING', RW / 2 - 60, 120, PAL.shipWhite);
  // Animate ship flying off to "trade"
  const px = (t * 1.5) % (RW + 80);
  drawSprite(ctx, VIC_VIPER, VIC_KEY, px | 0, 150);
}

// Keep existing barslots constant exported for callers wanting label
export { BAR_SLOTS };
