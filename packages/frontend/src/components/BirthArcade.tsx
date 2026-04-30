import type { PlayLog } from '@gradiusweb3/shared/browser';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { drawBigText, pixelText } from '../game/font';
import { PAL, RH, RW } from '../game/palette';
import {
  ARCHETYPE_COLOR,
  ARCHETYPE_DESC,
  ARCHETYPE_GLYPH,
  ARCHETYPE_LABEL,
  type Archetype,
  CAPABILITY_COLOR,
  CAPABILITY_LABEL,
  CAPABILITY_ORDER,
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
import { prewarmSfx } from '../game/sfx';
import { VIC_KEY, VIC_VIPER, drawSprite } from '../game/sprites';
import { AgentHandleLabel } from './HUD';
import {
  MisalignmentToast,
  type MisalignmentToastQueueItem,
} from './MisalignmentToast';
import { GAME_START_EVENT } from './MusicPlayer';

interface BirthArcadeProps {
  disabled?: boolean;
  handle: string;
  parentName: string;
  onComplete: (playLog: PlayLog, archetype: Archetype) => void | Promise<void>;
}

type Phase = 'idle' | 'play' | 'debrief';

const SCALE = 3;

const TITLE_MODULE_DESC = {
  shield: 'CIRCUIT',
  speed: 'L2 FAST',
  option: 'AXL PEER',
  laser: '0G LOGIC',
  missile: 'UNI ROUTE',
} as const;

export function BirthArcade({
  disabled = false,
  handle,
  parentName,
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
  // demo モード: ?seed=demo を URL に付けると敵 wave が 4 種 misalignment を
  // 確実に最初に出すよう DEMO_CAPABILITY_ORDER で固定される (Persona Y 指摘)。
  const seed = useMemo<'demo' | 'random'>(() => {
    if (typeof window === 'undefined') return 'random';
    return new URLSearchParams(window.location.search).get('seed') === 'demo'
      ? 'demo'
      : 'random';
  }, []);
  const [phase, setPhase] = useState<Phase>('idle');
  const [archetype, setArchetype] = useState<Archetype | null>(null);
  const [trades, setTrades] = useState<SimulatedTrade[]>([]);
  const [currentToast, setCurrentToast] =
    useState<MisalignmentToastQueueItem | null>(null);
  const currentToastIdRef = useRef<number | null>(null);
  const onConsumed = useCallback(() => {
    currentToastIdRef.current = null;
    setCurrentToast(null);
  }, []);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const startGame = useCallback(() => {
    if (disabled) return;
    runtimeRef.current = createRuntime(undefined, seed);
    setArchetype(null);
    setTrades([]);
    prewarmSfx();
    window.dispatchEvent(new Event(GAME_START_EVENT));
    setPhase('play');
  }, [disabled, seed]);

  const replay = useCallback(() => {
    runtimeRef.current = createRuntime(undefined, seed);
    prewarmSfx();
    window.dispatchEvent(new Event(GAME_START_EVENT));
    setPhase('play');
  }, [seed]);

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
          // misalignment toast: 表示中でなければ次のキューを取り出す
          if (!currentToastIdRef.current) {
            const next = runtimeRef.current.misalignmentToasts.shift();
            if (next) {
              currentToastIdRef.current = next.id;
              setCurrentToast({ id: next.id, kind: next.kind });
            }
          }
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
          {phase === 'play' ? (
            <AgentHandleLabel handle={handle} parent={parentName} />
          ) : null}
          {phase === 'play' ? (
            <MisalignmentToast current={currentToast} onConsumed={onConsumed} />
          ) : null}
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
                  <span className="debrief-eyebrow">AGENT POLICY LOCKED</span>
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
          Every kill commits an Agent module into the policy.
          <strong> No menu. No config form. Just play.</strong>
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

  // Demo modules so the player sees what each target means.
  drawDemoSquadron(ctx, t);

  // Title
  drawBigText(ctx, 'GR@DIUS', RW / 2 - 42, 30, PAL.hudYellow);
  drawBigText(ctx, ' WEB 3', RW / 2 - 42, 56, PAL.ringCyan);
  pixelText(ctx, 'SHOOT MODULES -> POLICY', RW / 2 - 72, 82, PAL.shipWhite);
  pixelText(ctx, 'PLAY 60S -> AGENT IS BORN', RW / 2 - 72, 94, PAL.hudYellow);

  if ((t >> 5) % 2 === 0) {
    pixelText(ctx, 'PRESS ANY KEY', RW / 2 - 36, 200, PAL.hudOrange);
  }
}

function drawDemoSquadron(ctx: CanvasRenderingContext2D, t: number) {
  ctx.fillStyle = 'rgba(0, 16, 42, 0.82)';
  ctx.fillRect(14, 112, 228, 62);
  pixelText(ctx, 'TARGETS ARE AGENT MODULES', 42, 118, PAL.hudYellow);

  for (let i = 0; i < CAPABILITY_ORDER.length; i += 1) {
    const capability = CAPABILITY_ORDER[i];
    if (!capability) continue;
    const column = i < 3 ? 0 : 1;
    const row = i < 3 ? i : i - 3;
    const x = 28 + column * 112;
    const y = 134 + row * 13 + Math.sin((t + i * 30) * 0.05) * 1.5;
    ctx.fillStyle = CAPABILITY_COLOR[capability];
    ctx.fillRect((x | 0) - 8, (y | 0) - 2, 8, 6);
    ctx.fillStyle = '#fefae0';
    ctx.fillRect((x | 0) - 6, y | 0, 4, 2);
    pixelText(
      ctx,
      CAPABILITY_LABEL[capability],
      x | 0,
      y | 0,
      CAPABILITY_COLOR[capability]
    );
    pixelText(
      ctx,
      TITLE_MODULE_DESC[capability],
      (x | 0) + 48,
      y | 0,
      PAL.hudWhite
    );
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
      `EXEC MODE  ${ARCHETYPE_GLYPH[archetype]}`,
      RW / 2 - 60,
      106,
      PAL.shipWhite
    );
  }
  const px = (t * 1.5) % (RW + 80);
  drawSprite(ctx, VIC_VIPER, VIC_KEY, px | 0, 150);
}
