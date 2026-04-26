import { PAL } from './palette';

export type SpriteKey = Record<string, string>;
export type Sprite = readonly string[];

// Vic Viper — sharp Gradius II silhouette.
// Hard panel breaks (no fluffy gradient highlights). Pointed nose to the right,
// vertical tail fin on top, two swept delta wings, twin engine exhaust on left,
// and a missile pod underneath at the rear.
export const VIC_VIPER: Sprite = [
  '...........HH...........', // 0  tail tip
  '...........HH...........', // 1  tail
  '..........BHHB..........', // 2  tail base
  '.......BBBBBHHCC........', // 3  tail to body / upper wing root
  '....BBBBKKKBBHHCCCCC....', // 4  upper wing
  '..BBKKSSSCCCCCCCCCCCC...', // 5  upper wing extending right
  '.BBSSCCCCCCCCCCCCCCCCS..', // 6  fuselage upper / canopy line
  'F2BBCCCCCCCCCCCCCCCCCCSS', // 7  centerline + nose forward
  'FFBBCCCCCCCCCCCCCCCCCCCS', // 8  pointed nose tip (pointing right)
  'F2BBCCCCCCCCCCCCCCCCCCSS', // 9  centerline + nose forward (mirror)
  '.BBSSCCCCCCCCCCCCCCCCS..', // 10 fuselage lower
  '..BBKKSSSCCCCCCCCCCCC...', // 11 lower wing extending right
  '....BBBBKKKBBB.RRR......', // 12 lower wing root + missile pod
  '...............RR.......', // 13 missile tip
];

export const VIC_KEY: SpriteKey = {
  C: '#3a7ad8', // hull main
  S: '#9fc8ff', // panel highlight (used sparingly, leading edges only)
  B: '#0d1e44', // hull shadow / panel break
  H: '#5fd0ff', // cockpit / canopy glass
  K: '#22386b', // wing inner shadow
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
