import { PAL } from './palette';

export type SpriteKey = Record<string, string>;
export type Sprite = readonly string[];

export const VIC_VIPER: Sprite = [
  '......TT................',
  '......TTT...............',
  '.....TTTT...HH..........',
  '...SSSSSS.HHCCH.........',
  '..SSCCCCCSCCCCCCS.......',
  '.FSCCCCCCCCCCCCCCCS.....',
  'FFBBBBCCCCCCCCCCCCCCSS..',
  'F2BBBCCCCCCCCCCCCCCCCCSS',
  'FFBBBBCCCCCCCCCCCCCCSS..',
  '.FSCCCCCCCCCCCCCCCS.....',
  '..SSCCCCCSCCCCCCS.......',
  '...SSSSSS...............',
  '....RRRRRRR.............',
  '...........R............',
];

export const VIC_KEY: SpriteKey = {
  C: PAL.shipBlue,
  S: '#d8e4f4',
  B: '#142d5e',
  H: '#9bd0ff',
  T: '#1a3a80',
  R: PAL.shipRed,
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
