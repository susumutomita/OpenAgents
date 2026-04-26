import { PAL } from './palette';

export type SpriteKey = Record<string, string>;
export type Sprite = readonly string[];

// Original execution craft: narrow nose, hard wing planes, small canopy.
// Keep the silhouette serious and mechanical, not mascot-like or parody-cute.
export const VIC_VIPER: Sprite = [
  '..........HH............',
  '.........BHHB...........',
  '.......BBBHHCC..........',
  '....BBBBKCCCCCC.........',
  '..BBBKKCCCCCCCCCSS......',
  'F2BBKCCCCCCCCCCCCCCCS...',
  'FFBBCCCCCHHHHCCCCCCCCCSS',
  'F2BBKCCCCCCCCCCCCCCCS...',
  '..BBBKKCCCCCCCCCSS......',
  '....BBBBKCCCCCC.........',
  '...........RRRR.........',
  '............RR..........',
];

export const VIC_KEY: SpriteKey = {
  C: '#4d86d8', // hull main
  S: '#b8d8ff', // hard leading edge
  B: '#071735', // hull shadow / panel break
  H: '#63e6ff', // compact canopy glass
  K: '#1b2f63', // wing inner shadow
  T: '#0d1e44',
  R: '#e02030', // missile body (red)
  F: PAL.shipFlame,
  '2': PAL.shipFlame2,
};

export const OPTION_SPR: Sprite = [
  '..OO..',
  '.OYYO.',
  'OYWWYO',
  'OYWWYO',
  '.OYYO.',
  '..OO..',
];

export const OPTION_KEY: SpriteKey = {
  O: PAL.shipFlame2,
  Y: PAL.shipFlame,
  W: PAL.shipWhite,
};

export const MOAI: Sprite = [
  '......LLLLLLLLLLLL......',
  '....LLSSSSSSSSSSSSLL....',
  '...LSSHHHHHHHHHHHHSSL...',
  '..LSHHHHHHHHHHHHHHHHSL..',
  '.LSHHHHHHHHHHHHHHHHHHSL.',
  'LSSHHHHHHHHHHHHHHHHHHSSL',
  'LSHHHHSSSSHHHHSSSSHHHHSL',
  'LSHHHSEEESSHHSSEEESSHHSL',
  'LSHHHSEWESSHHSSEWESSHHSL',
  'LSHHHSEEESSHHSSEEESSHHSL',
  'LSHHHHSSSHHHHHSSSSHHHHSL',
  'LSHHHHHHHHHHHHHHHHHHHHSL',
  'LSHHHHHHHHHHHHHHHHHHHHSL',
  'LSHHHHSSSSSSSSSSSSHHHHSL',
  'LSHHHSEEEEEEEEEEEESSHHSL',
  'LSHHHSEEEEEEEEEEEESSHHSL',
  'LSHHHHSSSSSSSSSSSSHHHHSL',
  'LSHHHHHHHHHHHHHHHHHHHHSL',
  'LSHHHHHHHHHHHHHHHHHHHHSL',
  'LSSHHHHHHHHHHHHHHHHHHSSL',
  '.LSSHHHHHHHHHHHHHHHHSSL.',
  '..LSSSHHHHHHHHHHHHSSSL..',
  '...LSSSHHHHHHHHHHSSSL...',
  '..NNNNSSSSSSSSSSSSNNNN..',
  '.NNNNNNNNSSSSSSNNNNNNNN.',
  'NNNNNNNNNNNNNNNNNNNNNNNN',
  'NNNNNNNNNNNNNNNNNNNNNNNN',
  '.NNNNNNNNNNNNNNNNNNNNN..',
];

export const MOAI_KEY: SpriteKey = {
  L: PAL.moaiLo,
  S: PAL.moaiStone,
  H: PAL.moaiHi,
  E: PAL.moaiBase,
  W: PAL.moaiEye,
  N: PAL.rockDark,
};

export const MOAI_CHARGE_KEY: SpriteKey = {
  ...MOAI_KEY,
  W: PAL.moaiEyeRed,
  E: '#a01010',
};

export const GRUNT: Sprite = [
  '....OOOO....',
  '..OOYYYYOO..',
  '.OYWWWWWWYO.',
  'OYWBBKKBBWYO',
  'OYWBKKKKBWYO',
  'OYWBBKKBBWYO',
  '.OYWWWWWWYO.',
  '..OOYYYYOO..',
  '.O........O.',
  'O..........O',
];

export const GRUNT_KEY: SpriteKey = {
  O: PAL.shipRed,
  Y: '#ff8030',
  W: PAL.hudYellow,
  B: PAL.shipBlue,
  K: '#101030',
};

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: Sprite,
  key: SpriteKey,
  dx: number,
  dy: number,
  flipX = false,
  flipY = false
) {
  const h = sprite.length;
  for (let y = 0; y < h; y += 1) {
    const row = sprite[y];
    if (!row) continue;
    for (let x = 0; x < row.length; x += 1) {
      const c = row[x];
      if (c === '.' || c === ' ' || !c) continue;
      const color = key[c];
      if (!color) continue;
      ctx.fillStyle = color;
      const px = flipX ? dx + (row.length - 1 - x) : dx + x;
      const py = flipY ? dy + (h - 1 - y) : dy + y;
      ctx.fillRect(px, py, 1, 1);
    }
  }
}
