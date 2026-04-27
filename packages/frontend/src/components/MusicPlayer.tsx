import { memo, useEffect, useRef, useState } from 'react';

type Note = { note: number; dur: number } | null;

type ChiptuneEngine = {
  start: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
  isRunning: () => boolean;
};

const HUD = '#7ee0ff';
const AMBER = '#ffd166';
const DARK = '#05080c';
const VIS_BARS = [
  'vb-a',
  'vb-b',
  'vb-c',
  'vb-d',
  'vb-e',
  'vb-f',
  'vb-g',
  'vb-h',
] as const;

function createChiptuneEngine(): ChiptuneEngine {
  let ctx: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  let leadL: GainNode | null = null;
  let leadR: GainNode | null = null;
  let counterBus: GainNode | null = null;
  let padBus: GainNode | null = null;
  let brassBus: GainNode | null = null;
  let bassBus: GainNode | null = null;
  let sparkleBus: GainNode | null = null;
  let drumL: GainNode | null = null;
  let drumR: GainNode | null = null;
  let scheduler: ReturnType<typeof setTimeout> | null = null;
  let nextNoteTime = 0;
  let step = 0;
  const bpm = 148;
  let stopped = true;
  let volume = 0.22;

  const f = (m: number) => 440 * 2 ** ((m - 69) / 12);

  const C3 = 48;
  const D3 = 50;
  const E3 = 52;
  const F3 = 53;
  const G3 = 55;
  const A3 = 57;
  const Bb3 = 58;
  const C4 = 60;
  const D4 = 62;
  const E4 = 64;
  const F4 = 65;
  const G4 = 67;
  const A4 = 69;
  const Bb4 = 70;
  const B4 = 71;
  const C5 = 72;
  const D5 = 74;
  const E5 = 76;
  const F5 = 77;
  const G5 = 79;
  const A5 = 81;
  const Bb5 = 82;
  const B5 = 83;
  const C6 = 84;
  const D6 = 86;
  const E6 = 88;
  const F6 = 89;
  const G6 = 91;
  const A6 = 93;
  const B6 = 95;
  const C7 = 96;
  const D7 = 98;
  const E7 = 100;
  const F7 = 101;
  const G7 = 103;
  const A7 = 105;
  void [C3, B4]; // referenced via padChords lookup, not directly in arrangements above

  const BARS = 56;
  const TOTAL = BARS * 16;

  function expand(events: Array<number | null>, totalSteps: number): Note[] {
    const out: Note[] = new Array(totalSteps).fill(null);
    let i = 0;
    for (let k = 0; k < events.length; k += 2) {
      const n = events[k];
      const d = events[k + 1] ?? 0;
      if (i >= totalSteps) break;
      if (n !== null && n !== undefined) out[i] = { note: n, dur: d };
      i += d;
    }
    return out;
  }

  // biome-ignore format: musical phrasing — keep bars on their own lines
  const lead = expand([
    null,16, null,16, null,16,
    null,12, G4,1, A4,1, B4,2,

    C5,1, E5,1, G5,1, C6,3,  G5,1, A5,1,  G5,2, E5,2, C5,2,
    D5,3, E5,1, F5,4,        E5,2, D5,2, C5,4,
    C5,1, E5,1, G5,1, C6,3,  G5,1, A5,1,  G5,2, F5,2, E5,2,
    D5,3, F5,1, E5,2, D5,2,  C5,8,
    E5,1, G5,1, C6,1, E6,3,  D6,1, C6,1,  B5,2, A5,2, G5,2,
    F5,3, A5,1, G5,4,        F5,2, E5,2, D5,4,
    E5,1, G5,1, C6,1, E6,3,  D6,1, C6,1,  B5,2, G5,2, E5,2,
    D5,4, G5,4,              C5,4, null,4,

    A5,2, G5,2, F5,2, E5,2,    D5,2, F5,2, A5,4,
    G5,2, F5,2, E5,2, D5,2,    C5,2, E5,2, G5,4,
    F5,2, E5,2, D5,2, C5,2,    Bb4,2, D5,2, F5,4,
    E5,2, G5,2, Bb5,2, A5,2,   G5,2, F5,2, E5,4,
    D5,2, F5,2, A5,2, D6,2,    C6,2, Bb5,2, A5,4,
    G5,2, Bb5,2, D6,2, G6,2,   F6,2, E6,2, D6,4,
    C6,1, B5,1, A5,1, G5,1,  F5,2, A5,2,  G5,2, F5,2, E5,2, D5,2,
    E5,2, F5,2, G5,2, A5,2,    G5,4, null,4,

    C6,1, E6,1, G6,1, C7,3,  G6,1, A6,1,  G6,2, E6,2, C6,2,
    D6,3, E6,1, F6,4,        E6,2, D6,2, C6,4,
    C6,1, E6,1, G6,1, C7,3,  G6,1, A6,1,  G6,2, F6,2, E6,2,
    D6,3, F6,1, E6,2, D6,2,  C6,8,
    E6,1, G6,1, C7,1, E7,3,  D7,1, C7,1,  B6,2, A6,2, G6,2,
    F6,3, A6,1, G6,4,        F6,2, E6,2, D6,4,
    E6,1, G6,1, C7,1, E7,3,  D7,1, C7,1,  B6,2, G6,2, E6,2,
    D6,4, G6,4,              C6,4, null,4,

    G5,4, A5,4,             B5,2, A5,2, G5,4,
    E5,4, F5,4,             G5,4, A5,4,
    D5,4, E5,4,             F5,2, E5,2, D5,4,
    C5,2, D5,2, E5,2, G5,2, A5,8,
    F5,4, A5,4,             C6,2, Bb5,2, A5,4,
    G5,4, Bb5,4,            D6,4, F6,4,
    E6,2, D6,2, C6,2, Bb5,2, A5,2, G5,2, F5,4,
    G5,2, A5,2, B5,2, C6,2,  D6,2, E6,2, F6,2, G6,2,

    C7,4, B6,4,             A6,2, G6,2, A6,4,
    G6,4, F6,4,             E6,2, D6,2, E6,4,
    F6,4, E6,4,             D6,2, C6,2, D6,4,
    G6,2, A6,2, B6,2, C7,2,  D7,8,
    E7,2, D7,2, C7,2, B6,2,  A6,2, G6,2, A6,4,
    F6,2, A6,2, C7,2, F7,2,  E7,2, D7,2, C7,4,
    D7,2, E7,2, F7,2, G7,2,  A7,4, G7,4,
    E7,2, D7,2, C7,2, B6,2,  C7,8,

    C6,1, E6,1, G6,1, C7,3,  G6,1, A6,1,  G6,2, E6,2, C6,2,
    D6,3, E6,1, F6,4,        E6,2, D6,2, C6,4,
    C6,1, E6,1, G6,1, C7,3,  G6,1, A6,1,  G6,2, F6,2, E6,2,
    D6,3, F6,1, E6,2, D6,2,  C6,8,
    E6,1, G6,1, C7,1, E7,3,  D7,1, C7,1,  B6,2, A6,2, G6,2,
    F6,3, A6,1, G6,4,        F6,2, E6,2, D6,4,
    G6,2, F6,2, E6,2, D6,2,  C6,2, E6,2, G6,4,
    F6,2, E6,2, D6,2, C6,2,  G5,4, C6,4,

    C7,8, G6,4, E6,4,
    C7,2, B6,2, A6,2, G6,2, F6,2, E6,2, D6,2, C6,2,
    C6,16,
    C6,16,
  ] as Array<number | null>, TOTAL);

  const counter = expand(
    [
      null,
      64,

      null,
      4,
      G4,
      1,
      A4,
      1,
      G4,
      2,
      E4,
      2,
      C4,
      2,
      E4,
      2,
      G4,
      8,
      C5,
      4,
      B4,
      4,
      null,
      4,
      G4,
      1,
      A4,
      1,
      G4,
      2,
      F4,
      2,
      E4,
      2,
      F4,
      2,
      E4,
      8,
      G4,
      4,
      C4,
      4,
      null,
      4,
      B4,
      1,
      C5,
      1,
      B4,
      2,
      G4,
      2,
      E4,
      2,
      G4,
      2,
      A4,
      8,
      F4,
      4,
      D4,
      4,
      null,
      4,
      B4,
      1,
      C5,
      1,
      B4,
      2,
      G4,
      2,
      E4,
      2,
      F4,
      2,
      E4,
      8,
      D4,
      4,
      G4,
      4,

      F4,
      2,
      E4,
      2,
      D4,
      2,
      C4,
      2,
      Bb3,
      2,
      D4,
      2,
      F4,
      4,
      E4,
      2,
      D4,
      2,
      C4,
      2,
      Bb3,
      2,
      A3,
      2,
      C4,
      2,
      E4,
      4,
      D4,
      2,
      C4,
      2,
      Bb3,
      2,
      A3,
      2,
      G3,
      2,
      Bb3,
      2,
      D4,
      4,
      C4,
      2,
      E4,
      2,
      G4,
      2,
      F4,
      2,
      E4,
      2,
      D4,
      2,
      C4,
      4,
      Bb3,
      2,
      D4,
      2,
      F4,
      2,
      Bb4,
      2,
      A4,
      2,
      G4,
      2,
      F4,
      4,
      E4,
      2,
      G4,
      2,
      Bb4,
      2,
      E5,
      2,
      D5,
      2,
      C5,
      2,
      Bb4,
      4,
      A4,
      1,
      G4,
      1,
      F4,
      1,
      E4,
      1,
      D4,
      2,
      F4,
      2,
      E4,
      2,
      D4,
      2,
      C4,
      2,
      Bb3,
      2,
      C4,
      2,
      D4,
      2,
      E4,
      2,
      F4,
      2,
      E4,
      4,
      null,
      4,

      null,
      4,
      G5,
      1,
      A5,
      1,
      G5,
      2,
      E5,
      2,
      C5,
      2,
      E5,
      2,
      G5,
      8,
      C6,
      4,
      B5,
      4,
      null,
      4,
      G5,
      1,
      A5,
      1,
      G5,
      2,
      F5,
      2,
      E5,
      2,
      F5,
      2,
      E5,
      8,
      G5,
      4,
      C5,
      4,
      null,
      4,
      B5,
      1,
      C6,
      1,
      B5,
      2,
      G5,
      2,
      E5,
      2,
      G5,
      2,
      A5,
      8,
      F5,
      4,
      D5,
      4,
      null,
      4,
      B5,
      1,
      C6,
      1,
      B5,
      2,
      G5,
      2,
      E5,
      2,
      F5,
      2,
      E5,
      8,
      D5,
      4,
      G5,
      4,

      E4,
      2,
      F4,
      2,
      G4,
      2,
      A4,
      2,
      B4,
      2,
      A4,
      2,
      G4,
      4,
      C5,
      2,
      B4,
      2,
      A4,
      2,
      G4,
      2,
      F4,
      2,
      E4,
      2,
      D4,
      4,
      F4,
      2,
      G4,
      2,
      A4,
      2,
      B4,
      2,
      C5,
      2,
      B4,
      2,
      A4,
      4,
      G4,
      2,
      A4,
      2,
      B4,
      2,
      C5,
      2,
      D5,
      8,
      C5,
      2,
      Bb4,
      2,
      A4,
      2,
      G4,
      2,
      F4,
      4,
      A4,
      4,
      G4,
      2,
      Bb4,
      2,
      D5,
      2,
      F5,
      2,
      E5,
      4,
      D5,
      4,
      C5,
      2,
      E5,
      2,
      G5,
      2,
      Bb5,
      2,
      A5,
      2,
      G5,
      2,
      F5,
      2,
      E5,
      2,
      D5,
      2,
      E5,
      2,
      F5,
      2,
      G5,
      2,
      A5,
      2,
      B5,
      2,
      C6,
      2,
      D6,
      2,

      E5,
      4,
      G5,
      4,
      F5,
      2,
      E5,
      2,
      F5,
      4,
      D5,
      4,
      E5,
      4,
      D5,
      2,
      B4,
      2,
      C5,
      4,
      A4,
      4,
      G4,
      4,
      F4,
      2,
      E4,
      2,
      F4,
      4,
      D5,
      2,
      F5,
      2,
      G5,
      2,
      A5,
      2,
      B5,
      8,
      C6,
      2,
      B5,
      2,
      A5,
      2,
      G5,
      2,
      F5,
      2,
      E5,
      2,
      F5,
      4,
      A5,
      2,
      F5,
      2,
      A5,
      2,
      C6,
      2,
      C6,
      2,
      B5,
      2,
      A5,
      4,
      F5,
      2,
      G5,
      2,
      A5,
      2,
      B5,
      2,
      C6,
      4,
      B5,
      4,
      G5,
      2,
      F5,
      2,
      E5,
      2,
      D5,
      2,
      E5,
      8,

      null,
      4,
      G5,
      1,
      A5,
      1,
      G5,
      2,
      E5,
      2,
      C5,
      2,
      E5,
      2,
      G5,
      8,
      C6,
      4,
      B5,
      4,
      null,
      4,
      G5,
      1,
      A5,
      1,
      G5,
      2,
      F5,
      2,
      E5,
      2,
      F5,
      2,
      E5,
      8,
      G5,
      4,
      C5,
      4,
      null,
      4,
      B5,
      1,
      C6,
      1,
      B5,
      2,
      G5,
      2,
      E5,
      2,
      G5,
      2,
      A5,
      8,
      F5,
      4,
      D5,
      4,
      E5,
      2,
      D5,
      2,
      C5,
      2,
      B4,
      2,
      A4,
      2,
      G4,
      2,
      E4,
      4,
      F4,
      2,
      E4,
      2,
      D4,
      2,
      C4,
      2,
      E4,
      4,
      G4,
      4,

      E5,
      8,
      C5,
      4,
      G4,
      4,
      E5,
      2,
      D5,
      2,
      C5,
      2,
      B4,
      2,
      A4,
      2,
      G4,
      2,
      E4,
      2,
      C4,
      2,
      C4,
      16,
      C4,
      16,
    ] as Array<number | null>,
    TOTAL
  );

  const padChords: Array<[number, number]> = [
    [C4, 1],
    [C4, 1],
    [G3, 1],
    [G3, 1],
    [C4, 1],
    [A3, 1],
    [F3, 1],
    [G3, 1],
    [C4, 1],
    [A3, 1],
    [D3, 1],
    [G3, 1],
    [F3, 1],
    [C4, 1],
    [Bb3, 1],
    [A3, 1],
    [Bb3, 1],
    [G3, 1],
    [F3, 1],
    [G3, 1],
    [C4, 1],
    [A3, 1],
    [F3, 1],
    [G3, 1],
    [C4, 1],
    [A3, 1],
    [D3, 1],
    [G3, 1],
    [C4, 1],
    [A3, 1],
    [F3, 1],
    [G3, 1],
    [F3, 1],
    [Bb3, 1],
    [C4, 1],
    [G3, 1],
    [C4, 1],
    [G3, 1],
    [A3, 1],
    [D4, 1],
    [F3, 1],
    [A3, 1],
    [F3, 1],
    [G3, 1],
    [C4, 1],
    [A3, 1],
    [F3, 1],
    [G3, 1],
    [F3, 1],
    [G3, 1],
    [C4, 1],
    [C4, 1],
    [C4, 1],
    [G3, 1],
    [C4, 1],
    [C4, 1],
  ];

  const pad: Note[] = (() => {
    const out: Note[] = new Array(TOTAL).fill(null);
    let i = 0;
    for (const [root, bars] of padChords) {
      out[i] = { note: root, dur: bars * 16 };
      i += bars * 16;
    }
    return out;
  })();

  const chordQuality = padChords.map(([r]) => {
    if (r === A3 || r === A4 || r === D3 || r === D4 || r === E3 || r === E4)
      return 1;
    if (r === G3 || r === G4) return 2;
    return 0;
  });

  const brassStabs: Note[] = (() => {
    const out: Note[] = new Array(TOTAL).fill(null);
    const activeBars = new Set<number>();
    for (let b = 12; b < 20; b++) activeBars.add(b);
    for (let b = 20; b < 28; b++) activeBars.add(b);
    for (let b = 36; b < 44; b++) activeBars.add(b);
    for (let b = 44; b < 52; b++) activeBars.add(b);
    for (const bar of activeBars) {
      const chord = padChords[bar];
      if (!chord) continue;
      const base = bar * 16;
      const root = chord[0];
      for (const s of [2, 6, 10, 14])
        out[base + s] = { note: root + 12, dur: 1 };
      if (bar % 2 === 1) out[base + 12] = { note: root + 19, dur: 2 };
    }
    return out;
  })();

  const bass: Note[] = (() => {
    const driving = (r: number) => [
      r,
      1,
      r,
      1,
      r + 12,
      1,
      r,
      1,
      r + 7,
      1,
      r,
      1,
      r + 12,
      1,
      r,
      1,
      r,
      1,
      r + 5,
      1,
      r + 7,
      1,
      r + 5,
      1,
      r + 3,
      1,
      r,
      1,
      r + 7,
      1,
      r + 10,
      1,
    ];
    const halftime = (r: number) => [
      r,
      2,
      r + 12,
      2,
      r + 7,
      2,
      r + 12,
      2,
      r,
      2,
      r + 7,
      2,
      r + 12,
      2,
      r + 7,
      2,
    ];
    const flowing = (r: number) => [
      r,
      1,
      r + 7,
      1,
      r + 12,
      1,
      r + 7,
      1,
      r + 5,
      1,
      r + 12,
      1,
      r + 7,
      1,
      r + 5,
      1,
      r + 3,
      1,
      r + 7,
      1,
      r + 12,
      1,
      r + 7,
      1,
      r + 5,
      1,
      r + 3,
      1,
      r,
      1,
      r + 2,
      1,
    ];
    const events: number[] = [];
    for (let bar = 0; bar < BARS; bar++) {
      const chord = padChords[bar];
      if (!chord) continue;
      const root = chord[0] - 24;
      let pat: number[];
      if (bar < 4) pat = halftime(root);
      else if (bar >= 28 && bar < 36) pat = flowing(root);
      else if (bar >= 52) pat = halftime(root);
      else pat = driving(root);
      events.push(...pat);
    }
    return expand(events, TOTAL);
  })();

  const sparkle: Note[] = (() => {
    const out: Note[] = new Array(TOTAL).fill(null);
    for (let bar = 28; bar < 44; bar++) {
      const chord = padChords[bar];
      if (!chord) continue;
      const base = bar * 16;
      const root = chord[0];
      const notes = [root + 24, root + 28, root + 31, root + 36];
      for (let i = 0; i < 16; i++) {
        const note = notes[i % 4] ?? root;
        out[base + i] = { note, dur: 1 };
      }
    }
    return out;
  })();

  const drums: number[] = (() => {
    const arr = new Array(TOTAL).fill(0);
    const set = (bar: number, beat: number, val: number) => {
      arr[bar * 16 + beat] = val;
    };
    for (let bar = 0; bar < BARS; bar++) {
      if (bar < 4) {
        if (bar === 0) {
          set(bar, 0, 8);
          set(bar, 0, 1);
          for (let s = 4; s < 16; s++) set(bar, s, s % 2 === 0 ? 6 : 7);
        } else if (bar === 1) {
          for (let s = 0; s < 16; s++) set(bar, s, s % 2 === 0 ? 7 : 6);
          set(bar, 12, 2);
          set(bar, 14, 2);
        } else if (bar === 2) {
          for (let s = 0; s < 16; s += 2) set(bar, s, 3);
          set(bar, 0, 1);
          set(bar, 8, 1);
          set(bar, 4, 2);
          set(bar, 12, 2);
        } else {
          for (let s = 0; s < 12; s += 2) set(bar, s, 3);
          set(bar, 0, 1);
          set(bar, 4, 2);
          set(bar, 8, 1);
          set(bar, 12, 2);
          set(bar, 13, 2);
          set(bar, 14, 7);
          set(bar, 15, 6);
        }
        continue;
      }

      const isClimax = bar >= 36 && bar < 44;
      const isBridge = bar >= 28 && bar < 36;

      if (isBridge) {
        for (let s = 0; s < 16; s += 2) set(bar, s, 9);
        set(bar, 0, 1);
        set(bar, 10, 1);
        set(bar, 8, 2);
        if (bar === 35) {
          set(bar, 12, 6);
          set(bar, 13, 6);
          set(bar, 14, 7);
          set(bar, 15, 7);
        }
        continue;
      }

      if (isClimax) {
        for (let s = 0; s < 16; s++) set(bar, s, 3);
        set(bar, 0, 8);
        set(bar, 0, 1);
        set(bar, 6, 1);
        set(bar, 10, 1);
        set(bar, 14, 1);
        set(bar, 4, 2);
        set(bar, 12, 2);
        if (bar === 36) set(bar, 0, 8);
        if (bar === 43) {
          set(bar, 8, 2);
          set(bar, 10, 6);
          set(bar, 11, 6);
          set(bar, 12, 7);
          set(bar, 13, 7);
          set(bar, 14, 7);
          set(bar, 15, 6);
        }
        continue;
      }

      if (bar >= 52) {
        if (bar < 55) {
          for (let s = 0; s < 16; s += 2) set(bar, s, 3);
          set(bar, 0, 1);
          set(bar, 8, 1);
          set(bar, 4, 2);
          set(bar, 12, 2);
        } else {
          set(bar, 0, 1);
          set(bar, 0, 8);
          set(bar, 4, 5);
          set(bar, 12, 5);
        }
        continue;
      }

      for (let s = 0; s < 16; s++) set(bar, s, 3);
      set(bar, 14, 4);
      set(bar, 0, 1);
      set(bar, 6, 1);
      set(bar, 10, 1);
      set(bar, 4, 2);
      set(bar, 12, 2);
      if (bar === 11 || bar === 19 || bar === 27 || bar === 51) {
        set(bar, 12, 6);
        set(bar, 13, 6);
        set(bar, 14, 7);
        set(bar, 15, 7);
      }
      if (bar === 4 || bar === 12 || bar === 20 || bar === 44) set(bar, 0, 8);
    }
    return arr;
  })();

  function playLead(
    freq: number,
    time: number,
    dur: number,
    gain: number,
    opts: { vibrato?: number; slideFrom?: number | null } = {}
  ) {
    if (!ctx || !leadL || !leadR) return;
    const c = ctx;
    const { vibrato = 0, slideFrom = null } = opts;
    const make = (detune: number, bus: GainNode) => {
      const osc = c.createOscillator();
      osc.type = 'sawtooth';
      if (slideFrom != null) {
        osc.frequency.setValueAtTime(slideFrom, time);
        osc.frequency.exponentialRampToValueAtTime(freq, time + 0.025);
      } else {
        osc.frequency.setValueAtTime(freq, time);
      }
      osc.detune.value = detune;
      if (vibrato && dur > 0.18) {
        const lfo = c.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 5.8;
        const lfoG = c.createGain();
        lfoG.gain.setValueAtTime(0, time);
        lfoG.gain.linearRampToValueAtTime(vibrato, time + 0.18);
        lfo.connect(lfoG).connect(osc.frequency);
        lfo.start(time);
        lfo.stop(time + dur + 0.05);
      }
      const filt = c.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(2400, time);
      filt.frequency.exponentialRampToValueAtTime(4200, time + 0.04);
      filt.Q.value = 1.4;
      const g = c.createGain();
      g.gain.setValueAtTime(0, time);
      g.gain.linearRampToValueAtTime(gain, time + 0.005);
      g.gain.linearRampToValueAtTime(gain * 0.78, time + 0.05);
      g.gain.setTargetAtTime(0, time + dur * 0.9, 0.025);
      osc.connect(filt).connect(g).connect(bus);
      osc.start(time);
      osc.stop(time + dur + 0.08);
    };
    make(-8, leadL);
    make(8, leadR);
  }

  function playCounter(freq: number, time: number, dur: number, gain: number) {
    if (!ctx || !counterBus) return;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 3800;
    filt.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(gain, time + 0.005);
    g.gain.linearRampToValueAtTime(gain * 0.7, time + 0.05);
    g.gain.setTargetAtTime(0, time + dur * 0.85, 0.025);
    osc.connect(filt).connect(g).connect(counterBus);
    osc.start(time);
    osc.stop(time + dur + 0.06);
  }

  function playPad(
    rootFreq: number,
    quality: number,
    time: number,
    dur: number,
    gain: number
  ) {
    if (!ctx || !padBus) return;
    const semis =
      quality === 1 ? [0, 3, 7] : quality === 2 ? [0, 4, 7, 10] : [0, 4, 7];
    for (const semi of semis) {
      const fr = rootFreq * 2 ** (semi / 12);
      for (const cent of [-12, 0, 12]) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = fr;
        osc.detune.value = cent;
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 1800;
        filt.Q.value = 0.5;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, time);
        g.gain.linearRampToValueAtTime(gain, time + 0.18);
        g.gain.setValueAtTime(gain, time + dur * 0.85);
        g.gain.linearRampToValueAtTime(0, time + dur);
        osc.connect(filt).connect(g).connect(padBus);
        osc.start(time);
        osc.stop(time + dur + 0.05);
      }
    }
  }

  function playBrass(freq: number, time: number, dur: number, gain: number) {
    if (!ctx || !brassBus) return;
    const carrier = ctx.createOscillator();
    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(freq, time);
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(800, time);
    filt.frequency.exponentialRampToValueAtTime(3500, time + 0.03);
    filt.frequency.exponentialRampToValueAtTime(1400, time + dur);
    filt.Q.value = 3.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(gain, time + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    carrier.connect(filt).connect(g).connect(brassBus);
    carrier.start(time);
    carrier.stop(time + dur + 0.02);
  }

  function playBass(freq: number, time: number, dur: number, gain: number) {
    if (!ctx || !bassBus) return;
    const carrier = ctx.createOscillator();
    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(freq, time);
    const sub = ctx.createOscillator();
    sub.type = 'square';
    sub.frequency.setValueAtTime(freq, time);
    const subG = ctx.createGain();
    subG.gain.value = 0.4;
    sub.connect(subG);
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(220, time);
    filt.frequency.exponentialRampToValueAtTime(900, time + 0.015);
    filt.frequency.exponentialRampToValueAtTime(280, time + dur);
    filt.Q.value = 4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(gain, time + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    carrier.connect(filt);
    subG.connect(filt);
    filt.connect(g).connect(bassBus);
    carrier.start(time);
    carrier.stop(time + dur + 0.02);
    sub.start(time);
    sub.stop(time + dur + 0.02);
  }

  function playSparkle(freq: number, time: number, dur: number, gain: number) {
    if (!ctx || !sparkleBus) return;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(gain, time + 0.003);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.9);
    osc.connect(g).connect(sparkleBus);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  function noiseBuf(d: number) {
    if (!ctx) throw new Error('audio context not initialised');
    const n = (ctx.sampleRate * d) | 0;
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const a = buf.getChannelData(0);
    for (let i = 0; i < n; i++)
      a[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 1.4;
    return buf;
  }

  function playKick(t: number) {
    if (!ctx || !drumL || !drumR) return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(1.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    const click = ctx.createOscillator();
    click.type = 'square';
    click.frequency.value = 1800;
    const clickG = ctx.createGain();
    clickG.gain.setValueAtTime(0.3, t);
    clickG.gain.exponentialRampToValueAtTime(0.001, t + 0.008);
    click.connect(clickG);
    osc.connect(g);
    g.connect(drumL);
    g.connect(drumR);
    clickG.connect(drumL);
    clickG.connect(drumR);
    osc.start(t);
    osc.stop(t + 0.2);
    click.start(t);
    click.stop(t + 0.012);
  }

  function playSnare(t: number) {
    if (!ctx || !drumL || !drumR) return;
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf(0.18);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1100;
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0.65, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    s.connect(hp).connect(g1);
    g1.connect(drumL);
    g1.connect(drumR);
    s.start(t);
    const tone = ctx.createOscillator();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(240, t);
    tone.frequency.exponentialRampToValueAtTime(150, t + 0.05);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.3, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    tone.connect(g2);
    g2.connect(drumL);
    g2.connect(drumR);
    tone.start(t);
    tone.stop(t + 0.09);
  }

  function playHat(t: number, open = false) {
    if (!ctx || !drumL || !drumR) return;
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf(open ? 0.22 : 0.03);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 8200;
    const g = ctx.createGain();
    g.gain.value = open ? 0.2 : 0.13;
    s.connect(hp).connect(g);
    const p = ctx.createStereoPanner();
    p.pan.value = 0.2;
    g.connect(p).connect(drumL);
    p.connect(drumR);
    s.start(t);
  }

  function playClap(t: number) {
    if (!ctx || !drumL || !drumR) return;
    for (let i = 0; i < 3; i++) {
      const s = ctx.createBufferSource();
      s.buffer = noiseBuf(0.05);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1700;
      bp.Q.value = 1.4;
      const g = ctx.createGain();
      g.gain.value = i === 2 ? 0.55 : 0.3;
      s.connect(bp).connect(g);
      g.connect(drumL);
      g.connect(drumR);
      s.start(t + i * 0.011);
    }
  }

  function playTom(t: number, hi: boolean) {
    if (!ctx || !drumL || !drumR) return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const start = hi ? 320 : 175;
    const end = hi ? 160 : 85;
    osc.frequency.setValueAtTime(start, t);
    osc.frequency.exponentialRampToValueAtTime(end, t + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.7, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(g);
    const p = ctx.createStereoPanner();
    p.pan.value = hi ? -0.3 : 0.3;
    g.connect(p).connect(drumL);
    p.connect(drumR);
    osc.start(t);
    osc.stop(t + 0.24);
  }

  function playCrash(t: number) {
    if (!ctx || !drumL || !drumR) return;
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf(0.9);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 5500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.45, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.95);
    s.connect(hp).connect(g);
    g.connect(drumL);
    g.connect(drumR);
    s.start(t);
  }

  function playRide(t: number) {
    if (!ctx || !drumL || !drumR) return;
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf(0.12);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6500;
    const g = ctx.createGain();
    g.gain.value = 0.16;
    s.connect(hp).connect(g);
    const tone = ctx.createOscillator();
    tone.type = 'square';
    tone.frequency.value = 5200;
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.04, t);
    tg.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    tone.connect(tg);
    const p = ctx.createStereoPanner();
    p.pan.value = 0.25;
    g.connect(p).connect(drumL);
    p.connect(drumR);
    tg.connect(p);
    s.start(t);
    tone.start(t);
    tone.stop(t + 0.13);
  }

  function makeReverbIR(sec: number, decay: number) {
    if (!ctx) throw new Error('audio context not initialised');
    const n = (ctx.sampleRate * sec) | 0;
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < n; i++) {
        d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** decay;
      }
    }
    return buf;
  }

  function tick() {
    if (stopped || !ctx) return;
    const stepDur = 60 / bpm / 4;
    while (nextNoteTime < ctx.currentTime + 0.15) {
      const i = step % TOTAL;

      const L = lead[i];
      if (L) {
        const prev = lead[(i - 1 + TOTAL) % TOTAL];
        const slideFrom =
          prev && Math.abs(prev.note - L.note) <= 2 && prev.dur <= 2
            ? f(prev.note)
            : null;
        playLead(f(L.note), nextNoteTime, stepDur * L.dur * 0.93, 0.08, {
          vibrato: L.dur >= 4 ? 14 : 0,
          slideFrom,
        });
      }
      const Cn = counter[i];
      if (Cn)
        playCounter(f(Cn.note), nextNoteTime, stepDur * Cn.dur * 0.85, 0.034);
      const P = pad[i];
      if (P) {
        const barIdx = Math.floor(i / 16);
        playPad(
          f(P.note),
          chordQuality[barIdx] || 0,
          nextNoteTime,
          stepDur * P.dur,
          0.018
        );
      }
      const Br = brassStabs[i];
      if (Br) playBrass(f(Br.note), nextNoteTime, stepDur * Br.dur * 0.9, 0.05);
      const B = bass[i];
      if (B) playBass(f(B.note), nextNoteTime, stepDur * B.dur * 0.92, 0.32);
      const Sp = sparkle[i];
      if (Sp)
        playSparkle(f(Sp.note), nextNoteTime, stepDur * Sp.dur * 0.9, 0.025);

      const d = drums[i];
      if (d === 1) playKick(nextNoteTime);
      else if (d === 2) playSnare(nextNoteTime);
      else if (d === 3) playHat(nextNoteTime, false);
      else if (d === 4) playHat(nextNoteTime, true);
      else if (d === 5) playClap(nextNoteTime);
      else if (d === 6) playTom(nextNoteTime, true);
      else if (d === 7) playTom(nextNoteTime, false);
      else if (d === 8) playCrash(nextNoteTime);
      else if (d === 9) playRide(nextNoteTime);

      nextNoteTime += stepDur;
      step++;
    }
    scheduler = setTimeout(tick, 25);
  }

  return {
    start() {
      if (!ctx) {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        ctx = new Ctor();
        masterGain = ctx.createGain();
        masterGain.gain.value = volume;
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -12;
        comp.knee.value = 8;
        comp.ratio.value = 4.5;
        comp.attack.value = 0.003;
        comp.release.value = 0.12;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 12000;
        masterGain.connect(comp).connect(lp).connect(ctx.destination);

        const conv = ctx.createConvolver();
        conv.buffer = makeReverbIR(1.8, 2.6);
        const wetBus = ctx.createGain();
        wetBus.gain.value = 0.3;
        const dryBus = ctx.createGain();
        dryBus.gain.value = 1.0;
        const reverbIn = ctx.createGain();
        reverbIn.connect(dryBus).connect(masterGain);
        reverbIn.connect(conv).connect(wetBus).connect(masterGain);

        const c = ctx;
        const makePan = (panVal: number, gainVal = 1) => {
          const g = c.createGain();
          g.gain.value = gainVal;
          const p = c.createStereoPanner();
          p.pan.value = panVal;
          g.connect(p).connect(reverbIn);
          return g;
        };

        leadL = makePan(-0.3, 0.95);
        leadR = makePan(0.3, 0.95);
        counterBus = makePan(-0.45, 0.5);
        padBus = makePan(0, 0.55);
        brassBus = makePan(0.15, 0.6);
        bassBus = ctx.createGain();
        bassBus.gain.value = 0.85;
        bassBus.connect(reverbIn);
        sparkleBus = makePan(0.5, 0.4);
        drumL = makePan(-0.12, 0.7);
        drumR = makePan(0.12, 0.7);
      }
      if (ctx.state === 'suspended') void ctx.resume();
      stopped = false;
      step = 0;
      nextNoteTime = ctx.currentTime + 0.06;
      tick();
    },
    stop() {
      stopped = true;
      if (scheduler) clearTimeout(scheduler);
      if (ctx) void ctx.suspend();
    },
    setVolume(v: number) {
      volume = v;
      if (masterGain && ctx) {
        masterGain.gain.linearRampToValueAtTime(v, ctx.currentTime + 0.05);
      }
    },
    isRunning() {
      return !stopped;
    },
  };
}

function MusicPlayerImpl() {
  const engineRef = useRef<ChiptuneEngine | null>(null);
  const [playing, setPlaying] = useState(false);
  const [vol, setVol] = useState(0.22);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    engineRef.current = createChiptuneEngine();
    return () => engineRef.current?.stop();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setPulse((p) => (p + 1) % 8), 100);
    return () => clearInterval(id);
  }, [playing]);

  const toggle = () => {
    if (!engineRef.current) return;
    if (playing) {
      engineRef.current.stop();
      setPlaying(false);
    } else {
      engineRef.current.start();
      setPlaying(true);
    }
  };

  const onVol = (v: number) => {
    setVol(v);
    engineRef.current?.setVolume(v);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        zIndex: 9999,
        background: 'linear-gradient(180deg, #0a1118, #04080d)',
        border: `1px solid ${playing ? AMBER : '#1a2735'}`,
        boxShadow: playing
          ? `0 0 0 1px #000, 0 0 24px ${HUD}55`
          : '0 6px 20px rgba(0,0,0,0.5)',
        padding: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        color: '#e6f1ff',
        userSelect: 'none',
      }}
    >
      <button
        type="button"
        onClick={toggle}
        title={playing ? 'Pause BGM' : 'Insert coin · play BGM'}
        style={{
          width: 38,
          height: 38,
          background: playing ? AMBER : 'transparent',
          color: playing ? DARK : AMBER,
          border: `1px solid ${AMBER}`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          fontWeight: 700,
          fontFamily: 'inherit',
        }}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          minWidth: 180,
        }}
      >
        <div
          style={{
            fontSize: 8.5,
            letterSpacing: '0.22em',
            color: playing ? AMBER : '#5a6c80',
          }}
        >
          {playing ? '● PLAYING · LAUNCH (SNES)' : '○ INSERT COIN'}
        </div>
        <div
          style={{
            fontSize: 11,
            color: HUD,
            letterSpacing: '0.1em',
            fontWeight: 700,
          }}
        >
          DEPARTURE FOR SPACE
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 2,
            height: 18,
            marginTop: 2,
          }}
        >
          {VIS_BARS.map((slot, i) => {
            const active = playing && (pulse + i) % 8 < 5;
            const h = active
              ? 4 + Math.abs(Math.sin((pulse + i) * 0.9)) * 14
              : 3;
            return (
              <div
                key={slot}
                style={{
                  width: 3,
                  height: h,
                  background: active
                    ? i < 3
                      ? HUD
                      : i < 6
                        ? AMBER
                        : '#7eff8a'
                    : '#1a2735',
                  transition: 'height 0.1s ease-out',
                }}
              />
            );
          })}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          borderLeft: '1px solid #1a2735',
          paddingLeft: 12,
          marginLeft: 2,
        }}
      >
        <div
          style={{
            fontSize: 8.5,
            color: '#5a6c80',
            letterSpacing: '0.22em',
          }}
        >
          VOL
        </div>
        <input
          type="range"
          min="0"
          max="0.4"
          step="0.01"
          value={vol}
          onChange={(e) => onVol(Number.parseFloat(e.target.value))}
          style={{ width: 80, accentColor: HUD }}
        />
      </div>
    </div>
  );
}

export const MusicPlayer = memo(MusicPlayerImpl);
