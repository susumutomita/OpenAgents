import type { PlayLog } from '@openagents/shared/browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { drawBigText, pixelText } from '../game/font';
import { PAL, RH, RW } from '../game/palette';
import {
  ARCHETYPE_COLOR,
  ARCHETYPE_DESC,
  ARCHETYPE_GLYPH,
  ARCHETYPE_LABEL,
  type Archetype,
  GAME_DURATION_FRAMES,
  type InputState,
  type SimulatedTrade,
  buildPlayLog,
  createRuntime,
  deriveArchetype,
  getAllocation,
  render as renderRuntime,
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

type Phase = 'idle' | 'play' | 'debrief';

const SCALE = 3;
const RESTART_DELAY = 2400;

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
  });
  const phaseRef = useRef<Phase>('idle');
  const onCompleteRef = useRef(onComplete);
  const titleTRef = useRef(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [archetype, setArchetype] = useState<Archetype | null>(null);
  const [trades, setTrades] = useState<SimulatedTrade[]>([]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const startGame = useCallback(() => {
    if (disabled) return;
    runtimeRef.current = createRuntime();
    setArchetype(null);
    setTrades([]);
    setPhase('play');
  }, [disabled]);

  const replay = useCallback(() => {
    runtimeRef.current = createRuntime();
    setPhase('play');
  }, []);

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
    const titleStars = createRuntime();

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
      if (down && phaseRef.current === 'idle') {
        if (
          key === ' ' ||
          key === 'enter' ||
          key === 'z' ||
          key.startsWith('arrow') ||
          key === 'w' ||
          key === 'a' ||
          key === 's' ||
          key === 'd'
        ) {
          startGame();
        }
      } else if (down && phaseRef.current === 'debrief') {
        if (key === ' ' || key === 'enter' || key === 'z') {
          replay();
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
        if (currentPhase === 'play' && runtimeRef.current) {
          stepRuntime(runtimeRef.current, inputRef.current);
          if (runtimeRef.current.finished) {
            const arch = deriveArchetype(runtimeRef.current);
            setArchetype(arch);
            setTrades(simulateTrades(arch));
            setPhase('debrief');
            const log = buildPlayLog(
              runtimeRef.current,
              globalThis.crypto.randomUUID()
            );
            void onCompleteRef.current(log, arch);
          }
        } else {
          titleTRef.current += 1;
          for (const s of titleStars.stars) {
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
      } else if (currentPhase === 'idle') {
        renderTitle(ctx, titleTRef.current, titleStars.stars);
      } else if (currentPhase === 'debrief') {
        renderDebrief(ctx, titleTRef.current, titleStars.stars, archetype);
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      cancelAnimationFrame(raf);
    };
  }, [archetype, replay, startGame]);

  // Auto-restart back to title after debrief idle
  useEffect(() => {
    if (phase !== 'debrief') return;
    const timer = window.setTimeout(() => {
      setPhase('idle');
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const stageStyle = {
    width: RW * SCALE,
    height: RH * SCALE,
    aspectRatio: `${RW} / ${RH}`,
  } as const;

  void RESTART_DELAY;
  void playerName;

  return (
    <section className="panel arcade-panel arcade-panel-clean">
      <div className="arcade-shell">
        <div className="arcade-controls-top">
          <span className="hint-pill">
            <span className="hint-key">←→↑↓ / WASD</span>
            <span className="hint-act">MOVE</span>
          </span>
          <span className="hint-pill">
            <span className="hint-key">AUTO</span>
            <span className="hint-act">FIRE</span>
          </span>
          <span className="hint-pill subtle">No buttons. Just move.</span>
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
          {phase === 'idle' ? (
            <button
              type="button"
              className="arcade-press-start"
              onClick={startGame}
              disabled={disabled}
            >
              ▶ PRESS ANY KEY
            </button>
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
                <button
                  type="button"
                  className="primary-button"
                  onClick={replay}
                  disabled={disabled}
                >
                  ▶ INSERT 1 MORE COIN
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <p className="arcade-tagline">
          The agent you forge mirrors how you played.
          <strong> No manual. No menu. Just play.</strong>
        </p>
      </div>
    </section>
  );
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

  // Floating Vic Viper across screen
  const px = ((t * 0.4) % (RW + 24)) - 24;
  drawSprite(ctx, VIC_VIPER, VIC_KEY, px | 0, RH / 2 - 6);

  // Demo enemies in 3 colors so the player sees what they'll shoot
  drawDemoSquadron(ctx, t);

  // Moai watching
  drawSprite(ctx, MOAI, MOAI_KEY, RW - 56, 80);

  // Title
  drawBigText(ctx, 'GR@DIUS', RW / 2 - 42, 30, PAL.hudYellow);
  drawBigText(ctx, ' WEB 3', RW / 2 - 42, 56, PAL.ringCyan);
  pixelText(ctx, 'PLAY 60S → AGENT IS BORN', RW / 2 - 72, 82, PAL.shipWhite);

  if ((t >> 5) % 2 === 0) {
    pixelText(ctx, 'PRESS ANY KEY', RW / 2 - 36, 200, PAL.hudOrange);
  }
}

function drawDemoSquadron(ctx: CanvasRenderingContext2D, t: number) {
  const colors = [
    { color: '#7bdff2', label: 'SAFE' },
    { color: '#f8d840', label: ' MID' },
    { color: '#ff5252', label: 'RISK' },
  ];
  for (let i = 0; i < colors.length; i += 1) {
    const c = colors[i];
    if (!c) continue;
    const x = 40 + i * 60 + Math.sin((t + i * 30) * 0.05) * 6;
    const y = 110 + Math.cos((t + i * 20) * 0.05) * 8;
    ctx.fillStyle = c.color;
    ctx.fillRect((x | 0) - 6, (y | 0) - 4, 12, 8);
    ctx.fillStyle = '#fefae0';
    ctx.fillRect((x | 0) - 3, (y | 0) - 2, 6, 4);
    pixelText(ctx, c.label, (x | 0) - 9, (y | 0) + 6, c.color);
  }
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
  drawBigText(ctx, 'STAGE CLEAR', RW / 2 - 66, 50, PAL.hudYellow);
  if (archetype) {
    pixelText(
      ctx,
      `${ARCHETYPE_LABEL[archetype]} AGENT FORGED`,
      RW / 2 - 78,
      90,
      ARCHETYPE_COLOR[archetype]
    );
    pixelText(
      ctx,
      `WINNING VOTE  ${ARCHETYPE_GLYPH[archetype]}`,
      RW / 2 - 60,
      106,
      PAL.shipWhite
    );
  }
  const px = (t * 1.5) % (RW + 80);
  drawSprite(ctx, VIC_VIPER, VIC_KEY, px | 0, 150);
}
