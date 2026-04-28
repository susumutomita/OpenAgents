type SfxKind = 'kill' | 'moai' | 'death' | 'shoot' | 'hit';

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let muted = false;

function ensureCtx(): { ctx: AudioContext; out: GainNode } | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.18;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  if (!masterGain) return null;
  return { ctx, out: masterGain };
}

function playKill(c: AudioContext, out: GainNode, t: number) {
  const osc = c.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(820, t);
  osc.frequency.exponentialRampToValueAtTime(180, t + 0.08);
  const g = c.createGain();
  g.gain.setValueAtTime(0.65, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + 0.12);
}

function playMoai(c: AudioContext, out: GainNode, t: number) {
  const osc = c.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(140, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.22);
  const g = c.createGain();
  g.gain.setValueAtTime(0.55, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + 0.3);

  const noiseLen = (c.sampleRate * 0.18) | 0 || 1;
  const buf = c.createBuffer(1, noiseLen, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / noiseLen) ** 1.6;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 800;
  const ng = c.createGain();
  ng.gain.value = 0.4;
  src.connect(hp).connect(ng).connect(out);
  src.start(t);
}

function playDeath(c: AudioContext, out: GainNode, t: number) {
  const osc = c.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(440, t);
  osc.frequency.exponentialRampToValueAtTime(55, t + 0.45);
  const g = c.createGain();
  g.gain.setValueAtTime(0.5, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + 0.55);
}

function playShoot(c: AudioContext, out: GainNode, t: number) {
  const osc = c.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(1500, t);
  osc.frequency.exponentialRampToValueAtTime(900, t + 0.04);
  const g = c.createGain();
  g.gain.setValueAtTime(0.18, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + 0.06);
}

function playHit(c: AudioContext, out: GainNode, t: number) {
  const noiseLen = (c.sampleRate * 0.1) | 0 || 1;
  const buf = c.createBuffer(1, noiseLen, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / noiseLen) ** 1.2;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 600;
  bp.Q.value = 1.2;
  const g = c.createGain();
  g.gain.value = 0.55;
  src.connect(bp).connect(g).connect(out);
  src.start(t);

  const osc = c.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(320, t);
  osc.frequency.exponentialRampToValueAtTime(140, t + 0.12);
  const og = c.createGain();
  og.gain.setValueAtTime(0.4, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  osc.connect(og).connect(out);
  osc.start(t);
  osc.stop(t + 0.16);
}

export function playSfx(kind: SfxKind): void {
  if (muted) return;
  const handle = ensureCtx();
  if (!handle) return;
  const t = handle.ctx.currentTime;
  switch (kind) {
    case 'kill':
      playKill(handle.ctx, handle.out, t);
      break;
    case 'moai':
      playMoai(handle.ctx, handle.out, t);
      break;
    case 'death':
      playDeath(handle.ctx, handle.out, t);
      break;
    case 'shoot':
      playShoot(handle.ctx, handle.out, t);
      break;
    case 'hit':
      playHit(handle.ctx, handle.out, t);
      break;
  }
}

export function setSfxMuted(value: boolean): void {
  muted = value;
}
