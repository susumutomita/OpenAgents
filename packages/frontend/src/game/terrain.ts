import { PAL, PLAY_H, RW } from './palette';

export interface TerrainSegment {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Terrain {
  ceiling: TerrainSegment[];
  floor: TerrainSegment[];
  scroll: number;
}

export function makeTerrain(): Terrain {
  const ceiling: TerrainSegment[] = [];
  const floor: TerrainSegment[] = [];
  let cx = -32;
  while (cx < RW * 4) {
    const seg = 24 + ((Math.abs(cx) * 7) % 48);
    const h = 12 + ((Math.abs(cx) * 3) % 22);
    ceiling.push({ x: cx, y: 0, w: seg, h });
    cx += seg;
  }
  let fx = -32;
  while (fx < RW * 4) {
    const seg = 24 + ((Math.abs(fx) * 5) % 48);
    const h = 14 + ((Math.abs(fx) * 11) % 30);
    floor.push({ x: fx, y: PLAY_H - h, w: seg, h });
    fx += seg;
  }
  return { ceiling, floor, scroll: 0 };
}

export function drawTerrainStrip(
  ctx: CanvasRenderingContext2D,
  strip: TerrainSegment[],
  scroll: number,
  isFloor: boolean
) {
  for (const seg of strip) {
    const sx = Math.floor(seg.x - scroll);
    if (sx + seg.w < 0 || sx > RW) continue;
    ctx.fillStyle = PAL.rockDark;
    ctx.fillRect(sx, seg.y, seg.w, seg.h);
    ctx.fillStyle = PAL.rockMid;
    if (isFloor) ctx.fillRect(sx, seg.y, seg.w, 3);
    else ctx.fillRect(sx, seg.y + seg.h - 3, seg.w, 3);
    ctx.fillStyle = PAL.rockLite;
    if (isFloor) ctx.fillRect(sx, seg.y, seg.w, 1);
    else ctx.fillRect(sx, seg.y + seg.h - 1, seg.w, 1);
    ctx.fillStyle = PAL.rockShade;
    for (let i = 4; i < seg.w - 2; i += 5) {
      if ((seg.x + i) % 11 < 3) {
        ctx.fillRect(sx + i, seg.y + (isFloor ? 4 : seg.h - 6), 1, 2);
      }
    }
    ctx.fillStyle = PAL.moss;
    if (isFloor) {
      for (let i = 1; i < seg.w; i += 4) {
        if ((seg.x + i) % 7 < 3) ctx.fillRect(sx + i, seg.y - 1, 2, 1);
      }
    } else {
      for (let i = 1; i < seg.w; i += 4) {
        if ((seg.x + i) % 9 < 3) ctx.fillRect(sx + i, seg.y + seg.h, 2, 1);
      }
    }
  }
}

export interface Star {
  x: number;
  y: number;
  speed: number;
  bright: boolean;
}

export function makeStars(): Star[] {
  const arr: Star[] = [];
  for (let i = 0; i < 70; i += 1) {
    arr.push({
      x: Math.random() * RW,
      y: Math.random() * PLAY_H,
      speed: 6 + Math.random() * 28,
      bright: Math.random() < 0.35,
    });
  }
  return arr;
}
