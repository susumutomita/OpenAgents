import type {
  Capsule,
  MoaiId,
  PlayEvent,
  PlayLog,
} from '@gradiusweb3/shared/browser';
import { CHAINS, type ChainId } from './chains';
import { drawBigText, pixelText } from './font';
import { PAL, PLAY_H, RH, RW } from './palette';
import { playSfx } from './sfx';
import {
  GRUNT,
  GRUNT_KEY,
  MOAI,
  MOAI_CHARGE_KEY,
  MOAI_KEY,
  type SpriteKey,
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

// ----------------------------------------------------------------------
// MARIO 1-1 DESIGN PHILOSOPHY
// ----------------------------------------------------------------------
// 1) The first enemy is a SHIELD module. Destroying it visibly commits a
//    circuit breaker into the Agent loadout.
// 2) Later waves add SPEED / OPTION / LASER / MISSILE modules with higher cost.
// 3) Moai are production constraints: gas, latency, MEV, oracle drift, peer drift.
// 4) At 60s, committed modules derive the Agent profile and DeFi policy.
//
// No power-up bar. No "commit" button. No manual.
// ----------------------------------------------------------------------

export const GAME_DURATION_FRAMES = 60 * 60; // 60 seconds @ 60fps
export const TUTORIAL_FRAMES = 60 * 4; // 4 second tutorial

export type Archetype = 'conservative' | 'balanced' | 'aggressive';

const ARCHETYPE_ORDER: Archetype[] = ['conservative', 'balanced', 'aggressive'];

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
  conservative: '#7bdff2',
  balanced: '#f8d840',
  aggressive: '#ff5252',
};

export const ARCHETYPE_GLYPH: Record<Archetype, string> = {
  conservative: 'SAFE',
  balanced: 'MID',
  aggressive: 'RISK',
};

type Capability = Exclude<Capsule, 'double'>;

export const CAPABILITY_ORDER: Capability[] = [
  'shield',
  'speed',
  'option',
  'laser',
  'missile',
];

export const CAPABILITY_LABEL: Record<Capability, string> = {
  shield: 'SHIELD',
  speed: 'SPEED',
  option: 'OPTION',
  laser: 'LASER',
  missile: 'MISSILE',
};

export const CAPABILITY_HUD_LABEL: Record<Capability, string> = {
  shield: 'SHLD',
  speed: 'SPD',
  option: 'OPT',
  laser: 'LSR',
  missile: 'MSL',
};

export const CAPABILITY_DESC: Record<Capability, string> = {
  shield: 'CIRCUIT BREAKER',
  speed: 'L2 FAST EXEC',
  option: 'AXL PEER NODE',
  laser: '0G REASONING',
  missile: 'UNISWAP ROUTER',
};

export const CAPABILITY_COLOR: Record<Capability, string> = {
  shield: '#7bdff2',
  speed: '#ff8db3',
  option: '#40f070',
  laser: '#ff5252',
  missile: '#c084ff',
};

const CAPABILITY_BAR_POSITION: Record<Capability, number> = {
  speed: 0,
  missile: 1,
  laser: 3,
  option: 4,
  shield: 5,
};

const MOAI_CONSTRAINT: Record<
  MoaiId,
  { label: string; detail: string; capability: Capability }
> = {
  aegis: {
    label: 'GAS WALL',
    detail: 'caps position size',
    capability: 'shield',
  },
  razor: {
    label: 'MEV RAZOR',
    detail: 'punishes sloppy swaps',
    capability: 'laser',
  },
  oracle: {
    label: 'ORACLE DRIFT',
    detail: 'forces market checks',
    capability: 'missile',
  },
  comet: {
    label: 'LATENCY COMET',
    detail: 'demands fast execution',
    capability: 'speed',
  },
  hive: {
    label: 'PEER DRIFT',
    detail: 'tests AXL coordination',
    capability: 'option',
  },
};

// Enemies are Agent capability modules, not decorative characters. Destroying
// one records a capsule + commit, so the arcade loop directly changes policy.
interface EnemyCapability {
  capability: Capability;
  archetype: Archetype;
  color: string;
  flashColor: string;
  spriteKey: SpriteKey;
  scoreOnKill: number;
  // 0 = passive, 1 = sine wave, sometimes shoots, 2 = aggressive shooter
  aggression: 0 | 1 | 2;
}

const ENEMY_CAPABILITIES: readonly EnemyCapability[] = [
  {
    capability: 'shield',
    archetype: 'conservative',
    color: CAPABILITY_COLOR.shield,
    flashColor: '#a0f8ff',
    scoreOnKill: 50,
    aggression: 0,
    spriteKey: {
      ...GRUNT_KEY,
      O: '#7bdff2',
      Y: '#cdebff',
      W: '#fefae0',
      B: '#1d6f8a',
    },
  },
  {
    capability: 'speed',
    archetype: 'balanced',
    color: CAPABILITY_COLOR.speed,
    flashColor: '#ffc2d9',
    scoreOnKill: 120,
    aggression: 1,
    spriteKey: {
      ...GRUNT_KEY,
      O: CAPABILITY_COLOR.speed,
      Y: '#ffc2d9',
      W: '#fefae0',
      B: '#92345d',
    },
  },
  {
    capability: 'option',
    archetype: 'balanced',
    color: CAPABILITY_COLOR.option,
    flashColor: '#a8ffbd',
    scoreOnKill: 180,
    aggression: 1,
    spriteKey: {
      ...GRUNT_KEY,
      O: CAPABILITY_COLOR.option,
      Y: '#a8ffbd',
      W: '#fefae0',
      B: '#127a35',
    },
  },
  {
    capability: 'laser',
    archetype: 'aggressive',
    color: CAPABILITY_COLOR.laser,
    flashColor: '#ffb3b3',
    scoreOnKill: 320,
    aggression: 2,
    spriteKey: {
      ...GRUNT_KEY,
      O: CAPABILITY_COLOR.laser,
      Y: '#ffb3b3',
      W: '#fefae0',
      B: '#7a1a1a',
    },
  },
  {
    capability: 'missile',
    archetype: 'aggressive',
    color: CAPABILITY_COLOR.missile,
    flashColor: '#dec0ff',
    scoreOnKill: 260,
    aggression: 2,
    spriteKey: {
      ...GRUNT_KEY,
      O: CAPABILITY_COLOR.missile,
      Y: '#dec0ff',
      W: '#fefae0',
      B: '#4d247a',
    },
  },
];

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
}

interface Enemy {
  type: 'grunt';
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  hp: number;
  capability: Capability;
  archetype: Archetype;
  color: string;
  flashColor: string;
  spriteKey: SpriteKey;
  scoreOnKill: number;
  aggression: 0 | 1 | 2;
  fireCool: number;
  spawnAt: number;
  isTutorial: boolean;
}

interface MoaiBoss {
  type: 'moai';
  id: string;
  moaiId: MoaiId;
  x: number;
  y: number;
  vx: number;
  targetX: number;
  hp: number;
  maxHp: number;
  fromTop: boolean;
  chargeT: number;
  fireCool: number;
  spawnAt: number;
}

interface EnemyBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface ScorePop {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Toast {
  text: string;
  color: string;
  life: number;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface Runtime {
  t: number;
  player: PlayerState;
  bullets: Bullet[];
  enemies: (Enemy | MoaiBoss)[];
  enemyBullets: EnemyBullet[];
  scorePops: ScorePop[];
  particles: Particle[];
  toasts: Toast[];
  stars: Star[];
  terrain: Terrain;
  events: PlayEvent[];
  score: number;
  votes: Record<Archetype, number>;
  loadout: Record<Capability, number>;
  chain: ChainId;
  nextEnemyAt: number;
  nextMoaiAt: number;
  nextShotAt: number;
  enemyCounter: number;
  bossCounter: number;
  particleCounter: number;
  warningT: number;
  flashT: number;
  /// Frames remaining in the player death animation. While > 0, the player
  /// sprite is hidden, particles play out, and `finished` stays false so the
  /// canvas keeps rendering the explosion. Reaches 0 → finished = true.
  dyingT: number;
  finished: boolean;
  finishReason: 'time' | 'hp' | null;
  showTutorialPrompt: boolean;
  spawnedTutorial: boolean;
  tutorialStep: number;
  nextTutorialAt: number;
  archetypePeek: Archetype;
  lastCommit: Capability | null;
  lastCommitT: number;
}

export function createRuntime(chain: ChainId = 'ARB'): Runtime {
  return {
    t: 0,
    player: { x: 60, y: PLAY_H / 2, hp: 4, iframes: 90 },
    bullets: [],
    enemies: [],
    enemyBullets: [],
    scorePops: [],
    particles: [],
    toasts: [],
    stars: makeStars(),
    terrain: makeTerrain(),
    events: [],
    score: 0,
    votes: { conservative: 0, balanced: 0, aggressive: 0 },
    loadout: { shield: 0, speed: 0, option: 0, laser: 0, missile: 0 },
    chain,
    nextEnemyAt: 60,
    nextMoaiAt: 60 * 25,
    nextShotAt: 0,
    enemyCounter: 0,
    bossCounter: 0,
    particleCounter: 0,
    warningT: 0,
    flashT: 0,
    dyingT: 0,
    finished: false,
    finishReason: null,
    showTutorialPrompt: true,
    spawnedTutorial: false,
    tutorialStep: 0,
    nextTutorialAt: 30,
    archetypePeek: 'balanced',
    lastCommit: null,
    lastCommitT: 0,
  };
}

function capabilityById(capability: Capability): EnemyCapability {
  const spec = ENEMY_CAPABILITIES.find(
    (candidate) => candidate.capability === capability
  );
  if (!spec) {
    throw new Error(`Unknown capability: ${capability}`);
  }

  return spec;
}

function elapsedMs(rt: Runtime) {
  return Math.round((rt.t / 60) * 1000);
}

function pushToast(rt: Runtime, text: string, color: string) {
  rt.toasts.unshift({ text, color, life: 90 });
  if (rt.toasts.length > 3) rt.toasts.pop();
}

function spawnBurst(
  rt: Runtime,
  x: number,
  y: number,
  color: string,
  count: number
) {
  for (let i = 0; i < count; i += 1) {
    rt.particleCounter += 1;
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 200;
    rt.particles.push({
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

function pickEnemyCapability(rt: Runtime): EnemyCapability {
  const capability =
    CAPABILITY_ORDER[rt.enemyCounter % CAPABILITY_ORDER.length] ?? 'shield';
  return capabilityById(capability);
}

function commitCapability(rt: Runtime, capability: Capability, t: number) {
  rt.loadout[capability] += 1;
  rt.lastCommit = capability;
  rt.lastCommitT = rt.t;
  const position = CAPABILITY_BAR_POSITION[capability];
  rt.events.push({ kind: 'capsule', t, capsule: capability });
  rt.events.push({ kind: 'barAdvance', t, position });
  rt.events.push({ kind: 'commit', t, position, capsule: capability });
}

function spawnTutorialEnemy(rt: Runtime) {
  // First: SHIELD teaches "shoot = commit a policy module".
  // Then LASER bites back, so the player learns stronger modules carry cost.
  const slot = rt.tutorialStep;
  const spec = slot === 0 ? capabilityById('shield') : capabilityById('laser');
  rt.enemies.push({
    type: 'grunt',
    id: `tutorial-${rt.enemyCounter}-${slot}`,
    x: RW + 16,
    y: PLAY_H / 2 - 5 + (slot === 1 ? -22 : 0),
    vx: -0.55,
    vy: 0,
    phase: 0,
    hp: 1,
    capability: spec.capability,
    archetype: spec.archetype,
    color: spec.color,
    flashColor: spec.flashColor,
    spriteKey: spec.spriteKey,
    scoreOnKill: spec.scoreOnKill,
    aggression: spec.aggression,
    fireCool: 60,
    spawnAt: rt.t,
    isTutorial: true,
  });
  rt.enemyCounter += 1;
  rt.tutorialStep += 1;
}

function spawnEnemyWave(rt: Runtime) {
  // Each wave is one capability, so the player understands each commit.
  const capabilityChoice = pickEnemyCapability(rt);
  const wave =
    capabilityChoice.aggression === 2
      ? 2 + (rt.enemyCounter % 2) // high-cost waves are smaller but dangerous
      : capabilityChoice.aggression === 1
        ? 3 + (rt.enemyCounter % 2)
        : 4 + (rt.enemyCounter % 2);
  const yBase = 30 + ((rt.enemyCounter * 31) % 80);
  for (let i = 0; i < wave; i += 1) {
    rt.enemies.push({
      type: 'grunt',
      id: `g-${rt.enemyCounter}-${i}`,
      x: RW + 16 + i * 22,
      y: yBase + i * 14 + Math.sin(rt.t * 0.01 + i) * 4,
      vx: -1.0 - (capabilityChoice.aggression === 2 ? 0.4 : 0),
      vy: 0,
      phase: rt.t * 0.02 + i,
      hp: 1,
      capability: capabilityChoice.capability,
      archetype: capabilityChoice.archetype,
      color: capabilityChoice.color,
      flashColor: capabilityChoice.flashColor,
      spriteKey: capabilityChoice.spriteKey,
      scoreOnKill: capabilityChoice.scoreOnKill,
      aggression: capabilityChoice.aggression,
      fireCool: 60 + i * 18,
      spawnAt: rt.t,
      isTutorial: false,
    });
  }
  rt.enemyCounter += 1;
}

const MOAI_CYCLE: MoaiId[] = ['aegis', 'razor', 'oracle', 'comet', 'hive'];

function spawnNextMoai(rt: Runtime) {
  if (rt.bossCounter >= MOAI_CYCLE.length) return;
  const moaiId = MOAI_CYCLE[rt.bossCounter];
  if (!moaiId) return;
  rt.bossCounter += 1;
  const fromTop = rt.bossCounter % 2 === 0;
  rt.enemies.push({
    type: 'moai',
    id: `m-${moaiId}`,
    moaiId,
    x: RW + 24,
    y: fromTop ? 14 : PLAY_H - 42,
    vx: -0.4,
    targetX: RW - 60,
    hp: 6,
    maxHp: 6,
    fromTop,
    chargeT: 0,
    fireCool: 200,
    spawnAt: rt.t,
  });
  rt.warningT = 90;
  const constraint = MOAI_CONSTRAINT[moaiId];
  pushToast(rt, `${constraint.label} INBOUND`, PAL.warn);
}

export function step(rt: Runtime, input: InputState) {
  if (rt.finished) return;
  rt.t += 1;
  const chain = CHAINS[rt.chain];
  if (rt.warningT > 0) rt.warningT -= 1;
  if (rt.flashT > 0) rt.flashT -= 1;

  // Tutorial sequencing:
  //   step 0: a slow SHIELD drifts in. Player auto-shoots -> circuit breaker.
  //   step 1: a LASER drifts in and fires back -> precision has operational cost.
  if (rt.tutorialStep < 2 && rt.t >= rt.nextTutorialAt) {
    spawnTutorialEnemy(rt);
    rt.nextTutorialAt = rt.t + 150;
    if (rt.tutorialStep >= 2) {
      rt.spawnedTutorial = true;
    }
  }
  if (rt.tutorialStep >= 2) rt.spawnedTutorial = true;

  // Hide tutorial prompt once the player has visibly engaged
  if (rt.score > 0) rt.showTutorialPrompt = false;
  if (rt.t > TUTORIAL_FRAMES + 60) rt.showTutorialPrompt = false;

  // Movement (the only action the player needs to know)
  if (rt.player.iframes > 0) rt.player.iframes -= 1;
  const sp = 1.4;
  if (input.up) rt.player.y -= sp;
  if (input.down) rt.player.y += sp;
  if (input.left) rt.player.x -= sp;
  if (input.right) rt.player.x += sp;
  rt.player.x = Math.max(8, Math.min(RW - 28, rt.player.x));
  rt.player.y = Math.max(8, Math.min(PLAY_H - 16, rt.player.y));

  // Auto-fire (no button needed)
  if (rt.t >= rt.nextShotAt) {
    rt.bullets.push({
      x: rt.player.x + 14,
      y: rt.player.y + 4,
      vx: chain.bulletVx,
    });
    rt.nextShotAt = rt.t + Math.max(4, chain.fireCadence);
  }

  // Stars + terrain
  for (const s of rt.stars) {
    s.x -= s.speed * 0.018;
    if (s.x < 0) {
      s.x = RW;
      s.y = Math.random() * PLAY_H;
    }
  }
  rt.terrain.scroll += 0.6;

  // Enemy spawning (after tutorial gives intro time)
  if (rt.spawnedTutorial && rt.score > 0 && rt.t > 60) {
    rt.nextEnemyAt -= 1;
    if (rt.nextEnemyAt <= 0) {
      spawnEnemyWave(rt);
      rt.nextEnemyAt = Math.max(70, 160 - rt.t / 12);
    }
  }
  rt.nextMoaiAt -= 1;
  const liveMoai = rt.enemies.some((e) => e.type === 'moai');
  if (rt.nextMoaiAt <= 0 && !liveMoai && rt.t > 60 * 20) {
    spawnNextMoai(rt);
    rt.nextMoaiAt = 60 * 18;
  }

  // Bullets
  rt.bullets = rt.bullets.filter((b) => {
    b.x += b.vx;
    return b.x < RW + 8;
  });

  // Bullet vs enemy
  for (const b of rt.bullets) {
    for (const e of rt.enemies) {
      const bw = e.type === 'moai' ? 24 : 12;
      const bh = e.type === 'moai' ? 28 : 10;
      if (b.x < e.x + bw && b.x + 6 > e.x && b.y < e.y + bh && b.y + 2 > e.y) {
        e.hp -= 1;
        b.x = RW + 100;
        if (e.type === 'moai') {
          spawnBurst(rt, b.x, e.y, '#ffe66d', 6);
        } else {
          spawnBurst(rt, b.x, e.y, e.flashColor, 4);
        }
        if (e.hp <= 0) {
          if (e.type === 'moai') {
            playSfx('moai');
            const constraint = MOAI_CONSTRAINT[e.moaiId];
            rt.score += 1500;
            rt.events.push({
              kind: 'moaiKill',
              t: elapsedMs(rt),
              moaiId: e.moaiId,
            });
            commitCapability(rt, constraint.capability, elapsedMs(rt));
            spawnBurst(rt, e.x + 12, e.y + 14, '#ffd166', 50);
            pushToast(
              rt,
              `${constraint.capability.toUpperCase()} COMMITTED`,
              PAL.hudYellow
            );
            rt.scorePops.push({
              x: e.x + 12,
              y: e.y + 14,
              text: `+1500 ${CAPABILITY_HUD_LABEL[constraint.capability]}`,
              color: PAL.hudYellow,
              life: 1.4,
            });
          } else {
            playSfx('kill');
            // Commit the capability into the Agent policy; score scales by cost.
            rt.votes[e.archetype] += 1;
            rt.score += e.scoreOnKill;
            commitCapability(rt, e.capability, elapsedMs(rt));
            rt.events.push({
              kind: 'shoot',
              t: elapsedMs(rt),
              enemyId: e.id,
              tradeoffLabel: `${CAPABILITY_LABEL[e.capability]} / ${
                CAPABILITY_DESC[e.capability]
              }`,
            });
            spawnBurst(rt, e.x + 4, e.y + 4, e.flashColor, 14);
            rt.scorePops.push({
              x: e.x + 4,
              y: e.y + 4,
              text: `+${e.scoreOnKill} ${CAPABILITY_HUD_LABEL[e.capability]}`,
              color: e.color,
              life: 1.0,
            });
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
          tradeoffLabel: `SKIP ${CAPABILITY_LABEL[e.capability]}`,
        });
      }
      return false;
    }
    return true;
  });

  // Enemy update + per-capability firing behavior
  for (const e of rt.enemies) {
    if (e.type === 'grunt') {
      e.x += e.vx;
      // Aggression-driven bobbing: passive = straight, mid = sine, risk = chasing.
      if (e.aggression === 1 && !e.isTutorial) {
        e.y += Math.sin(rt.t * 0.06 + e.phase) * 0.9;
      } else if (e.aggression === 2 && !e.isTutorial) {
        // Risk enemies drift toward the player vertically (slow homing).
        const dy = rt.player.y - e.y;
        e.y += Math.sign(dy) * Math.min(Math.abs(dy), 0.55);
      }
      // Fire rules: passive never fires. Mid fires occasional. Risk fires fast.
      e.fireCool -= 1;
      if (e.aggression > 0 && e.fireCool <= 0 && e.x < RW - 8 && e.x > 8) {
        const dx = rt.player.x - e.x;
        const dy = rt.player.y - e.y;
        const m = Math.hypot(dx, dy) || 1;
        const speed = e.aggression === 2 ? 1.7 : 1.1;
        rt.enemyBullets.push({
          x: e.x + 4,
          y: e.y + 4,
          vx: (dx / m) * speed,
          vy: (dy / m) * speed,
          life: 240,
        });
        e.fireCool =
          e.aggression === 2
            ? 70 + Math.floor(Math.random() * 30)
            : 180 + Math.floor(Math.random() * 80);
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
        for (let i = 0; i < 5; i += 1) {
          rt.enemyBullets.push({
            x: mx,
            y: my,
            vx: Math.cos(ang) * 1.3,
            vy: Math.sin(ang) * 1.3,
            life: 320,
          });
        }
        e.fireCool = 240;
      }
      if (e.chargeT > 0) e.chargeT -= 1;
    }
  }

  // Enemy bullets
  rt.enemyBullets = rt.enemyBullets.filter((b) => {
    b.x += b.vx;
    b.y += b.vy;
    b.life -= 1;
    return (
      b.life > 0 && b.x > -8 && b.x < RW + 8 && b.y > -8 && b.y < PLAY_H + 8
    );
  });

  // Player damage
  if (rt.player.iframes <= 0) {
    const hit = (hx: number, hy: number, hr: number) => {
      const dx = rt.player.x + 8 - hx;
      const dy = rt.player.y + 5 - hy;
      return dx * dx + dy * dy < hr * hr;
    };
    for (const b of rt.enemyBullets) {
      if (hit(b.x, b.y, 4)) {
        rt.player.hp -= 1;
        rt.events.push({ kind: 'hit', t: elapsedMs(rt), damage: 1 });
        rt.player.iframes = 60;
        rt.flashT = 18;
        spawnBurst(rt, rt.player.x + 8, rt.player.y + 5, '#ff5252', 28);
        spawnBurst(rt, rt.player.x + 8, rt.player.y + 5, '#ffe66d', 12);
        pushToast(rt, `HULL ${rt.player.hp}`, PAL.warn);
        playSfx('hit');
        break;
      }
    }
    if (rt.player.iframes <= 0) {
      for (const e of rt.enemies) {
        const ew = e.type === 'moai' ? 24 : 12;
        const eh = e.type === 'moai' ? 28 : 10;
        if (
          rt.player.x + 16 > e.x &&
          rt.player.x < e.x + ew &&
          rt.player.y + 10 > e.y &&
          rt.player.y < e.y + eh
        ) {
          rt.player.hp -= e.type === 'moai' ? 2 : 1;
          rt.player.iframes = 60;
          rt.flashT = 18;
          rt.events.push({
            kind: 'hit',
            t: elapsedMs(rt),
            damage: e.type === 'moai' ? 2 : 1,
          });
          spawnBurst(rt, rt.player.x + 8, rt.player.y + 5, '#ff5252', 30);
          spawnBurst(rt, rt.player.x + 8, rt.player.y + 5, '#ffe66d', 14);
          playSfx('hit');
          break;
        }
      }
    }
  }

  // Terrain — instant kill regardless of iframes (Gradius rule: rock = death).
  if (rt.dyingT <= 0 && rt.player.hp > 0) {
    const px = rt.player.x;
    const py = rt.player.y;
    const pw = 16;
    const ph = 10;
    const overlaps = (seg: { x: number; y: number; w: number; h: number }) => {
      const sx = seg.x - rt.terrain.scroll;
      return (
        sx + seg.w > px && sx < px + pw && seg.y + seg.h > py && seg.y < py + ph
      );
    };
    let crashed = false;
    for (const seg of rt.terrain.floor) {
      if (overlaps(seg)) {
        crashed = true;
        break;
      }
    }
    if (!crashed) {
      for (const seg of rt.terrain.ceiling) {
        if (overlaps(seg)) {
          crashed = true;
          break;
        }
      }
    }
    if (crashed) {
      rt.player.hp = 0;
      rt.events.push({ kind: 'hit', t: elapsedMs(rt), damage: 99 });
    }
  }

  // Particles + score pops + toasts
  const particleStep = 1 / 60;
  rt.particles = rt.particles.filter((p) => {
    p.x += p.vx * particleStep;
    p.y += p.vy * particleStep + 240 * particleStep * particleStep * 30;
    p.life -= particleStep;
    return p.life > 0;
  });
  rt.scorePops = rt.scorePops.filter((p) => {
    p.y -= 0.6;
    p.life -= particleStep;
    return p.life > 0;
  });
  rt.toasts = rt.toasts.filter((toast) => {
    toast.life -= 1;
    return toast.life > 0;
  });

  // Update peek archetype
  rt.archetypePeek = computeArchetype(rt);

  // End conditions
  if (rt.dyingT > 0) {
    rt.dyingT -= 1;
    if (rt.dyingT <= 0) {
      rt.finished = true;
      rt.finishReason = 'hp';
    }
  } else if (!rt.finished) {
    if (rt.player.hp <= 0) {
      // Big death explosion: 3 staggered bursts so the canvas keeps rendering
      // ~45 frames of debris before BirthArcade switches to the debrief overlay.
      const cx = rt.player.x + 8;
      const cy = rt.player.y + 5;
      spawnBurst(rt, cx, cy, '#ffd166', 60);
      spawnBurst(rt, cx, cy, '#ff5252', 50);
      spawnBurst(rt, cx, cy, '#ffffff', 28);
      rt.flashT = 30;
      rt.dyingT = 45;
      playSfx('death');
    } else if (rt.t >= GAME_DURATION_FRAMES) {
      rt.finished = true;
      rt.finishReason = 'time';
    }
  }
}

function computeArchetype(rt: Runtime): Archetype {
  let best: Archetype = 'balanced';
  let bestVal = -1;
  for (const archetype of ARCHETYPE_ORDER) {
    if (rt.votes[archetype] > bestVal) {
      bestVal = rt.votes[archetype];
      best = archetype;
    }
  }
  return best;
}

export function deriveArchetype(rt: Runtime): Archetype {
  return computeArchetype(rt);
}

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

  // Particles behind enemies
  for (const p of rt.particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    ctx.globalAlpha = 1;
  }

  // Enemies
  for (const e of rt.enemies) {
    if (e.type === 'grunt') {
      // Glow ring around tutorial enemy to draw attention
      if (e.isTutorial && rt.score === 0) {
        ctx.fillStyle = e.color;
        ctx.globalAlpha = 0.3 + Math.sin(rt.t * 0.2) * 0.2;
        ctx.beginPath();
        ctx.arc(e.x + 6, e.y + 5, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      drawSprite(ctx, GRUNT, e.spriteKey, e.x | 0, e.y | 0);
      // Floating identity label so the player learns what each module means.
      // Visible for the first ~1.5s of life or while the tutorial is on.
      const labelAge = rt.t - e.spawnAt;
      const showLabel = labelAge < 90 || e.isTutorial;
      if (showLabel) {
        const alpha = e.isTutorial
          ? 1
          : Math.max(0, Math.min(1, (90 - labelAge) / 30));
        ctx.globalAlpha = alpha;
        const label = CAPABILITY_LABEL[e.capability];
        const detail = CAPABILITY_DESC[e.capability];
        const reward = `COMMIT +${e.scoreOnKill}`;
        const labelW =
          Math.max(label.length, detail.length, reward.length) * 6 + 4;
        const desiredX = (e.x | 0) - Math.floor(labelW / 2) + 6;
        const lx = Math.max(2, Math.min(RW - labelW - 2, desiredX));
        const ly = (e.y | 0) - 16;
        // Background plate so the label stays readable on busy backgrounds.
        ctx.fillStyle = 'rgba(0, 16, 42, 0.85)';
        ctx.fillRect(lx - 2, ly - 1, labelW, 25);
        pixelText(ctx, label, lx, ly, e.color);
        pixelText(ctx, detail, lx, ly + 8, PAL.hudWhite);
        pixelText(ctx, reward, lx, ly + 16, PAL.hudYellow);
        ctx.globalAlpha = 1;
      }
    } else {
      const key = e.chargeT > 0 ? MOAI_CHARGE_KEY : MOAI_KEY;
      drawSprite(ctx, MOAI, key, e.x | 0, e.y | 0, false, e.fromTop);
      const constraint = MOAI_CONSTRAINT[e.moaiId];
      const labelY = e.fromTop ? (e.y | 0) + 32 : (e.y | 0) - 18;
      const labelX = Math.max(2, Math.min(RW - 86, (e.x | 0) - 28));
      ctx.fillStyle = 'rgba(0, 16, 42, 0.82)';
      ctx.fillRect(labelX - 2, labelY - 1, 88, 17);
      pixelText(ctx, constraint.label, labelX, labelY, PAL.warn);
      pixelText(
        ctx,
        constraint.detail.toUpperCase(),
        labelX,
        labelY + 8,
        PAL.hudWhite
      );
      const ratio = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = PAL.deepBlue;
      ctx.fillRect((e.x | 0) - 2, (e.y | 0) - 4, 28, 2);
      ctx.fillStyle = ratio > 0.4 ? PAL.ok : PAL.warn;
      ctx.fillRect((e.x | 0) - 2, (e.y | 0) - 4, Math.round(28 * ratio), 2);
    }
  }

  // Bullets
  for (const b of rt.bullets) {
    ctx.fillStyle = PAL.bullet;
    ctx.fillRect(b.x | 0, b.y | 0, 6, 2);
    ctx.fillStyle = PAL.shipFlame;
    ctx.fillRect((b.x | 0) + 4, b.y | 0, 2, 2);
  }
  for (const b of rt.enemyBullets) {
    ctx.fillStyle = PAL.ringCore;
    ctx.fillRect((b.x | 0) - 1, (b.y | 0) - 1, 3, 3);
  }

  // Player — hidden during the death animation so the explosion reads cleanly.
  if (rt.dyingT <= 0 && !(rt.player.iframes > 0 && (rt.t >> 1) % 2 === 0)) {
    drawSprite(ctx, VIC_VIPER, VIC_KEY, rt.player.x | 0, rt.player.y | 0);
  }

  // Score pops
  for (const p of rt.scorePops) {
    const alpha = Math.max(0, p.life);
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = p.color;
    pixelText(
      ctx,
      p.text,
      (p.x | 0) - p.text.length * 3,
      (p.y | 0) - 6,
      p.color
    );
    ctx.globalAlpha = 1;
  }

  // Tutorial prompt — Mario 1-1: a single instruction at the right moment
  if (rt.showTutorialPrompt && rt.spawnedTutorial && rt.score === 0) {
    const flicker = (rt.t >> 4) % 2 === 0;
    if (flicker) {
      ctx.fillStyle = 'rgba(0, 16, 42, 0.78)';
      ctx.fillRect(RW / 2 - 78, 30, 156, 22);
      pixelText(ctx, 'JUST MOVE → DESTROY!', RW / 2 - 60, 38, PAL.hudYellow);
    }
  }

  // WARNING banner before Moai
  if (rt.warningT > 0) {
    const flicker = (rt.warningT >> 2) % 2 === 0;
    if (flicker) {
      ctx.fillStyle = 'rgba(255, 48, 96, 0.32)';
      ctx.fillRect(0, PLAY_H / 2 - 14, RW, 28);
      drawBigText(ctx, 'CONSTRAINT!', RW / 2 - 66, PLAY_H / 2 - 7, PAL.warn);
    }
  }

  // Damage flash overlay
  if (rt.flashT > 0) {
    const a = (rt.flashT / 12) * 0.4;
    ctx.fillStyle = `rgba(255, 80, 80, ${a})`;
    ctx.fillRect(0, 0, RW, PLAY_H);
  }

  drawHud(ctx, rt);
}

function drawHud(ctx: CanvasRenderingContext2D, rt: Runtime) {
  // Top bar: the current Agent loadout, not a generic score board.
  ctx.fillStyle = 'rgba(0, 16, 42, 0.92)';
  ctx.fillRect(0, 0, RW, 16);
  const slotW = (RW - 8) / CAPABILITY_ORDER.length;
  for (let i = 0; i < CAPABILITY_ORDER.length; i += 1) {
    const capability = CAPABILITY_ORDER[i];
    if (!capability) continue;
    const x = 4 + i * slotW;
    const color = CAPABILITY_COLOR[capability];
    const count = rt.loadout[capability];
    const isRecent = rt.lastCommit === capability && rt.t - rt.lastCommitT < 75;
    ctx.fillStyle = isRecent ? color : 'rgba(255,255,255,0.06)';
    ctx.fillRect(x, 2, slotW - 3, 12);
    if (!isRecent) {
      ctx.fillStyle = color;
      ctx.fillRect(x, 2, 2, 12);
    }
    pixelText(
      ctx,
      CAPABILITY_HUD_LABEL[capability],
      x + 4,
      4,
      isRecent ? PAL.black : color
    );
    pixelText(
      ctx,
      String(count).padStart(2, '0'),
      x + slotW - 15,
      4,
      isRecent ? PAL.black : PAL.hudWhite
    );
  }

  // Bottom HUD
  ctx.fillStyle = PAL.deepBlue;
  ctx.fillRect(0, PLAY_H, RW, 24);
  ctx.fillStyle = PAL.hudGray;
  ctx.fillRect(0, PLAY_H, RW, 1);

  // Hull (lives)
  for (let i = 0; i < rt.player.hp; i += 1) {
    drawTinyShip(ctx, 4 + i * 9, PLAY_H + 14);
  }

  // Time + score
  const sec = Math.max(0, Math.ceil((GAME_DURATION_FRAMES - rt.t) / 60));
  pixelText(ctx, 'TIME', 56, PLAY_H + 6, PAL.hudWhite);
  pixelText(ctx, String(sec).padStart(2, '0'), 82, PLAY_H + 6, PAL.hudYellow);
  pixelText(ctx, 'SCORE', 56, PLAY_H + 16, PAL.hudWhite);
  pixelText(
    ctx,
    String(rt.score).padStart(6, '0'),
    92,
    PLAY_H + 16,
    PAL.hudYellow
  );
  pixelText(ctx, 'MODE', 146, PLAY_H + 16, PAL.hudWhite);
  pixelText(
    ctx,
    ARCHETYPE_LABEL[rt.archetypePeek].slice(0, 8),
    174,
    PLAY_H + 16,
    ARCHETYPE_COLOR[rt.archetypePeek]
  );

  // Arrow keys glyph (Mario 1-1 visual hint that survives only first 3s)
  if (rt.t < TUTORIAL_FRAMES) {
    const flicker = (rt.t >> 4) % 2 === 0;
    if (flicker) {
      pixelText(ctx, 'MOVE', RW - 64, PLAY_H + 6, PAL.shipWhite);
      ctx.fillStyle = PAL.hudWhite;
      ctx.fillRect(RW - 22, PLAY_H + 8, 4, 1);
      ctx.fillRect(RW - 16, PLAY_H + 8, 4, 1);
      ctx.fillRect(RW - 10, PLAY_H + 8, 4, 1);
    }
  }

  // Toast strip (top-right) — only when meaningful
  for (let i = 0; i < rt.toasts.length; i += 1) {
    const toast = rt.toasts[i];
    if (!toast) continue;
    const alpha = Math.min(1, toast.life / 30);
    ctx.fillStyle = `rgba(0, 16, 42, ${0.85 * alpha})`;
    ctx.fillRect(RW - 100, 18 + i * 9, 96, 8);
    ctx.fillStyle = toast.color;
    ctx.fillRect(RW - 100, 18 + i * 9, 2, 8);
    pixelText(ctx, toast.text.slice(0, 14), RW - 96, 19 + i * 9, PAL.hudWhite);
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
