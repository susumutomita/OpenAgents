import type {
  Capsule,
  MoaiId,
  PlayEvent,
  PlayLog,
} from '@openagents/shared/browser';
import { CHAINS, type ChainId } from './chains';
import { TX_SYMBOLS, drawBigText, drawRing, pixelText } from './font';
import { PAL, PLAY_H, RH, RW } from './palette';
import {
  GRUNT,
  GRUNT_KEY,
  MOAI,
  MOAI_CHARGE_KEY,
  MOAI_KEY,
  OPTION_KEY,
  OPTION_SPR,
  VIC_KEY,
  VIC_VIPER,
  drawSprite,
} from './sprites';
import {
  type Star,
  type Terrain,
  drawTerrainStrip,
  makeStars,
  makeTerrain,
} from './terrain';

export const GAME_DURATION_FRAMES = 60 * 60; // 60s @ 60fps
export type Archetype = 'conservative' | 'balanced' | 'aggressive';

export function deriveArchetype(rt: Runtime): Archetype {
  const conservativePts =
    rt.commits.shield * 3 +
    rt.commits.option * 2 +
    rt.capsulesPicked.shield * 1 +
    Math.max(0, 4 - (4 - rt.player.hp));
  const aggressivePts =
    rt.commits.laser * 3 +
    rt.commits.double * 2 +
    rt.commits.missile * 1 +
    Math.max(0, 4 - rt.player.hp) * 2 +
    Math.floor(rt.score / 1500);
  const balancedPts =
    rt.commits.speed * 2 +
    Object.values(rt.commits).filter((value) => value > 0).length;

  if (conservativePts > aggressivePts && conservativePts >= balancedPts) {
    return 'conservative';
  }
  if (aggressivePts > conservativePts && aggressivePts > balancedPts) {
    return 'aggressive';
  }
  return 'balanced';
}

export const ARCHETYPE_LABEL: Record<Archetype, string> = {
  conservative: 'CONSERVATIVE',
  balanced: 'BALANCED',
  aggressive: 'AGGRESSIVE',
};

export const ARCHETYPE_DESC: Record<Archetype, string> = {
  conservative: 'STABLE YIELD · LOW DRAWDOWN · MULTI-SIG',
  balanced: 'MIX OF YIELD · MODERATE RISK · ROTATING',
  aggressive: 'HIGH APY · CONCENTRATED · LEVERAGED',
};

export const ARCHETYPE_COLOR: Record<Archetype, string> = {
  conservative: PAL.ringCyan,
  balanced: PAL.shipFlame,
  aggressive: PAL.warn,
};

export interface PortfolioAllocation {
  asset: string;
  weight: number;
  color: string;
}

const ALLOCATIONS: Record<Archetype, PortfolioAllocation[]> = {
  conservative: [
    { asset: 'USDC', weight: 60, color: '#3aa1ff' },
    { asset: 'ETH ', weight: 25, color: '#a0a0ff' },
    { asset: 'AAVE', weight: 10, color: '#b070ff' },
    { asset: 'OP  ', weight: 5, color: '#ff5470' },
  ],
  balanced: [
    { asset: 'ETH ', weight: 35, color: '#a0a0ff' },
    { asset: 'USDC', weight: 30, color: '#3aa1ff' },
    { asset: 'ARB ', weight: 20, color: '#28a0f0' },
    { asset: 'UNI ', weight: 15, color: '#ff5fa2' },
  ],
  aggressive: [
    { asset: 'PEPE', weight: 35, color: '#80ff40' },
    { asset: 'WIF ', weight: 25, color: '#f8d840' },
    { asset: 'ETH ', weight: 25, color: '#a0a0ff' },
    { asset: 'USDC', weight: 15, color: '#3aa1ff' },
  ],
};

export function getAllocation(archetype: Archetype) {
  return ALLOCATIONS[archetype];
}

export interface SimulatedTrade {
  t: number;
  pair: string;
  amount: string;
  result: '+' | '-';
  pct: string;
  color: string;
}

const TRADE_PAIRS = [
  'ETH/USDC',
  'ARB/USDC',
  'UNI/ETH ',
  'PEPE/USDC',
  'WIF/SOL ',
  'AAVE/ETH',
  'OP/USDC ',
];

export function simulateTrades(archetype: Archetype): SimulatedTrade[] {
  const trades: SimulatedTrade[] = [];
  const winRate =
    archetype === 'conservative' ? 0.85 : archetype === 'balanced' ? 0.6 : 0.45;
  const magnitude =
    archetype === 'conservative' ? 0.6 : archetype === 'balanced' ? 1.4 : 3.6;
  for (let i = 0; i < 6; i += 1) {
    const win = Math.random() < winRate;
    const pct = (Math.random() * magnitude + 0.2) * (win ? 1 : -1);
    const pair = TRADE_PAIRS[i % TRADE_PAIRS.length] ?? 'ETH/USDC';
    trades.push({
      t: i * 12,
      pair,
      amount: `${(50 + Math.random() * 200).toFixed(0)} USDC`,
      result: win ? '+' : '-',
      pct: `${Math.abs(pct).toFixed(2)}%`,
      color: win ? PAL.ok : PAL.warn,
    });
  }
  return trades;
}
export const BAR_SLOTS: Capsule[] = [
  'speed',
  'missile',
  'double',
  'laser',
  'option',
  'shield',
];

const SLOT_LABEL: Record<Capsule, string> = {
  speed: 'SPD',
  missile: 'MIS',
  double: 'DBL',
  laser: 'LSR',
  option: 'OPT',
  shield: 'SHD',
};

const MOAI_CYCLE: MoaiId[] = ['aegis', 'razor', 'oracle', 'comet', 'hive'];

interface PlayerState {
  x: number;
  y: number;
  hp: number;
  iframes: number;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy?: number;
  kind: 'plain' | 'laser';
}

interface Grunt {
  type: 'grunt';
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  hp: number;
  spawnAt: number;
  tradeoffLeft: string;
  tradeoffRight: string;
  capsule: Capsule;
}

interface MoaiBoss {
  type: 'moai';
  id: string;
  x: number;
  y: number;
  vx: number;
  targetX: number;
  hp: number;
  maxHp: number;
  fromTop: boolean;
  chargeT: number;
  fireCool: number;
  moaiId: MoaiId;
  spawnAt: number;
}

type Enemy = Grunt | MoaiBoss;

interface Ring {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  born: number;
  phase: number;
  sym: string;
}

interface EnemyBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface CapsulePickup {
  x: number;
  y: number;
  vx: number;
  capsule: Capsule;
  life: number;
}

interface Explosion {
  x: number;
  y: number;
  t: number;
  kind: 'spark' | 'mid' | 'big';
}

interface Toast {
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

interface Option {
  ang: number;
}

const TRADEOFF_PAIRS: { left: string; right: string; capsule: Capsule }[] = [
  { left: 'SLOW SAFE', right: 'FAST RISKY', capsule: 'speed' },
  { left: 'CONCENTRATED', right: 'DIVERSIFIED', capsule: 'laser' },
  { left: 'CONSERVATIVE', right: 'AGGRESSIVE', capsule: 'shield' },
  { left: 'LONG HORIZON', right: 'SHORT HORIZON', capsule: 'missile' },
  { left: 'SOLO', right: 'COOPERATIVE', capsule: 'option' },
  { left: 'LOW LEVERAGE', right: 'HIGH LEVERAGE', capsule: 'double' },
];

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
}

export interface Runtime {
  t: number;
  player: PlayerState;
  bullets: Bullet[];
  enemies: Enemy[];
  rings: Ring[];
  enemyBullets: EnemyBullet[];
  capsules: CapsulePickup[];
  explosions: Explosion[];
  options: Option[];
  toasts: Toast[];
  stars: Star[];
  terrain: Terrain;
  events: PlayEvent[];
  score: number;
  bar: number;
  barCommitted: number;
  chain: ChainId;
  gasBudget: number;
  txCount: number;
  lagFlash: number;
  weapon: 'SINGLE' | 'DOUBLE' | 'LASER';
  speedTier: number;
  hasShield: boolean;
  optionCount: number;
  capsulesPicked: Record<Capsule, number>;
  commits: Record<Capsule, number>;
  moaisDown: number;
  moaisDefeated: Record<MoaiId, boolean>;
  moaisCycleIndex: number;
  nextGruntAt: number;
  nextMoaiAt: number;
  finished: boolean;
  finishReason: 'time' | 'hp' | 'cleared' | null;
  introT: number;
  warningT: number;
  enemyCounter: number;
  bossCounter: number;
  apy: number;
  risk: number;
  lastCommitAt: number;
}

export function createRuntime(chain: ChainId = 'ARB'): Runtime {
  return {
    t: 0,
    player: { x: 60, y: PLAY_H / 2, hp: 4, iframes: 60 },
    bullets: [],
    enemies: [],
    rings: [],
    enemyBullets: [],
    capsules: [],
    explosions: [],
    options: [],
    toasts: [],
    stars: makeStars(),
    terrain: makeTerrain(),
    events: [],
    score: 0,
    bar: -1,
    barCommitted: -1,
    chain,
    gasBudget: 1,
    txCount: 0,
    lagFlash: 0,
    weapon: 'SINGLE',
    speedTier: 1,
    hasShield: false,
    optionCount: 0,
    capsulesPicked: {
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
    moaisDown: 0,
    moaisDefeated: {
      aegis: false,
      razor: false,
      oracle: false,
      comet: false,
      hive: false,
    },
    moaisCycleIndex: 0,
    nextGruntAt: 60,
    nextMoaiAt: 60 * 12,
    finished: false,
    finishReason: null,
    introT: 60 * 2,
    warningT: 0,
    enemyCounter: 0,
    bossCounter: 0,
    apy: 4,
    risk: 1,
    lastCommitAt: -1000,
  };
}

function pushToast(rt: Runtime, text: string, color: string) {
  rt.toasts.unshift({ text, color, life: 90, maxLife: 90 });
  if (rt.toasts.length > 4) rt.toasts.pop();
}

function elapsedMs(rt: Runtime) {
  return Math.round((rt.t / 60) * 1000);
}

function commitCapsule(rt: Runtime) {
  if (rt.bar < 0 || rt.t - rt.lastCommitAt < 30) return;
  const slot = BAR_SLOTS[rt.bar];
  if (!slot) return;
  rt.barCommitted = rt.bar;
  rt.commits[slot] += 1;
  rt.lastCommitAt = rt.t;
  rt.events.push({
    kind: 'commit',
    t: elapsedMs(rt),
    position: rt.bar,
    capsule: slot,
  });
  switch (slot) {
    case 'speed':
      rt.speedTier = Math.min(5, rt.speedTier + 1);
      pushToast(rt, `+SPEED L${rt.speedTier}`, PAL.shipFlame);
      break;
    case 'missile':
      rt.apy += 1;
      rt.risk = Math.min(10, rt.risk + 1);
      pushToast(rt, `+APY ${rt.apy}% +RISK`, PAL.ringCyan);
      break;
    case 'double':
      rt.weapon = 'DOUBLE';
      pushToast(rt, 'DOUBLE WEAPON', PAL.shipRed);
      break;
    case 'laser':
      rt.weapon = 'LASER';
      rt.apy += 2;
      pushToast(rt, 'LASER · ALL-IN', PAL.ringCore);
      break;
    case 'option':
      rt.optionCount = Math.min(2, rt.optionCount + 1);
      rt.options.push({ ang: rt.options.length * Math.PI });
      pushToast(rt, `+PEER OPTION (${rt.optionCount})`, PAL.shipFlame);
      break;
    case 'shield':
      rt.hasShield = true;
      rt.player.hp = Math.min(5, rt.player.hp + 1);
      pushToast(rt, '+SHIELD +HP', PAL.ok);
      break;
  }
  rt.bar = -1;
  rt.explosions.push({
    x: rt.player.x + 12,
    y: rt.player.y + 4,
    t: 0,
    kind: 'mid',
  });
}

function spawnGruntWave(rt: Runtime) {
  rt.enemyCounter += 1;
  const tradeoff = TRADEOFF_PAIRS[rt.enemyCounter % TRADEOFF_PAIRS.length];
  const wave = 4 + ((rt.enemyCounter * 7) % 3);
  const yBase = 30 + ((rt.enemyCounter * 31) % 80);
  for (let i = 0; i < wave; i += 1) {
    rt.enemies.push({
      type: 'grunt',
      id: `g-${rt.enemyCounter}-${i}`,
      x: RW + 16 + i * 18,
      y: yBase + i * 14 + Math.sin(rt.t * 0.01 + i) * 4,
      vx: -1.1,
      vy: 0,
      phase: rt.t * 0.02 + i,
      hp: 1,
      spawnAt: rt.t,
      tradeoffLeft: tradeoff?.left ?? 'CHOICE',
      tradeoffRight: tradeoff?.right ?? 'OTHER',
      capsule: tradeoff?.capsule ?? 'speed',
    });
  }
}

function spawnNextMoai(rt: Runtime) {
  if (rt.moaisCycleIndex >= MOAI_CYCLE.length) return;
  const moaiId = MOAI_CYCLE[rt.moaisCycleIndex];
  if (!moaiId) return;
  rt.moaisCycleIndex += 1;
  rt.bossCounter += 1;
  const fromTop = rt.bossCounter % 2 === 0;
  const targetX = RW - 60 - (rt.bossCounter % 3) * 32;
  rt.enemies.push({
    type: 'moai',
    id: `m-${moaiId}`,
    x: RW + 24,
    y: fromTop ? 14 : PLAY_H - 42,
    vx: -0.4,
    targetX,
    hp: 8,
    maxHp: 8,
    fromTop,
    chargeT: 0,
    fireCool: 200,
    moaiId,
    spawnAt: rt.t,
  });
  rt.warningT = 90;
  pushToast(rt, `WARNING · ${moaiId.toUpperCase()} MOAI`, PAL.warn);
}

function optionPos(rt: Runtime, o: Option) {
  return {
    x: rt.player.x + Math.cos(o.ang) * 18 - 3,
    y: rt.player.y + Math.sin(o.ang) * 14 + 2,
  };
}

function fireBullets(rt: Runtime) {
  const chain = CHAINS[rt.chain];
  const vx = chain.bulletVx;
  if (rt.weapon === 'LASER') {
    rt.bullets.push({
      x: rt.player.x + 14,
      y: rt.player.y + 4,
      vx: vx * 1.6,
      kind: 'laser',
    });
  } else if (rt.weapon === 'DOUBLE') {
    rt.bullets.push({
      x: rt.player.x + 14,
      y: rt.player.y + 4,
      vx,
      kind: 'plain',
    });
    rt.bullets.push({
      x: rt.player.x + 14,
      y: rt.player.y + 4,
      vx,
      vy: -1.6,
      kind: 'plain',
    });
  } else {
    rt.bullets.push({
      x: rt.player.x + 14,
      y: rt.player.y + 4,
      vx,
      kind: 'plain',
    });
  }
  for (const o of rt.options) {
    const op = optionPos(rt, o);
    rt.bullets.push({ x: op.x + 4, y: op.y + 2, vx, kind: 'plain' });
  }
}

export function step(rt: Runtime, input: InputState) {
  if (rt.finished) return;
  rt.t += 1;
  const chain = CHAINS[rt.chain];

  if (rt.introT > 0) rt.introT -= 1;
  if (rt.warningT > 0) rt.warningT -= 1;
  if (rt.lagFlash > 0) rt.lagFlash -= 1;

  // Movement
  const speed = 1.1 + rt.speedTier * 0.2;
  if (input.up) rt.player.y -= speed;
  if (input.down) rt.player.y += speed;
  if (input.left) rt.player.x -= speed;
  if (input.right) rt.player.x += speed;
  rt.player.x = Math.max(8, Math.min(RW - 28, rt.player.x));
  rt.player.y = Math.max(8, Math.min(PLAY_H - 16, rt.player.y));

  // Fire
  if (
    input.fire &&
    rt.t % chain.fireCadence === 0 &&
    rt.gasBudget > 0 &&
    rt.introT <= 0
  ) {
    rt.gasBudget = Math.max(0, rt.gasBudget - chain.gasPerShot);
    rt.txCount += 1;
    if (Math.random() < chain.lagChance) {
      rt.lagFlash = 30;
    } else {
      fireBullets(rt);
    }
  }

  // Stars
  for (const s of rt.stars) {
    s.x -= s.speed * 0.018;
    if (s.x < 0) {
      s.x = RW;
      s.y = Math.random() * PLAY_H;
    }
  }
  rt.terrain.scroll += 0.6 * (chain.enemyVx / 1);

  // Spawning
  if (rt.t > 60 && rt.t < GAME_DURATION_FRAMES - 30) {
    rt.nextGruntAt -= 1;
    if (rt.nextGruntAt <= 0) {
      spawnGruntWave(rt);
      rt.nextGruntAt = 180;
    }
    rt.nextMoaiAt -= 1;
    const liveMoai = rt.enemies.some((e) => e.type === 'moai');
    if (rt.nextMoaiAt <= 0 && !liveMoai) {
      spawnNextMoai(rt);
      rt.nextMoaiAt = 60 * 18;
    }
  }

  // Bullets
  rt.bullets = rt.bullets.filter((b) => {
    b.x += b.vx;
    if (b.vy) b.y += b.vy;
    return b.x < RW + 8;
  });

  // Enemies update
  for (const e of rt.enemies) {
    if (e.type === 'grunt') {
      e.x += e.vx;
      e.y += Math.sin(rt.t * 0.06 + e.phase) * 0.7;
      if (
        rt.t % 110 === Math.floor(e.phase * 13) % 110 &&
        e.x < RW - 6 &&
        e.x > 0
      ) {
        const dx = rt.player.x - e.x;
        const dy = rt.player.y - e.y;
        const m = Math.hypot(dx, dy) || 1;
        rt.enemyBullets.push({
          x: e.x,
          y: e.y + 4,
          vx: (dx / m) * 1.2,
          vy: (dy / m) * 1.2,
          life: 240,
        });
      }
    } else {
      if (e.x > e.targetX) e.x += e.vx;
      else e.vx = 0;
      e.fireCool -= 1;
      if (e.fireCool === 60) e.chargeT = 60;
      if (e.fireCool <= 0 && e.x < RW - 8) {
        const mx = e.x + 11;
        const my = e.fromTop ? e.y + 23 : e.y + 14;
        const ang = Math.atan2(rt.player.y - my, rt.player.x - mx);
        const sym =
          TX_SYMBOLS[Math.floor(rt.t / 60) % TX_SYMBOLS.length] ?? 'TX';
        for (let i = 0; i < 5; i += 1) {
          rt.rings.push({
            x: mx,
            y: my,
            vx: Math.cos(ang) * 1.3,
            vy: Math.sin(ang) * 1.3,
            life: 320,
            born: rt.t + i * 12,
            phase: i * 0.7,
            sym,
          });
        }
        e.fireCool = 240;
      }
      if (e.chargeT > 0) e.chargeT -= 1;
    }
  }

  // Bullet vs enemy
  for (const b of rt.bullets) {
    for (const e of rt.enemies) {
      const bw = e.type === 'moai' ? 24 : 12;
      const bh = e.type === 'moai' ? 28 : 10;
      const blen = b.kind === 'laser' ? 16 : 6;
      if (
        b.x < e.x + bw &&
        b.x + blen > e.x &&
        b.y < e.y + bh &&
        b.y + 2 > e.y
      ) {
        e.hp -= b.kind === 'laser' ? 2 : 1;
        if (b.kind !== 'laser') b.x = RW + 100;
        rt.explosions.push({ x: b.x, y: b.y, t: 0, kind: 'spark' });
        if (e.hp <= 0) {
          if (e.type === 'moai') {
            rt.score += 1500;
            rt.moaisDown += 1;
            rt.moaisDefeated[e.moaiId] = true;
            rt.events.push({
              kind: 'moaiKill',
              t: elapsedMs(rt),
              moaiId: e.moaiId,
            });
            rt.explosions.push({
              x: e.x + 12,
              y: e.y + 14,
              t: 0,
              kind: 'big',
            });
            rt.capsules.push({
              x: e.x + 8,
              y: e.y + 12,
              vx: -0.6,
              capsule: e.moaiId === 'hive' ? 'option' : 'shield',
              life: 360,
            });
            pushToast(
              rt,
              `${e.moaiId.toUpperCase()} DOWN +1500`,
              PAL.hudYellow
            );
          } else {
            rt.score += 100;
            rt.events.push({
              kind: 'shoot',
              t: elapsedMs(rt),
              enemyId: e.id,
              tradeoffLabel: e.tradeoffLeft,
            });
            rt.explosions.push({
              x: e.x + 4,
              y: e.y + 4,
              t: 0,
              kind: 'mid',
            });
            if (Math.random() < 0.45) {
              rt.capsules.push({
                x: e.x + 2,
                y: e.y + 4,
                vx: -0.6,
                capsule: e.capsule,
                life: 240,
              });
            }
          }
        }
      }
    }
  }
  rt.enemies = rt.enemies.filter((e) => {
    if (e.hp <= 0) return false;
    if (e.x < -40) {
      if (e.type === 'grunt') {
        rt.events.push({
          kind: 'pass',
          t: elapsedMs(rt),
          enemyId: e.id,
          tradeoffLabel: e.tradeoffRight,
        });
      }
      return false;
    }
    return true;
  });

  // Rings
  rt.rings = rt.rings.filter((r) => {
    if (rt.t < r.born) return true;
    r.x += r.vx;
    r.y += r.vy;
    r.life -= 1;
    return (
      r.life > 0 && r.x > -16 && r.x < RW + 16 && r.y > -16 && r.y < PLAY_H + 16
    );
  });

  // Enemy bullets
  rt.enemyBullets = rt.enemyBullets.filter((b) => {
    b.x += b.vx;
    b.y += b.vy;
    b.life -= 1;
    return (
      b.life > 0 && b.x > -8 && b.x < RW + 8 && b.y > -8 && b.y < PLAY_H + 8
    );
  });

  // Capsules drift + pickup
  rt.capsules = rt.capsules.filter((c) => {
    c.x += c.vx;
    c.life -= 1;
    if (Math.abs(c.x - rt.player.x) < 14 && Math.abs(c.y - rt.player.y) < 12) {
      const next = rt.bar < 0 ? 0 : (rt.bar + 1) % BAR_SLOTS.length;
      rt.bar = next;
      rt.capsulesPicked[c.capsule] += 1;
      rt.events.push({
        kind: 'capsule',
        t: elapsedMs(rt),
        capsule: c.capsule,
      });
      rt.events.push({
        kind: 'barAdvance',
        t: elapsedMs(rt),
        position: rt.bar,
      });
      const barLabel = BAR_SLOTS[rt.bar];
      pushToast(
        rt,
        `+${SLOT_LABEL[c.capsule]} → BAR ${barLabel ? SLOT_LABEL[barLabel] : '—'}`,
        PAL.ringCyan
      );
      return false;
    }
    return c.x > -10 && c.life > 0;
  });

  // Player vs hazards
  if (rt.player.iframes > 0) rt.player.iframes -= 1;
  const hit = (hx: number, hy: number, hr: number) => {
    const dx = rt.player.x + 8 - hx;
    const dy = rt.player.y + 5 - hy;
    return dx * dx + dy * dy < hr * hr;
  };
  if (rt.player.iframes <= 0 && rt.introT <= 0) {
    for (const r of rt.rings) {
      if (rt.t < r.born) continue;
      if (hit(r.x, r.y, 5)) {
        if (rt.hasShield) {
          rt.hasShield = false;
          pushToast(rt, 'SHIELD ABSORBED', PAL.ringCyan);
        } else {
          rt.player.hp -= 1;
          rt.events.push({ kind: 'hit', t: elapsedMs(rt), damage: 1 });
        }
        rt.player.iframes = 60;
        rt.explosions.push({
          x: rt.player.x,
          y: rt.player.y,
          t: 0,
          kind: 'mid',
        });
        break;
      }
    }
    if (rt.player.iframes <= 0) {
      for (const b of rt.enemyBullets) {
        if (hit(b.x, b.y, 4)) {
          if (rt.hasShield) {
            rt.hasShield = false;
            pushToast(rt, 'SHIELD ABSORBED', PAL.ringCyan);
          } else {
            rt.player.hp -= 1;
            rt.events.push({ kind: 'hit', t: elapsedMs(rt), damage: 1 });
          }
          rt.player.iframes = 60;
          rt.explosions.push({
            x: rt.player.x,
            y: rt.player.y,
            t: 0,
            kind: 'mid',
          });
          break;
        }
      }
    }
  }

  // Options orbit
  for (const o of rt.options) o.ang += 0.06;

  // Explosions
  for (const ex of rt.explosions) ex.t += 1;
  rt.explosions = rt.explosions.filter(
    (ex) => ex.t < (ex.kind === 'big' ? 32 : ex.kind === 'mid' ? 16 : 6)
  );

  // Toasts
  for (const t of rt.toasts) t.life -= 1;
  rt.toasts = rt.toasts.filter((t) => t.life > 0);

  // End conditions
  if (rt.player.hp <= 0) {
    rt.finished = true;
    rt.finishReason = 'hp';
  } else if (rt.t >= GAME_DURATION_FRAMES) {
    rt.finished = true;
    rt.finishReason = 'time';
  } else if (
    rt.moaisDown >= MOAI_CYCLE.length &&
    rt.enemies.every((e) => e.type !== 'moai')
  ) {
    rt.finished = true;
    rt.finishReason = 'cleared';
  }
}

export function buildPlayLog(rt: Runtime, sessionId: string): PlayLog {
  return {
    sessionId,
    durationMs: Math.round((Math.min(rt.t, GAME_DURATION_FRAMES) / 60) * 1000),
    finalScore: rt.score,
    events: rt.events,
  };
}

// ----------------- Render -----------------

export function render(ctx: CanvasRenderingContext2D, rt: Runtime) {
  ctx.fillStyle = PAL.black;
  ctx.fillRect(0, 0, RW, RH);

  for (const s of rt.stars) {
    ctx.fillStyle = s.bright ? PAL.starBright : PAL.starDim;
    ctx.fillRect(s.x | 0, s.y | 0, 1, 1);
  }

  drawTerrainStrip(ctx, rt.terrain.ceiling, rt.terrain.scroll, false);
  drawTerrainStrip(ctx, rt.terrain.floor, rt.terrain.scroll, true);

  // Capsules
  for (const c of rt.capsules) {
    const blink = (rt.t >> 2) % 2 === 0;
    ctx.fillStyle = blink ? PAL.ringCyan : PAL.ringCore;
    ctx.fillRect((c.x | 0) - 3, (c.y | 0) - 2, 7, 5);
    ctx.fillStyle = PAL.deepBlue;
    ctx.fillRect((c.x | 0) - 2, (c.y | 0) - 1, 5, 3);
    pixelText(ctx, '?', (c.x | 0) - 1, (c.y | 0) - 2, PAL.ringCore);
  }

  // Enemies
  for (const e of rt.enemies) {
    if (e.type === 'grunt') {
      drawSprite(ctx, GRUNT, GRUNT_KEY, e.x | 0, e.y | 0);
    } else {
      const key = e.chargeT > 0 ? MOAI_CHARGE_KEY : MOAI_KEY;
      drawSprite(ctx, MOAI, key, e.x | 0, e.y | 0, false, e.fromTop);
      const ratio = Math.max(0, e.hp / e.maxHp);
      const barX = (e.x | 0) - 2;
      const barY = (e.y | 0) - 4;
      ctx.fillStyle = PAL.deepBlue;
      ctx.fillRect(barX, barY, 28, 2);
      ctx.fillStyle = ratio > 0.4 ? PAL.ok : PAL.warn;
      ctx.fillRect(barX, barY, Math.round(28 * ratio), 2);
    }
  }

  // Player bullets
  for (const b of rt.bullets) {
    if (b.kind === 'laser') {
      ctx.fillStyle = PAL.ringCore;
      ctx.fillRect(b.x | 0, b.y | 0, 16, 1);
      ctx.fillStyle = PAL.ringCyan;
      ctx.fillRect(b.x | 0, (b.y | 0) + 1, 16, 1);
    } else {
      ctx.fillStyle = PAL.bullet;
      ctx.fillRect(b.x | 0, b.y | 0, 6, 2);
      ctx.fillStyle = PAL.shipFlame;
      ctx.fillRect((b.x | 0) + 4, b.y | 0, 2, 2);
    }
  }

  // Rings
  for (const r of rt.rings) {
    if (rt.t < r.born) continue;
    const phase = (rt.t - r.born) * 0.18 + r.phase;
    const radius = 4 + ((Math.sin(phase) * 0.5) | 0);
    drawRing(ctx, r.x | 0, r.y | 0, radius, r.sym, PAL.ringCyan, PAL.ringCore);
  }

  // Enemy bullets
  for (const b of rt.enemyBullets) {
    ctx.fillStyle = PAL.ringCore;
    ctx.fillRect((b.x | 0) - 1, (b.y | 0) - 1, 3, 3);
  }

  // Options
  for (const o of rt.options) {
    const op = optionPos(rt, o);
    drawSprite(ctx, OPTION_SPR, OPTION_KEY, op.x | 0, op.y | 0);
  }

  // Player
  if (!(rt.player.iframes > 0 && (rt.t >> 1) % 2 === 0)) {
    drawSprite(ctx, VIC_VIPER, VIC_KEY, rt.player.x | 0, rt.player.y | 0);
    if (rt.hasShield) {
      ctx.fillStyle = PAL.ringCyan;
      const px = rt.player.x | 0;
      const py = rt.player.y | 0;
      ctx.fillRect(px + 18, py + 2, 2, 2);
      ctx.fillRect(px + 20, py + 1, 2, 4);
      ctx.fillRect(px + 22, py + 3, 1, 1);
    }
  }

  // Explosions
  for (const ex of rt.explosions) {
    drawExplosion(ctx, ex.x, ex.y, ex.t, ex.kind);
  }

  // WARNING banner
  if (rt.warningT > 0) {
    const flicker = (rt.warningT >> 2) % 2 === 0;
    if (flicker) {
      ctx.fillStyle = 'rgba(255, 48, 96, 0.32)';
      ctx.fillRect(0, PLAY_H / 2 - 14, RW, 28);
      drawBigText(ctx, 'WARNING', RW / 2 - 42, PLAY_H / 2 - 7, PAL.warn);
    }
  }

  // Intro banner
  if (rt.introT > 0) {
    ctx.fillStyle = 'rgba(0, 16, 42, 0.78)';
    ctx.fillRect(0, PLAY_H / 2 - 18, RW, 36);
    drawBigText(ctx, 'STAGE 1', RW / 2 - 42, PLAY_H / 2 - 14, PAL.hudYellow);
    pixelText(
      ctx,
      'MOAI · WEB3 ONBOARDING',
      RW / 2 - 66,
      PLAY_H / 2 + 5,
      PAL.shipWhite
    );
  }

  drawHud(ctx, rt);
}

function drawExplosion(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  t: number,
  kind: Explosion['kind']
) {
  const max = kind === 'big' ? 22 : kind === 'mid' ? 12 : 4;
  const r = Math.min(max, 2 + t);
  const colors = [PAL.shipFlame, PAL.shipRed, PAL.shipFlame2, PAL.bullet];
  const count = kind === 'big' ? 22 : kind === 'mid' ? 12 : 4;
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2;
    const rr = r * (0.6 + ((i * 7) % 5) / 10);
    const x = Math.round(cx + Math.cos(a) * rr);
    const y = Math.round(cy + Math.sin(a) * rr);
    const color = colors[(i + t) % 4];
    if (color) ctx.fillStyle = color;
    ctx.fillRect(x, y, 2, 2);
  }
}

function drawHud(ctx: CanvasRenderingContext2D, rt: Runtime) {
  // Top status strip (above play)
  ctx.fillStyle = 'rgba(0, 16, 42, 0.85)';
  ctx.fillRect(0, 0, RW, 12);
  const timeLeft = Math.max(0, GAME_DURATION_FRAMES - rt.t);
  const sec = Math.ceil(timeLeft / 60);
  pixelText(ctx, `TIME ${String(sec).padStart(2, '0')}`, 4, 2, PAL.hudWhite);
  pixelText(
    ctx,
    `MOAI ${rt.moaisDown}/${MOAI_CYCLE.length}`,
    66,
    2,
    PAL.hudYellow
  );
  pixelText(ctx, `APY ${rt.apy}%`, 138, 2, PAL.shipFlame);
  pixelText(ctx, `RISK ${rt.risk}/10`, 184, 2, PAL.warn);

  // Web3 chain row
  ctx.fillStyle = 'rgba(0, 16, 42, 0.85)';
  ctx.fillRect(0, PLAY_H - 12, RW, 12);
  const chain = CHAINS[rt.chain];
  ctx.fillStyle = chain.color;
  ctx.fillRect(2, PLAY_H - 11, 4, 10);
  pixelText(ctx, chain.name, 9, PLAY_H - 10, chain.color);
  pixelText(ctx, 'GAS', 80, PLAY_H - 10, PAL.hudWhite);
  const gasW = 60;
  ctx.fillStyle = PAL.hudGray;
  ctx.fillRect(98, PLAY_H - 9, gasW, 5);
  ctx.fillStyle = rt.gasBudget > 0.3 ? PAL.ok : PAL.warn;
  ctx.fillRect(98, PLAY_H - 9, (gasW * rt.gasBudget) | 0, 5);
  pixelText(
    ctx,
    `TX ${String(rt.txCount).padStart(3, '0')}`,
    164,
    PLAY_H - 10,
    PAL.hudYellow
  );
  if (rt.lagFlash > 0) {
    pixelText(ctx, 'TX DROPPED', RW / 2 - 30, PLAY_H - 28, PAL.warn);
  }

  // Bottom HUD with lives + power bar
  ctx.fillStyle = PAL.deepBlue;
  ctx.fillRect(0, PLAY_H, RW, 24);
  ctx.fillStyle = PAL.hudGray;
  ctx.fillRect(0, PLAY_H, RW, 1);

  for (let i = 0; i < rt.player.hp; i += 1) {
    drawTinyShip(ctx, 4 + i * 9, PLAY_H + 14);
  }

  const slotW = 32;
  const startX = 36;
  const slotY = PLAY_H + 2;
  for (let i = 0; i < BAR_SLOTS.length; i += 1) {
    const sx = startX + i * (slotW + 2);
    const slotKey = BAR_SLOTS[i];
    if (!slotKey) continue;
    const isActive = i === rt.bar;
    const isCommitted = rt.commits[slotKey] > 0;
    ctx.fillStyle = isActive ? PAL.hudOrange : PAL.hudBlue;
    ctx.fillRect(sx, slotY, slotW, 9);
    ctx.fillStyle = isActive
      ? PAL.hudYellow
      : isCommitted
        ? PAL.ok
        : PAL.hudWhite;
    ctx.fillRect(sx, slotY, slotW, 1);
    ctx.fillRect(sx, slotY + 8, slotW, 1);
    ctx.fillRect(sx, slotY, 1, 9);
    ctx.fillRect(sx + slotW - 1, slotY, 1, 9);
    pixelText(
      ctx,
      SLOT_LABEL[slotKey],
      sx + slotW / 2 - 8,
      slotY + 1,
      isActive ? PAL.black : PAL.hudWhite
    );
    if (rt.commits[slotKey] > 0) {
      pixelText(
        ctx,
        String(rt.commits[slotKey]),
        sx + slotW - 6,
        slotY + 1,
        PAL.hudYellow
      );
    }
  }

  // Score
  pixelText(ctx, '1P', 4, PLAY_H + 14, PAL.hudWhite);
  pixelText(
    ctx,
    String(rt.score).padStart(7, '0'),
    18,
    PLAY_H + 14,
    PAL.hudYellow
  );
  pixelText(ctx, 'Z=COMMIT  SPACE=FIRE', RW - 124, PLAY_H + 14, PAL.shipWhite);

  // Toast stack (top right)
  for (let i = 0; i < rt.toasts.length; i += 1) {
    const toast = rt.toasts[i];
    if (!toast) continue;
    const alpha = Math.min(1, toast.life / 30);
    ctx.fillStyle = `rgba(0, 16, 42, ${0.85 * alpha})`;
    ctx.fillRect(RW - 100, 14 + i * 9, 96, 8);
    ctx.fillStyle = toast.color;
    ctx.fillRect(RW - 100, 14 + i * 9, 2, 8);
    pixelText(ctx, toast.text.slice(0, 14), RW - 96, 15 + i * 9, PAL.hudWhite);
  }
}

function drawTinyShip(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = PAL.shipBlue;
  ctx.fillRect(x, y + 2, 8, 3);
  ctx.fillStyle = PAL.shipWhite;
  ctx.fillRect(x + 2, y + 1, 4, 1);
  ctx.fillStyle = PAL.shipRed;
  ctx.fillRect(x + 1, y + 5, 2, 1);
  ctx.fillRect(x + 5, y + 5, 2, 1);
  ctx.fillStyle = PAL.shipFlame;
  ctx.fillRect(x - 1, y + 3, 1, 1);
}

export function commit(rt: Runtime) {
  commitCapsule(rt);
}

export function setChain(rt: Runtime, chain: ChainId) {
  rt.chain = chain;
}

export const TOTAL_FRAMES = GAME_DURATION_FRAMES;
