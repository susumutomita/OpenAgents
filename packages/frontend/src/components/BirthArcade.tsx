import {
  type Capsule,
  MOAI_IDS,
  MOAI_SPECIALTIES,
  type MoaiId,
  type PlayLog,
  SLOT_CAPSULES,
  capsuleAtBarPosition,
} from '@openagents/shared/browser';
import { useEffect, useRef, useState } from 'react';

interface BirthArcadeProps {
  disabled?: boolean;
  playerName: string;
  onComplete: (playLog: PlayLog) => void | Promise<void>;
}

type Phase = 'ready' | 'countdown' | 'playing' | 'debrief';

interface Bullet {
  id: number;
  x: number;
  y: number;
}

interface Enemy {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  kind: 'grunt' | 'moai';
  capsule: Capsule;
  moaiId?: MoaiId;
  tradeoffLeft?: string;
  tradeoffRight?: string;
  spawnAt: number;
  fireCooldown: number;
}

interface FloatingCapsule {
  id: number;
  x: number;
  y: number;
  vy: number;
  capsule: Capsule;
  spawnAt: number;
}

interface EnemyBullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface ScorePop {
  id: number;
  x: number;
  y: number;
  text: string;
  life: number;
}

interface Toast {
  id: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

interface Tradeoff {
  left: string;
  right: string;
}

interface RuntimeState {
  startAt: number;
  lastFrameAt: number;
  player: { x: number; y: number };
  bullets: Bullet[];
  enemies: Enemy[];
  enemyBullets: EnemyBullet[];
  capsules: FloatingCapsule[];
  particles: Particle[];
  scorePops: ScorePop[];
  toasts: Toast[];
  events: PlayLog['events'];
  score: number;
  hull: number;
  maxHull: number;
  invincibleUntil: number;
  shakeUntil: number;
  shakeMag: number;
  flashUntil: number;
  barPosition: number;
  capsulesCollected: Record<Capsule, number>;
  commits: Record<Capsule, number>;
  bossesDefeated: Record<MoaiId, boolean>;
  bossesSpawned: Record<MoaiId, boolean>;
  nextEnemyAt: number;
  nextMoaiAt: number;
  nextShotAt: number;
  lastCommitAt: number;
  enemyCounter: number;
  bulletCounter: number;
  capsuleCounter: number;
  particleCounter: number;
  scorePopCounter: number;
  toastCounter: number;
  enemyBulletCounter: number;
  currentTradeoff: Tradeoff;
  tradeoffSwapAt: number;
  finished: boolean;
  starField: { x: number; y: number; speed: number; size: number }[];
}

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const PLAYER_HITBOX = 8;
const PLAYER_RADIUS = 14;
const PLAYER_SPEED = 320;
const BULLET_SPEED = 720;
const FIRE_COOLDOWN_MS = 140;
const GAME_DURATION_MS = 60000;
const MAX_HULL = 5;
const I_FRAMES_MS = 900;
const COMMIT_COOLDOWN_MS = 500;
const MOAI_BOSS_INTERVAL_MS = 9500;

const TRADEOFFS: Tradeoff[] = [
  { left: 'Slow & Safe', right: 'Fast & Risky' },
  { left: 'Specialist', right: 'Generalist' },
  { left: 'Solo', right: 'Cooperative' },
  { left: 'Conservative', right: 'High Conviction' },
  { left: 'Long Horizon', right: 'Short Horizon' },
  { left: 'Low Leverage', right: 'High Leverage' },
];

const MOAI_ORDER: MoaiId[] = ['aegis', 'razor', 'oracle', 'comet', 'hive'];
const MOAI_LABEL: Record<MoaiId, string> = {
  aegis: 'AEGIS',
  razor: 'RAZOR',
  oracle: 'ORACLE',
  comet: 'COMET',
  hive: 'HIVE',
};

const CAPSULE_COLOR: Record<Capsule, string> = {
  speed: '#ffd166',
  missile: '#7bdff2',
  double: '#ff6b6b',
  laser: '#9b5de5',
  option: '#00f5d4',
  shield: '#94d2bd',
};

const CAPSULE_LABEL: Record<Capsule, string> = {
  speed: 'SPEED',
  missile: 'MISSILE',
  double: 'DOUBLE',
  laser: 'LASER',
  option: 'OPTION',
  shield: 'SHIELD',
};

const CAPSULE_AXIS: Record<Capsule, string> = {
  speed: 'Agility',
  missile: 'Intelligence',
  double: 'Attack',
  laser: 'Attack',
  option: 'Cooperation',
  shield: 'Defense',
};

function createStarField() {
  const stars: RuntimeState['starField'] = [];
  for (let i = 0; i < 90; i += 1) {
    stars.push({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT,
      speed: 30 + Math.random() * 90,
      size: Math.random() < 0.7 ? 1 : 2,
    });
  }
  return stars;
}

function createRuntime(now: number): RuntimeState {
  return {
    startAt: now,
    lastFrameAt: now,
    player: { x: 140, y: CANVAS_HEIGHT / 2 },
    bullets: [],
    enemies: [],
    enemyBullets: [],
    capsules: [],
    particles: [],
    scorePops: [],
    toasts: [],
    events: [],
    score: 0,
    hull: MAX_HULL,
    maxHull: MAX_HULL,
    invincibleUntil: 0,
    shakeUntil: 0,
    shakeMag: 0,
    flashUntil: 0,
    barPosition: 0,
    capsulesCollected: {
      speed: 0,
      missile: 0,
      double: 0,
      laser: 0,
      option: 0,
      shield: 0,
    },
    commits: {
      speed: 0,
      missile: 0,
      double: 0,
      laser: 0,
      option: 0,
      shield: 0,
    },
    bossesDefeated: {
      aegis: false,
      razor: false,
      oracle: false,
      comet: false,
      hive: false,
    },
    bossesSpawned: {
      aegis: false,
      razor: false,
      oracle: false,
      comet: false,
      hive: false,
    },
    nextEnemyAt: now + 600,
    nextMoaiAt: now + 5500,
    nextShotAt: 0,
    lastCommitAt: 0,
    enemyCounter: 0,
    bulletCounter: 0,
    capsuleCounter: 0,
    particleCounter: 0,
    scorePopCounter: 0,
    toastCounter: 0,
    enemyBulletCounter: 0,
    currentTradeoff: TRADEOFFS[0] ?? { left: 'Left', right: 'Right' },
    tradeoffSwapAt: now + 5000,
    finished: false,
    starField: createStarField(),
  };
}

function pushToast(runtime: RuntimeState, text: string, color: string) {
  runtime.toastCounter += 1;
  runtime.toasts.push({
    id: runtime.toastCounter,
    text,
    color,
    life: 1.6,
    maxLife: 1.6,
  });
  if (runtime.toasts.length > 4) {
    runtime.toasts.shift();
  }
}

function spawnBurst(
  runtime: RuntimeState,
  x: number,
  y: number,
  color: string,
  count: number
) {
  for (let i = 0; i < count; i += 1) {
    runtime.particleCounter += 1;
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 220;
    runtime.particles.push({
      id: runtime.particleCounter,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.4 + Math.random() * 0.3,
      maxLife: 0.7,
      color,
      size: 2 + Math.random() * 2,
    });
  }
}

function spawnGrunt(runtime: RuntimeState, now: number) {
  const sequence = runtime.enemyCounter;
  runtime.enemyCounter += 1;
  const tradeoff = runtime.currentTradeoff;
  const yLane = 80 + ((sequence * 73) % (CANVAS_HEIGHT - 200));
  const capsule = SLOT_CAPSULES[sequence % SLOT_CAPSULES.length] ?? 'speed';
  runtime.enemies.push({
    id: `grunt-${sequence}`,
    x: CANVAS_WIDTH + 32,
    y: yLane,
    vx: -(140 + (sequence % 4) * 14),
    vy: Math.sin(sequence * 0.7) * 30,
    hp: 1,
    maxHp: 1,
    kind: 'grunt',
    capsule,
    tradeoffLeft: tradeoff.left,
    tradeoffRight: tradeoff.right,
    spawnAt: now,
    fireCooldown: 1200 + Math.random() * 1500,
  });
}

function spawnMoai(runtime: RuntimeState, now: number) {
  const next = MOAI_ORDER.find((id) => !runtime.bossesSpawned[id]);
  if (!next) {
    return;
  }
  runtime.bossesSpawned[next] = true;
  runtime.enemies.push({
    id: `moai-${next}`,
    x: CANVAS_WIDTH + 80,
    y: 100 + ((MOAI_ORDER.indexOf(next) * 80) % (CANVAS_HEIGHT - 220)),
    vx: -45,
    vy: 0,
    hp: 6,
    maxHp: 6,
    kind: 'moai',
    capsule: MOAI_SPECIALTIES[next],
    moaiId: next,
    tradeoffLeft: `${MOAI_LABEL[next]} archetype`,
    tradeoffRight: `Reject ${MOAI_LABEL[next]}`,
    spawnAt: now,
    fireCooldown: 2000,
  });
  pushToast(runtime, `WARNING: ${MOAI_LABEL[next]} MOAI`, '#ff6b6b');
}

function spawnCapsuleFromEnemy(
  runtime: RuntimeState,
  enemy: Enemy,
  now: number
) {
  runtime.capsuleCounter += 1;
  runtime.capsules.push({
    id: runtime.capsuleCounter,
    x: enemy.x,
    y: enemy.y,
    vy: -10,
    capsule: enemy.capsule,
    spawnAt: now,
  });
}

function fireEnemyBullet(runtime: RuntimeState, enemy: Enemy) {
  runtime.enemyBulletCounter += 1;
  const dx = runtime.player.x - enemy.x;
  const dy = runtime.player.y - enemy.y;
  const len = Math.hypot(dx, dy) || 1;
  runtime.enemyBullets.push({
    id: runtime.enemyBulletCounter,
    x: enemy.x,
    y: enemy.y,
    vx: (dx / len) * 220,
    vy: (dy / len) * 220,
  });
}

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

function drawBackground(
  context: CanvasRenderingContext2D,
  runtime: RuntimeState,
  deltaSeconds: number
) {
  const gradient = context.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  gradient.addColorStop(0, '#040716');
  gradient.addColorStop(0.5, '#0a1230');
  gradient.addColorStop(1, '#1a042a');
  context.fillStyle = gradient;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  context.fillStyle = '#dceaff';
  for (const star of runtime.starField) {
    star.x -= star.speed * deltaSeconds;
    if (star.x < -2) {
      star.x = CANVAS_WIDTH + Math.random() * 80;
      star.y = Math.random() * CANVAS_HEIGHT;
    }
    context.globalAlpha = 0.4 + (star.size === 2 ? 0.4 : 0);
    context.fillRect(
      Math.round(star.x),
      Math.round(star.y),
      star.size,
      star.size
    );
  }
  context.globalAlpha = 1;

  // Distant Moai silhouettes (parallax decoration).
  context.fillStyle = 'rgba(112, 78, 56, 0.32)';
  for (let i = 0; i < 6; i += 1) {
    const baseX =
      ((i * 220 - (runtime.lastFrameAt - runtime.startAt) * 0.04) %
        (CANVAS_WIDTH + 240)) -
      120;
    const baseY = CANVAS_HEIGHT - 90;
    drawMoaiSilhouette(context, baseX, baseY, 70);
  }
}

function drawMoaiSilhouette(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number
) {
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x, y - scale * 0.9);
  context.quadraticCurveTo(
    x + scale * 0.4,
    y - scale * 1.4,
    x + scale * 0.85,
    y - scale * 0.9
  );
  context.lineTo(x + scale * 0.85, y);
  context.closePath();
  context.fill();
}

function drawPlayer(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  invincible: boolean,
  pulse: number
) {
  if (invincible && Math.floor(pulse * 10) % 2 === 0) {
    return;
  }
  // Engine flame
  context.fillStyle = '#ff7b1a';
  context.fillRect(x - 12, y - 4, 6, 8);
  context.fillStyle = '#ffd166';
  context.fillRect(x - 8, y - 3, 4, 6);

  // Body (Vic Viper-ish)
  context.fillStyle = '#cdebff';
  context.beginPath();
  context.moveTo(x + 22, y);
  context.lineTo(x - 6, y - 8);
  context.lineTo(x - 6, y + 8);
  context.closePath();
  context.fill();

  context.fillStyle = '#7bdff2';
  context.fillRect(x - 4, y - 4, 18, 8);

  // Wing
  context.fillStyle = '#ff6b6b';
  context.fillRect(x - 4, y - 12, 12, 4);
  context.fillRect(x - 4, y + 8, 12, 4);

  // Cockpit
  context.fillStyle = '#fefae0';
  context.fillRect(x + 6, y - 2, 6, 4);
}

function drawGrunt(context: CanvasRenderingContext2D, enemy: Enemy) {
  const x = Math.round(enemy.x);
  const y = Math.round(enemy.y);
  context.fillStyle = '#ff6b6b';
  context.fillRect(x - 18, y - 10, 36, 20);
  context.fillStyle = '#ffd6d6';
  context.fillRect(x - 12, y - 6, 6, 4);
  context.fillRect(x + 6, y - 6, 6, 4);
  context.fillStyle = '#fefae0';
  context.fillRect(x - 4, y + 6, 8, 4);

  context.fillStyle = '#fefae0';
  context.font = "600 11px 'Space Grotesk', sans-serif";
  context.textAlign = 'center';
  if (enemy.tradeoffLeft) {
    context.fillText(enemy.tradeoffLeft, x, y - 16);
  }
  context.textAlign = 'start';
}

function drawMoaiBoss(context: CanvasRenderingContext2D, enemy: Enemy) {
  const x = Math.round(enemy.x);
  const y = Math.round(enemy.y);
  const scale = 1.2;

  // Stone head silhouette
  context.fillStyle = '#9c7a5b';
  context.fillRect(x - 36 * scale, y - 48 * scale, 72 * scale, 88 * scale);
  context.fillStyle = '#bb946d';
  context.fillRect(x - 32 * scale, y - 44 * scale, 64 * scale, 12 * scale);

  // Eyes
  context.fillStyle = '#1a040a';
  context.fillRect(x - 20 * scale, y - 22 * scale, 12 * scale, 8 * scale);
  context.fillRect(x + 8 * scale, y - 22 * scale, 12 * scale, 8 * scale);

  // Glowing eye core
  const flicker = (Math.sin(performance.now() / 120) + 1) * 0.5;
  context.fillStyle = enemy.hp <= enemy.maxHp / 2 ? '#ff7b72' : '#ffd166';
  context.globalAlpha = 0.6 + flicker * 0.4;
  context.fillRect(x - 17 * scale, y - 20 * scale, 6 * scale, 4 * scale);
  context.fillRect(x + 11 * scale, y - 20 * scale, 6 * scale, 4 * scale);
  context.globalAlpha = 1;

  // Mouth
  context.fillStyle = '#1a040a';
  context.fillRect(x - 16 * scale, y + 8 * scale, 32 * scale, 10 * scale);

  // HP bar
  const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
  context.fillStyle = 'rgba(255, 255, 255, 0.2)';
  context.fillRect(x - 36 * scale, y - 60 * scale, 72 * scale, 6);
  context.fillStyle = hpRatio > 0.4 ? '#80ed99' : '#ff7b72';
  context.fillRect(x - 36 * scale, y - 60 * scale, 72 * scale * hpRatio, 6);

  // Boss label
  context.fillStyle = '#ffe66d';
  context.font = "700 14px 'Space Grotesk', sans-serif";
  context.textAlign = 'center';
  context.fillText(
    enemy.moaiId ? MOAI_LABEL[enemy.moaiId] : 'MOAI',
    x,
    y - 64 * scale
  );
  context.textAlign = 'start';
}

function drawCapsule(
  context: CanvasRenderingContext2D,
  capsule: FloatingCapsule
) {
  const x = Math.round(capsule.x);
  const y = Math.round(capsule.y);
  const color = CAPSULE_COLOR[capsule.capsule];
  context.fillStyle = color;
  context.fillRect(x - 10, y - 10, 20, 20);
  context.fillStyle = '#040716';
  context.font = "700 10px 'Space Grotesk', sans-serif";
  context.textAlign = 'center';
  context.fillText(CAPSULE_LABEL[capsule.capsule].slice(0, 3), x, y + 3);
  context.textAlign = 'start';
}

function drawPlayerBullet(context: CanvasRenderingContext2D, bullet: Bullet) {
  context.fillStyle = '#ffe66d';
  context.fillRect(bullet.x, bullet.y - 2, 22, 4);
  context.fillStyle = '#ffffff';
  context.fillRect(bullet.x + 14, bullet.y - 1, 8, 2);
}

function drawEnemyBullet(
  context: CanvasRenderingContext2D,
  bullet: EnemyBullet
) {
  context.fillStyle = '#ff7b72';
  context.beginPath();
  context.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#fefae0';
  context.beginPath();
  context.arc(bullet.x, bullet.y, 1.6, 0, Math.PI * 2);
  context.fill();
}

function drawScorePop(context: CanvasRenderingContext2D, pop: ScorePop) {
  const alpha = Math.max(0, pop.life);
  context.globalAlpha = alpha;
  context.fillStyle = '#ffe66d';
  context.font = "700 16px 'Space Grotesk', sans-serif";
  context.textAlign = 'center';
  context.fillText(pop.text, pop.x, pop.y);
  context.textAlign = 'start';
  context.globalAlpha = 1;
}

function drawParticle(context: CanvasRenderingContext2D, particle: Particle) {
  const alpha = Math.max(0, particle.life / particle.maxLife);
  context.globalAlpha = alpha;
  context.fillStyle = particle.color;
  context.fillRect(
    Math.round(particle.x),
    Math.round(particle.y),
    particle.size,
    particle.size
  );
  context.globalAlpha = 1;
}

function drawHud(
  context: CanvasRenderingContext2D,
  runtime: RuntimeState,
  timeLeftMs: number
) {
  // Top status bar
  context.fillStyle = 'rgba(4, 7, 22, 0.78)';
  context.fillRect(0, 0, CANVAS_WIDTH, 48);
  context.fillStyle = '#ffe66d';
  context.font = "700 16px 'Space Grotesk', sans-serif";
  context.fillText(
    `SCORE ${runtime.score.toString().padStart(6, '0')}`,
    16,
    30
  );

  context.fillStyle = '#cdebff';
  context.fillText(
    `TIME ${Math.ceil(timeLeftMs / 1000)
      .toString()
      .padStart(2, '0')}`,
    280,
    30
  );

  // Hull
  context.fillStyle = '#cdebff';
  context.fillText('HULL', 400, 30);
  for (let i = 0; i < runtime.maxHull; i += 1) {
    context.fillStyle =
      i < runtime.hull ? '#80ed99' : 'rgba(255, 255, 255, 0.16)';
    context.fillRect(454 + i * 22, 16, 16, 16);
  }

  // Boss progress
  const defeated = MOAI_ORDER.filter((id) => runtime.bossesDefeated[id]).length;
  context.fillStyle = '#bde0fe';
  context.fillText(
    `MOAI ${defeated}/${MOAI_ORDER.length}`,
    CANVAS_WIDTH - 160,
    30
  );

  // Trade-off banner (current dichotomy)
  context.fillStyle = 'rgba(4, 7, 22, 0.7)';
  context.fillRect(0, 48, CANVAS_WIDTH, 28);
  context.fillStyle = '#ff7b72';
  context.font = "700 13px 'Space Grotesk', sans-serif";
  context.textAlign = 'left';
  context.fillText(`SHOOT → ${runtime.currentTradeoff.left}`, 16, 66);
  context.fillStyle = '#bde0fe';
  context.textAlign = 'right';
  context.fillText(
    `LET PASS → ${runtime.currentTradeoff.right}`,
    CANVAS_WIDTH - 16,
    66
  );
  context.textAlign = 'start';

  // Bottom power-up bar
  const barTop = CANVAS_HEIGHT - 76;
  context.fillStyle = 'rgba(4, 7, 22, 0.85)';
  context.fillRect(0, barTop, CANVAS_WIDTH, 76);

  context.fillStyle = '#fefae0';
  context.font = "600 11px 'Space Grotesk', sans-serif";
  context.fillText('POWER-UP BAR — PRESS [Z] TO COMMIT', 16, barTop + 16);

  const slotWidth = (CANVAS_WIDTH - 32) / SLOT_CAPSULES.length;
  for (let i = 0; i < SLOT_CAPSULES.length; i += 1) {
    const capsule = SLOT_CAPSULES[i];
    if (!capsule) continue;
    const isActive = i === runtime.barPosition;
    const x = 16 + i * slotWidth;
    const y = barTop + 22;
    const w = slotWidth - 6;
    const h = 46;

    context.fillStyle = isActive
      ? CAPSULE_COLOR[capsule]
      : 'rgba(255, 255, 255, 0.06)';
    context.fillRect(x, y, w, h);

    context.fillStyle = isActive ? '#040716' : '#cdebff';
    context.font = "700 12px 'Space Grotesk', sans-serif";
    context.textAlign = 'center';
    context.fillText(CAPSULE_LABEL[capsule], x + w / 2, y + 18);
    context.font = "500 10px 'Space Grotesk', sans-serif";
    context.fillText(`+${CAPSULE_AXIS[capsule]}`, x + w / 2, y + 32);

    const committed = runtime.commits[capsule];
    if (committed > 0) {
      context.fillStyle = '#80ed99';
      context.fillRect(x + w - 16, y + 4, 12, 12);
      context.fillStyle = '#040716';
      context.font = "700 10px 'Space Grotesk', sans-serif";
      context.fillText(String(committed), x + w - 10, y + 13);
    }
    context.textAlign = 'start';
  }

  // Toast stack
  for (let i = 0; i < runtime.toasts.length; i += 1) {
    const toast = runtime.toasts[i];
    if (!toast) continue;
    const alpha = Math.min(1, toast.life / 0.6);
    context.globalAlpha = alpha;
    context.fillStyle = 'rgba(4, 7, 22, 0.85)';
    context.fillRect(CANVAS_WIDTH - 280, 90 + i * 30, 264, 24);
    context.fillStyle = toast.color;
    context.fillRect(CANVAS_WIDTH - 280, 90 + i * 30, 4, 24);
    context.fillStyle = '#fefae0';
    context.font = "600 12px 'Space Grotesk', sans-serif";
    context.fillText(toast.text, CANVAS_WIDTH - 268, 106 + i * 30);
    context.globalAlpha = 1;
  }
}

function drawHitFlash(
  context: CanvasRenderingContext2D,
  runtime: RuntimeState,
  now: number
) {
  if (now < runtime.flashUntil) {
    const remaining = (runtime.flashUntil - now) / 200;
    context.fillStyle = `rgba(255, 99, 99, ${0.45 * remaining})`;
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
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
  const phaseRef = useRef<Phase>('ready');
  const onCompleteRef = useRef(onComplete);
  const [phase, setPhase] = useState<Phase>('ready');
  const [hudTick, setHudTick] = useState(0);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (phase !== 'countdown') {
      return;
    }
    setCountdown(3);
    const timers = [
      window.setTimeout(() => setCountdown(2), 700),
      window.setTimeout(() => setCountdown(1), 1400),
      window.setTimeout(() => {
        runtimeRef.current = createRuntime(performance.now());
        setPhase('playing');
      }, 2100),
    ];
    return () => {
      for (const t of timers) {
        window.clearTimeout(t);
      }
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing') {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === ' ' ||
        event.key === 'ArrowUp' ||
        event.key === 'ArrowDown' ||
        event.key === 'ArrowLeft' ||
        event.key === 'ArrowRight'
      ) {
        event.preventDefault();
      }
      keysRef.current[event.key.toLowerCase()] = true;

      if (event.key.toLowerCase() === 'z' && runtimeRef.current) {
        const runtime = runtimeRef.current;
        const now = performance.now();
        if (now - runtime.lastCommitAt > COMMIT_COOLDOWN_MS) {
          const capsule = capsuleAtBarPosition(runtime.barPosition);
          runtime.events.push({
            kind: 'commit',
            t: Math.round(now - runtime.startAt),
            position: runtime.barPosition,
            capsule,
          });
          runtime.commits[capsule] += 1;
          runtime.lastCommitAt = now;
          pushToast(
            runtime,
            `${CAPSULE_LABEL[capsule]} COMMITTED → +${CAPSULE_AXIS[capsule]}`,
            CAPSULE_COLOR[capsule]
          );
          spawnBurst(
            runtime,
            runtime.player.x + 12,
            runtime.player.y,
            CAPSULE_COLOR[capsule],
            18
          );
        }
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      keysRef.current[event.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let lastHudTick = 0;

    const tick = (timestamp: number) => {
      const runtime = runtimeRef.current;
      if (!runtime) {
        return;
      }

      const deltaSeconds = Math.min(
        0.05,
        (timestamp - runtime.lastFrameAt) / 1000
      );
      runtime.lastFrameAt = timestamp;
      const elapsed = timestamp - runtime.startAt;

      // --- Input → player movement ---
      const left = keysRef.current.arrowleft || keysRef.current.a ? 1 : 0;
      const right = keysRef.current.arrowright || keysRef.current.d ? 1 : 0;
      const up = keysRef.current.arrowup || keysRef.current.w ? 1 : 0;
      const down = keysRef.current.arrowdown || keysRef.current.s ? 1 : 0;
      runtime.player.x = Math.min(
        Math.max(
          runtime.player.x + (right - left) * PLAYER_SPEED * deltaSeconds,
          32
        ),
        CANVAS_WIDTH - 60
      );
      runtime.player.y = Math.min(
        Math.max(
          runtime.player.y + (down - up) * PLAYER_SPEED * deltaSeconds,
          90
        ),
        CANVAS_HEIGHT - 100
      );

      // --- Auto-fire ---
      if (
        (keysRef.current[' '] || keysRef.current.j) &&
        timestamp >= runtime.nextShotAt
      ) {
        runtime.bulletCounter += 1;
        runtime.bullets.push({
          id: runtime.bulletCounter,
          x: runtime.player.x + 22,
          y: runtime.player.y,
        });
        runtime.nextShotAt = timestamp + FIRE_COOLDOWN_MS;
      }

      // --- Trade-off rotation ---
      if (timestamp >= runtime.tradeoffSwapAt) {
        const idx = Math.floor(Math.random() * TRADEOFFS.length);
        runtime.currentTradeoff = TRADEOFFS[idx] ?? runtime.currentTradeoff;
        runtime.tradeoffSwapAt = timestamp + 5000 + Math.random() * 2000;
      }

      // --- Spawning ---
      if (timestamp >= runtime.nextEnemyAt) {
        spawnGrunt(runtime, timestamp);
        runtime.nextEnemyAt = timestamp + 850 - Math.min(450, elapsed / 200);
      }
      if (timestamp >= runtime.nextMoaiAt) {
        spawnMoai(runtime, timestamp);
        runtime.nextMoaiAt = timestamp + MOAI_BOSS_INTERVAL_MS;
      }

      // --- Bullets ---
      runtime.bullets = runtime.bullets
        .map((bullet) => ({
          ...bullet,
          x: bullet.x + BULLET_SPEED * deltaSeconds,
        }))
        .filter((bullet) => bullet.x < CANVAS_WIDTH + 30);

      runtime.enemyBullets = runtime.enemyBullets
        .map((bullet) => ({
          ...bullet,
          x: bullet.x + bullet.vx * deltaSeconds,
          y: bullet.y + bullet.vy * deltaSeconds,
        }))
        .filter(
          (bullet) =>
            bullet.x > -10 &&
            bullet.x < CANVAS_WIDTH + 10 &&
            bullet.y > -10 &&
            bullet.y < CANVAS_HEIGHT + 10
        );

      // --- Bullet vs enemy ---
      for (const bullet of runtime.bullets) {
        for (const enemy of runtime.enemies) {
          const w = enemy.kind === 'moai' ? 86 : 36;
          const h = enemy.kind === 'moai' ? 110 : 22;
          if (
            rectsOverlap(
              { x: bullet.x, y: bullet.y - 2, w: 22, h: 4 },
              { x: enemy.x - w / 2, y: enemy.y - h / 2, w, h }
            )
          ) {
            enemy.hp -= 1;
            bullet.x = CANVAS_WIDTH + 100;
            spawnBurst(runtime, bullet.x, enemy.y, '#ffe66d', 4);
          }
        }
      }

      // --- Enemy update + cleanup ---
      const aliveEnemies: Enemy[] = [];
      for (const enemy of runtime.enemies) {
        enemy.x += enemy.vx * deltaSeconds;
        enemy.y += enemy.vy * deltaSeconds;
        enemy.fireCooldown -= deltaSeconds * 1000;

        // Boss vertical drift
        if (enemy.kind === 'moai') {
          enemy.y += Math.sin(timestamp / 600 + enemy.spawnAt) * 0.4;
          if (enemy.x < CANVAS_WIDTH - 200) {
            enemy.vx = 0;
          }
        }

        if (enemy.fireCooldown <= 0 && enemy.x < CANVAS_WIDTH - 40) {
          fireEnemyBullet(runtime, enemy);
          enemy.fireCooldown =
            enemy.kind === 'moai' ? 1300 : 1800 + Math.random() * 1500;
        }

        if (enemy.hp <= 0) {
          // Killed
          if (enemy.kind === 'moai' && enemy.moaiId) {
            runtime.bossesDefeated[enemy.moaiId] = true;
            runtime.events.push({
              kind: 'moaiKill',
              t: Math.round(elapsed),
              moaiId: enemy.moaiId,
            });
            spawnBurst(runtime, enemy.x, enemy.y, '#ffd166', 50);
            spawnCapsuleFromEnemy(runtime, enemy, timestamp);
            runtime.score += 1500;
            runtime.scorePopCounter += 1;
            runtime.scorePops.push({
              id: runtime.scorePopCounter,
              x: enemy.x,
              y: enemy.y,
              text: `+1500 ${MOAI_LABEL[enemy.moaiId]} DOWN`,
              life: 1.4,
            });
            pushToast(
              runtime,
              `${MOAI_LABEL[enemy.moaiId]} DEFEATED — ${CAPSULE_LABEL[enemy.capsule]} CAPSULE`,
              CAPSULE_COLOR[enemy.capsule]
            );
          } else {
            runtime.events.push({
              kind: 'shoot',
              t: Math.round(elapsed),
              enemyId: enemy.id,
              tradeoffLabel: enemy.tradeoffLeft ?? 'unknown',
            });
            spawnBurst(runtime, enemy.x, enemy.y, '#ff6b6b', 14);
            spawnCapsuleFromEnemy(runtime, enemy, timestamp);
            runtime.score += 120;
            runtime.scorePopCounter += 1;
            runtime.scorePops.push({
              id: runtime.scorePopCounter,
              x: enemy.x,
              y: enemy.y,
              text: '+120',
              life: 0.9,
            });
          }
          continue;
        }

        if (enemy.x < -120) {
          if (enemy.kind === 'grunt') {
            runtime.events.push({
              kind: 'pass',
              t: Math.round(elapsed),
              enemyId: enemy.id,
              tradeoffLabel: enemy.tradeoffRight ?? 'unknown',
            });
          }
          continue;
        }

        // Collide with player
        const enemyW = enemy.kind === 'moai' ? 86 : 36;
        const enemyH = enemy.kind === 'moai' ? 110 : 22;
        if (
          timestamp > runtime.invincibleUntil &&
          rectsOverlap(
            {
              x: runtime.player.x - PLAYER_HITBOX,
              y: runtime.player.y - PLAYER_HITBOX,
              w: PLAYER_HITBOX * 2,
              h: PLAYER_HITBOX * 2,
            },
            {
              x: enemy.x - enemyW / 2,
              y: enemy.y - enemyH / 2,
              w: enemyW,
              h: enemyH,
            }
          )
        ) {
          runtime.hull -= enemy.kind === 'moai' ? 2 : 1;
          runtime.invincibleUntil = timestamp + I_FRAMES_MS;
          runtime.shakeUntil = timestamp + 280;
          runtime.shakeMag = 8;
          runtime.flashUntil = timestamp + 200;
          runtime.events.push({
            kind: 'hit',
            t: Math.round(elapsed),
            damage: enemy.kind === 'moai' ? 2 : 1,
          });
          pushToast(runtime, `HIT! HULL ${runtime.hull}`, '#ff6b6b');
          spawnBurst(
            runtime,
            runtime.player.x,
            runtime.player.y,
            '#ff6b6b',
            18
          );
        }

        aliveEnemies.push(enemy);
      }
      runtime.enemies = aliveEnemies;

      // --- Enemy bullets vs player ---
      const aliveBullets: EnemyBullet[] = [];
      for (const bullet of runtime.enemyBullets) {
        if (
          timestamp > runtime.invincibleUntil &&
          rectsOverlap(
            {
              x: runtime.player.x - PLAYER_HITBOX,
              y: runtime.player.y - PLAYER_HITBOX,
              w: PLAYER_HITBOX * 2,
              h: PLAYER_HITBOX * 2,
            },
            { x: bullet.x - 4, y: bullet.y - 4, w: 8, h: 8 }
          )
        ) {
          runtime.hull -= 1;
          runtime.invincibleUntil = timestamp + I_FRAMES_MS;
          runtime.shakeUntil = timestamp + 240;
          runtime.shakeMag = 6;
          runtime.flashUntil = timestamp + 160;
          runtime.events.push({
            kind: 'hit',
            t: Math.round(elapsed),
            damage: 1,
          });
          pushToast(runtime, `HIT! HULL ${runtime.hull}`, '#ff6b6b');
          spawnBurst(
            runtime,
            runtime.player.x,
            runtime.player.y,
            '#ff6b6b',
            12
          );
          continue;
        }
        aliveBullets.push(bullet);
      }
      runtime.enemyBullets = aliveBullets;

      // --- Capsules drift + collection ---
      const remainingCapsules: FloatingCapsule[] = [];
      for (const capsule of runtime.capsules) {
        capsule.x -= 80 * deltaSeconds;
        capsule.y += capsule.vy * deltaSeconds;
        if (capsule.x < -30 || timestamp - capsule.spawnAt > 8000) {
          continue;
        }
        if (
          rectsOverlap(
            {
              x: runtime.player.x - PLAYER_RADIUS,
              y: runtime.player.y - PLAYER_RADIUS,
              w: PLAYER_RADIUS * 2,
              h: PLAYER_RADIUS * 2,
            },
            { x: capsule.x - 10, y: capsule.y - 10, w: 20, h: 20 }
          )
        ) {
          runtime.events.push({
            kind: 'capsule',
            t: Math.round(elapsed),
            capsule: capsule.capsule,
          });
          runtime.barPosition =
            (runtime.barPosition + 1) % SLOT_CAPSULES.length;
          runtime.events.push({
            kind: 'barAdvance',
            t: Math.round(elapsed),
            position: runtime.barPosition,
          });
          runtime.capsulesCollected[capsule.capsule] += 1;
          spawnBurst(
            runtime,
            capsule.x,
            capsule.y,
            CAPSULE_COLOR[capsule.capsule],
            12
          );
          pushToast(
            runtime,
            `+${CAPSULE_LABEL[capsule.capsule]} → BAR ${capsuleAtBarPosition(runtime.barPosition).toUpperCase()}`,
            CAPSULE_COLOR[capsule.capsule]
          );
          continue;
        }
        remainingCapsules.push(capsule);
      }
      runtime.capsules = remainingCapsules;

      // --- Particles + score pops + toasts ---
      const aliveParticles: Particle[] = [];
      for (const particle of runtime.particles) {
        particle.x += particle.vx * deltaSeconds;
        particle.y += particle.vy * deltaSeconds;
        particle.vy += 240 * deltaSeconds;
        particle.life -= deltaSeconds;
        if (particle.life > 0) {
          aliveParticles.push(particle);
        }
      }
      runtime.particles = aliveParticles;

      const alivePops: ScorePop[] = [];
      for (const pop of runtime.scorePops) {
        pop.y -= 30 * deltaSeconds;
        pop.life -= deltaSeconds;
        if (pop.life > 0) {
          alivePops.push(pop);
        }
      }
      runtime.scorePops = alivePops;

      const aliveToasts: Toast[] = [];
      for (const toast of runtime.toasts) {
        toast.life -= deltaSeconds;
        if (toast.life > 0) {
          aliveToasts.push(toast);
        }
      }
      runtime.toasts = aliveToasts;

      // --- Render ---
      const shake = timestamp < runtime.shakeUntil ? runtime.shakeMag : 0;
      const ox = shake ? (Math.random() - 0.5) * shake : 0;
      const oy = shake ? (Math.random() - 0.5) * shake : 0;

      context.save();
      context.translate(ox, oy);
      drawBackground(context, runtime, deltaSeconds);
      for (const particle of runtime.particles) {
        drawParticle(context, particle);
      }
      for (const enemy of runtime.enemies) {
        if (enemy.kind === 'moai') {
          drawMoaiBoss(context, enemy);
        } else {
          drawGrunt(context, enemy);
        }
      }
      for (const capsule of runtime.capsules) {
        drawCapsule(context, capsule);
      }
      for (const bullet of runtime.bullets) {
        drawPlayerBullet(context, bullet);
      }
      for (const bullet of runtime.enemyBullets) {
        drawEnemyBullet(context, bullet);
      }
      drawPlayer(
        context,
        runtime.player.x,
        runtime.player.y,
        timestamp < runtime.invincibleUntil,
        timestamp / 60
      );
      for (const pop of runtime.scorePops) {
        drawScorePop(context, pop);
      }
      drawHitFlash(context, runtime, timestamp);
      context.restore();

      drawHud(context, runtime, Math.max(0, GAME_DURATION_MS - elapsed));

      // --- HUD reactivity tick (1/s) ---
      if (timestamp - lastHudTick > 200) {
        lastHudTick = timestamp;
        setHudTick((tick) => tick + 1);
      }

      // --- End condition ---
      const allBossesDown = MOAI_ORDER.every(
        (id) => runtime.bossesDefeated[id]
      );
      if (elapsed >= GAME_DURATION_MS || runtime.hull <= 0 || allBossesDown) {
        runtime.finished = true;
        const playLog: PlayLog = {
          sessionId: globalThis.crypto.randomUUID(),
          durationMs: Math.round(Math.min(elapsed, GAME_DURATION_MS)),
          finalScore: runtime.score,
          events: runtime.events,
        };
        setPhase('debrief');
        void onCompleteRef.current(playLog);
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
  }, [phase]);

  function handleStart() {
    if (disabled || phase !== 'ready') {
      return;
    }
    setPhase('countdown');
  }

  const runtime = runtimeRef.current;
  const liveBarSlot = runtime
    ? capsuleAtBarPosition(runtime.barPosition)
    : 'speed';

  return (
    <section className="panel arcade-panel">
      <div className="panel-header">
        <span className="eyebrow">Birth Arcade</span>
        <h2>Play to Design Agents</h2>
      </div>
      <div className="arcade-stage">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="arcade-canvas"
        />
        {phase === 'ready' ? (
          <div className="arcade-overlay">
            <div className="arcade-card">
              <h3>How to Play</h3>
              <ul>
                <li>
                  <strong>Move</strong>: Arrow keys or WASD
                </li>
                <li>
                  <strong>Auto-fire</strong>: Hold <kbd>Space</kbd>
                </li>
                <li>
                  <strong>Commit power-up</strong>: Press <kbd>Z</kbd> when the
                  bar highlights the slot you want
                </li>
              </ul>
              <p>
                Each enemy carries a trade-off: <em>shooting</em> picks the LEFT
                side, <em>letting it pass</em> picks the RIGHT. Killed enemies
                drop capsules; collecting capsules advances the power-up bar.
                Press <kbd>Z</kbd> to lock the highlighted capability into your
                agent. Defeat the five Moai bosses for archetype-flavored
                capsules.
              </p>
              <button
                type="button"
                className="primary-button"
                onClick={handleStart}
                disabled={disabled}
              >
                INSERT COIN
              </button>
              <p className="arcade-hint">
                Pilot: <strong>{playerName.trim() || 'Anonymous'}</strong> ·
                Stage duration 60s · 5 Moai bosses
              </p>
            </div>
          </div>
        ) : null}
        {phase === 'countdown' ? (
          <div className="arcade-overlay arcade-countdown">
            <span>{countdown}</span>
            <small>STAND BY</small>
          </div>
        ) : null}
        {phase === 'debrief' ? (
          <div className="arcade-overlay arcade-debrief">
            <div className="arcade-card">
              <h3>Stage Cleared</h3>
              <p>Forging your agent profile from the play log…</p>
            </div>
          </div>
        ) : null}
      </div>
      <div className="arcade-summary">
        <div>
          <span>Phase</span>
          <strong>{phase.toUpperCase()}</strong>
        </div>
        <div>
          <span>Highlighted Slot</span>
          <strong>{CAPSULE_LABEL[liveBarSlot]}</strong>
        </div>
        <div>
          <span>Capsules</span>
          <strong>
            {runtime
              ? Object.values(runtime.capsulesCollected).reduce(
                  (sum, value) => sum + value,
                  0
                )
              : 0}
          </strong>
        </div>
        <div>
          <span>Commits</span>
          <strong>
            {runtime
              ? Object.values(runtime.commits).reduce(
                  (sum, value) => sum + value,
                  0
                )
              : 0}
          </strong>
        </div>
      </div>
      {hudTick === -1 ? null : null}
    </section>
  );
}
