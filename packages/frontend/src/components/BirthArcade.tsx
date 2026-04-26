import {
  type Capsule,
  MOAI_IDS,
  MOAI_SPECIALTIES,
  type MoaiId,
  type PlayLog,
  SLOT_CAPSULES,
  TRADEOFF_LABELS,
  capsuleAtBarPosition,
} from '@openagents/shared/browser';
import { startTransition, useEffect, useMemo, useRef, useState } from 'react';

interface BirthArcadeProps {
  disabled?: boolean;
  playerName: string;
  onComplete: (playLog: PlayLog) => void | Promise<void>;
}

interface Bullet {
  id: string;
  x: number;
  y: number;
}

interface Enemy {
  id: string;
  x: number;
  y: number;
  hp: number;
  speed: number;
  kind: 'enemy' | 'boss';
  label: string;
  capsule: Capsule;
  moaiId?: MoaiId;
}

interface FloatingCapsule {
  id: string;
  x: number;
  y: number;
  speed: number;
  capsule: Capsule;
}

interface RuntimeState {
  startAt: number;
  lastFrameAt: number;
  finished: boolean;
  nextEnemyAt: number;
  nextBossAt: number;
  nextShotAt: number;
  lastCommitAt: number;
  enemySequence: number;
  bossSequence: number;
  capsuleSequence: number;
  player: { x: number; y: number };
  bullets: Bullet[];
  enemies: Enemy[];
  floatingCapsules: FloatingCapsule[];
  score: number;
  health: number;
  barPosition: number;
  events: PlayLog['events'];
}

interface ArcadeSnapshot {
  phase: 'idle' | 'running' | 'finished';
  score: number;
  health: number;
  timeLeftMs: number;
  barPosition: number;
  currentSlot: Capsule;
  activeBoss: string;
}

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const GAME_DURATION_MS = 45000;
const PLAYER_SPEED = 280;
const BULLET_SPEED = 540;
const ENEMY_WIDTH = 72;
const ENEMY_HEIGHT = 32;
const BOSS_WIDTH = 126;
const BOSS_HEIGHT = 126;

const CAPSULE_COLORS: Record<Capsule, string> = {
  speed: '#ffd166',
  missile: '#7bdff2',
  double: '#ff6b6b',
  laser: '#9b5de5',
  option: '#00f5d4',
  shield: '#94d2bd',
};

function createRuntimeState(): RuntimeState {
  return {
    startAt: 0,
    lastFrameAt: 0,
    finished: false,
    nextEnemyAt: 0,
    nextBossAt: 7000,
    nextShotAt: 0,
    lastCommitAt: -1000,
    enemySequence: 0,
    bossSequence: 0,
    capsuleSequence: 0,
    player: { x: 120, y: CANVAS_HEIGHT / 2 },
    bullets: [],
    enemies: [],
    floatingCapsules: [],
    score: 0,
    health: 5,
    barPosition: 0,
    events: [],
  };
}

function tradeoffAtIndex(index: number) {
  const label = TRADEOFF_LABELS[index % TRADEOFF_LABELS.length];

  if (!label) {
    throw new Error(`Invalid tradeoff index: ${index}`);
  }

  return label;
}

function moaiAtIndex(index: number): MoaiId {
  const moaiId = MOAI_IDS[index];

  if (!moaiId) {
    throw new Error(`Invalid moai index: ${index}`);
  }

  return moaiId;
}

function intersects(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number }
) {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

function drawBackground(context: CanvasRenderingContext2D) {
  const gradient = context.createLinearGradient(
    0,
    0,
    CANVAS_WIDTH,
    CANVAS_HEIGHT
  );
  gradient.addColorStop(0, '#081420');
  gradient.addColorStop(0.5, '#13293d');
  gradient.addColorStop(1, '#601848');

  context.fillStyle = gradient;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  context.globalAlpha = 0.25;
  for (let index = 0; index < 32; index += 1) {
    const x = (index * 31) % CANVAS_WIDTH;
    const y = (index * 53) % CANVAS_HEIGHT;
    context.fillStyle = '#f1faee';
    context.fillRect(x, y, 2, 2);
  }
  context.globalAlpha = 1;

  context.fillStyle = 'rgba(212, 163, 115, 0.14)';
  for (let index = 0; index < 5; index += 1) {
    const offsetX = 140 + index * 190;
    context.beginPath();
    context.arc(offsetX, 430, 58, Math.PI, 0);
    context.lineTo(offsetX + 58, 520);
    context.lineTo(offsetX - 58, 520);
    context.closePath();
    context.fill();

    context.fillStyle = 'rgba(239, 210, 171, 0.1)';
    context.fillRect(offsetX - 12, 410, 8, 8);
    context.fillRect(offsetX + 4, 410, 8, 8);
    context.fillStyle = 'rgba(212, 163, 115, 0.14)';
  }
}

function drawPlayer(context: CanvasRenderingContext2D, x: number, y: number) {
  context.fillStyle = '#fefae0';
  context.beginPath();
  context.moveTo(x + 26, y + 12);
  context.lineTo(x, y);
  context.lineTo(x, y + 24);
  context.closePath();
  context.fill();

  context.fillStyle = '#ff8fab';
  context.fillRect(x - 6, y + 8, 10, 8);
}

function drawEnemy(context: CanvasRenderingContext2D, enemy: Enemy) {
  if (enemy.kind === 'boss') {
    context.fillStyle = '#b08968';
    context.fillRect(enemy.x, enemy.y, BOSS_WIDTH, BOSS_HEIGHT);
    context.fillStyle = '#e6ccb2';
    context.fillRect(enemy.x + 24, enemy.y + 26, 18, 18);
    context.fillRect(enemy.x + 82, enemy.y + 26, 18, 18);
    context.strokeStyle = 'rgba(251, 133, 0, 0.7)';
    context.lineWidth = 3;
    context.beginPath();
    context.arc(
      enemy.x + BOSS_WIDTH / 2,
      enemy.y + BOSS_HEIGHT / 2,
      40,
      0,
      Math.PI * 2
    );
    context.stroke();
  } else {
    context.fillStyle = '#ff7b72';
    context.fillRect(enemy.x, enemy.y, ENEMY_WIDTH, ENEMY_HEIGHT);
  }

  context.fillStyle = '#fefae0';
  context.font =
    enemy.kind === 'boss'
      ? "600 15px 'Space Grotesk', sans-serif"
      : "600 12px 'Space Grotesk', sans-serif";
  context.fillText(enemy.label, enemy.x, enemy.y - 8);
}

function drawCapsule(
  context: CanvasRenderingContext2D,
  capsule: FloatingCapsule
) {
  context.fillStyle = CAPSULE_COLORS[capsule.capsule];
  context.beginPath();
  context.moveTo(capsule.x + 8, capsule.y);
  context.lineTo(capsule.x + 16, capsule.y + 8);
  context.lineTo(capsule.x + 8, capsule.y + 16);
  context.lineTo(capsule.x, capsule.y + 8);
  context.closePath();
  context.fill();
}

export function BirthArcade({
  disabled = false,
  playerName,
  onComplete,
}: BirthArcadeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const runtimeRef = useRef<RuntimeState | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const onCompleteRef = useRef(onComplete);
  const [snapshot, setSnapshot] = useState<ArcadeSnapshot>({
    phase: 'idle',
    score: 0,
    health: 5,
    timeLeftMs: GAME_DURATION_MS,
    barPosition: 0,
    currentSlot: capsuleAtBarPosition(0),
    activeBoss: 'none',
  });

  const commitLabel = useMemo(
    () => capsuleAtBarPosition(snapshot.barPosition).toUpperCase(),
    [snapshot.barPosition]
  );

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (snapshot.phase !== 'running') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      keysRef.current[event.key.toLowerCase()] = true;

      if (event.key === 'Enter' && runtimeRef.current) {
        const runtime = runtimeRef.current;
        const now = performance.now();

        if (now - runtime.lastCommitAt > 600) {
          const currentSlot = capsuleAtBarPosition(runtime.barPosition);
          runtime.events.push({
            kind: 'commit',
            t: Math.round(now - runtime.startAt),
            position: runtime.barPosition,
            capsule: currentSlot,
          });
          runtime.lastCommitAt = now;
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keysRef.current[event.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const tick = (timestamp: number) => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      const runtime = runtimeRef.current;

      if (!canvas || !context || !runtime) {
        return;
      }

      if (runtime.finished) {
        return;
      }

      if (runtime.startAt === 0) {
        runtime.startAt = timestamp;
        runtime.lastFrameAt = timestamp;
        runtime.nextEnemyAt = timestamp + 800;
      }

      const elapsedMs = timestamp - runtime.startAt;
      const deltaSeconds = (timestamp - runtime.lastFrameAt) / 1000;
      runtime.lastFrameAt = timestamp;

      const movementX =
        (keysRef.current.arrowright || keysRef.current.d ? 1 : 0) -
        (keysRef.current.arrowleft || keysRef.current.a ? 1 : 0);
      const movementY =
        (keysRef.current.arrowdown || keysRef.current.s ? 1 : 0) -
        (keysRef.current.arrowup || keysRef.current.w ? 1 : 0);

      runtime.player.x = Math.min(
        Math.max(
          runtime.player.x + movementX * PLAYER_SPEED * deltaSeconds,
          32
        ),
        CANVAS_WIDTH - 120
      );
      runtime.player.y = Math.min(
        Math.max(
          runtime.player.y + movementY * PLAYER_SPEED * deltaSeconds,
          24
        ),
        CANVAS_HEIGHT - 40
      );

      if (
        (keysRef.current[' '] || keysRef.current.j) &&
        timestamp >= runtime.nextShotAt
      ) {
        runtime.bullets.push({
          id: `bullet-${timestamp}`,
          x: runtime.player.x + 20,
          y: runtime.player.y + 10,
        });
        runtime.nextShotAt = timestamp + 180;
      }

      if (timestamp >= runtime.nextEnemyAt) {
        const sequence = runtime.enemySequence;
        runtime.enemies.push({
          id: `enemy-${sequence}`,
          x: CANVAS_WIDTH + 24,
          y: 80 + ((sequence * 73) % 320),
          hp: 1,
          speed: 120 + (sequence % 4) * 20,
          kind: 'enemy',
          label: tradeoffAtIndex(sequence),
          capsule: capsuleAtBarPosition(sequence),
        });
        runtime.enemySequence += 1;
        runtime.nextEnemyAt = timestamp + 1400;
      }

      if (
        timestamp >= runtime.nextBossAt &&
        runtime.bossSequence < MOAI_IDS.length
      ) {
        const moaiId = moaiAtIndex(runtime.bossSequence);
        runtime.enemies.push({
          id: `boss-${moaiId}`,
          x: CANVAS_WIDTH - 180,
          y: 90 + runtime.bossSequence * 66,
          hp: 12,
          speed: 40,
          kind: 'boss',
          label: `${moaiId.toUpperCase()} Moai`,
          capsule: MOAI_SPECIALTIES[moaiId],
          moaiId,
        });
        runtime.bossSequence += 1;
        runtime.nextBossAt = timestamp + 9000;
      }

      runtime.bullets = runtime.bullets
        .map((bullet) => ({
          ...bullet,
          x: bullet.x + BULLET_SPEED * deltaSeconds,
        }))
        .filter((bullet) => bullet.x < CANVAS_WIDTH + 30);

      for (const bullet of runtime.bullets) {
        for (const enemy of runtime.enemies) {
          const hitbox =
            enemy.kind === 'boss'
              ? {
                  x: enemy.x,
                  y: enemy.y,
                  width: BOSS_WIDTH,
                  height: BOSS_HEIGHT,
                }
              : {
                  x: enemy.x,
                  y: enemy.y,
                  width: ENEMY_WIDTH,
                  height: ENEMY_HEIGHT,
                };

          if (
            intersects(
              { x: bullet.x, y: bullet.y, width: 18, height: 4 },
              hitbox
            )
          ) {
            enemy.hp -= 1;
            bullet.x = CANVAS_WIDTH + 50;
          }
        }
      }

      const nextEnemies: Enemy[] = [];
      const nextCapsules = [...runtime.floatingCapsules];

      for (const enemy of runtime.enemies) {
        enemy.x -= enemy.speed * deltaSeconds;

        if (enemy.hp <= 0) {
          if (enemy.kind === 'boss' && enemy.moaiId) {
            runtime.events.push({
              kind: 'moaiKill',
              t: Math.round(elapsedMs),
              moaiId: enemy.moaiId,
            });
            nextCapsules.push(
              {
                id: `${enemy.id}-capsule-a`,
                x: enemy.x + 24,
                y: enemy.y + 32,
                speed: 90,
                capsule: MOAI_SPECIALTIES[enemy.moaiId],
              },
              {
                id: `${enemy.id}-capsule-b`,
                x: enemy.x + 72,
                y: enemy.y + 72,
                speed: 90,
                capsule: capsuleAtBarPosition(runtime.capsuleSequence),
              }
            );
          } else {
            runtime.events.push({
              kind: 'shoot',
              t: Math.round(elapsedMs),
              enemyId: enemy.id,
              tradeoffLabel: enemy.label,
            });
            nextCapsules.push({
              id: `${enemy.id}-capsule`,
              x: enemy.x,
              y: enemy.y,
              speed: 110,
              capsule: enemy.capsule,
            });
          }

          runtime.capsuleSequence += 1;
          runtime.score += enemy.kind === 'boss' ? 900 : 120;
          continue;
        }

        if (enemy.x < -160) {
          if (enemy.kind === 'enemy') {
            runtime.events.push({
              kind: 'pass',
              t: Math.round(elapsedMs),
              enemyId: enemy.id,
              tradeoffLabel: enemy.label,
            });
          }
          continue;
        }

        const enemyWidth = enemy.kind === 'boss' ? BOSS_WIDTH : ENEMY_WIDTH;
        const enemyHeight = enemy.kind === 'boss' ? BOSS_HEIGHT : ENEMY_HEIGHT;

        if (
          intersects(
            { x: runtime.player.x, y: runtime.player.y, width: 26, height: 24 },
            { x: enemy.x, y: enemy.y, width: enemyWidth, height: enemyHeight }
          )
        ) {
          runtime.health -= enemy.kind === 'boss' ? 2 : 1;
          runtime.events.push({
            kind: 'hit',
            t: Math.round(elapsedMs),
            damage: enemy.kind === 'boss' ? 2 : 1,
          });
          continue;
        }

        nextEnemies.push(enemy);
      }

      runtime.enemies = nextEnemies;
      runtime.floatingCapsules = nextCapsules
        .map((capsule) => ({
          ...capsule,
          x: capsule.x - capsule.speed * deltaSeconds,
        }))
        .filter((capsule) => capsule.x > -24);

      const collectedCapsules: FloatingCapsule[] = [];
      for (const capsule of runtime.floatingCapsules) {
        if (
          intersects(
            { x: runtime.player.x, y: runtime.player.y, width: 26, height: 24 },
            { x: capsule.x, y: capsule.y, width: 16, height: 16 }
          )
        ) {
          runtime.events.push({
            kind: 'capsule',
            t: Math.round(elapsedMs),
            capsule: capsule.capsule,
          });
          runtime.barPosition =
            (runtime.barPosition + 1) % SLOT_CAPSULES.length;
          runtime.events.push({
            kind: 'barAdvance',
            t: Math.round(elapsedMs),
            position: runtime.barPosition,
          });
        } else {
          collectedCapsules.push(capsule);
        }
      }
      runtime.floatingCapsules = collectedCapsules;

      drawBackground(context);
      drawPlayer(context, runtime.player.x, runtime.player.y);
      for (const bullet of runtime.bullets) {
        context.fillStyle = '#ffe66d';
        context.fillRect(bullet.x, bullet.y, 18, 4);
      }
      for (const enemy of runtime.enemies) {
        drawEnemy(context, enemy);
      }
      for (const capsule of runtime.floatingCapsules) {
        drawCapsule(context, capsule);
      }

      context.fillStyle = 'rgba(7, 9, 10, 0.56)';
      context.fillRect(18, 18, 270, 92);
      context.fillStyle = '#fefae0';
      context.font = "600 15px 'IBM Plex Sans JP', sans-serif";
      context.fillText(`Pilot ${playerName || 'Anonymous'}`, 32, 44);
      context.fillText(
        `Commit ${capsuleAtBarPosition(runtime.barPosition).toUpperCase()}`,
        32,
        70
      );
      context.fillText('Use arrows / WASD, Space, Enter', 32, 96);

      const timeLeftMs = Math.max(0, GAME_DURATION_MS - elapsedMs);
      startTransition(() => {
        setSnapshot({
          phase: 'running',
          score: runtime.score,
          health: runtime.health,
          timeLeftMs,
          barPosition: runtime.barPosition,
          currentSlot: capsuleAtBarPosition(runtime.barPosition),
          activeBoss:
            runtime.enemies.find((enemy) => enemy.kind === 'boss')?.label ??
            'none',
        });
      });

      if (timeLeftMs <= 0 || runtime.health <= 0) {
        runtime.finished = true;
        startTransition(() => {
          setSnapshot((current) => ({
            ...current,
            phase: 'finished',
            timeLeftMs: 0,
          }));
        });
        void onCompleteRef.current({
          sessionId: globalThis.crypto.randomUUID(),
          durationMs: Math.round(elapsedMs),
          finalScore: runtime.score,
          events: runtime.events,
        });
        return;
      }

      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [playerName, snapshot.phase]);

  function handleStart() {
    if (disabled) {
      return;
    }

    runtimeRef.current = createRuntimeState();
    startTransition(() => {
      setSnapshot({
        phase: 'running',
        score: 0,
        health: 5,
        timeLeftMs: GAME_DURATION_MS,
        barPosition: 0,
        currentSlot: capsuleAtBarPosition(0),
        activeBoss: 'none',
      });
    });
  }

  return (
    <section className="panel arcade-panel">
      <div className="panel-header">
        <span className="eyebrow">Birth Arcade</span>
        <h2>Play to Design Agents</h2>
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="arcade-canvas"
      />
      <div className="hud-grid">
        <div>
          <span>Score</span>
          <strong>{snapshot.score}</strong>
        </div>
        <div>
          <span>Hull</span>
          <strong>{snapshot.health}</strong>
        </div>
        <div>
          <span>Timer</span>
          <strong>{Math.ceil(snapshot.timeLeftMs / 1000)}s</strong>
        </div>
        <div>
          <span>Boss</span>
          <strong>{snapshot.activeBoss}</strong>
        </div>
      </div>
      <div className="power-bar">
        {SLOT_CAPSULES.map((capsule, index) => (
          <div
            key={capsule}
            className={
              index === snapshot.barPosition
                ? 'power-slot active'
                : 'power-slot'
            }
          >
            <span>{capsule.toUpperCase()}</span>
          </div>
        ))}
      </div>
      <div className="arcade-footer">
        <p>
          Pick trade-offs by shooting or letting enemies pass. Every collected
          capsule advances the Gradius bar. Press
          <strong> Enter</strong> to commit the highlighted capability.
        </p>
        <button
          type="button"
          onClick={handleStart}
          disabled={disabled || snapshot.phase === 'running'}
        >
          {snapshot.phase === 'running'
            ? `COMMIT ${commitLabel}`
            : 'INSERT COIN'}
        </button>
      </div>
    </section>
  );
}
