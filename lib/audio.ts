'use client';

// Sound design procedurale (WebAudio, nessun asset): quasi invisibile,
// tutto campionato dal progresso come il resto del sito. Opt-in.
//
// Intro: vento leggerissimo + sub morbido · Costruzione: micro-impatti
// · Interni: room tone pulito · Scroll: micro-whoosh · Congedo: ritorno
// del vento e silenzio.

import { pAt, span, smooth, clamp01 } from './scenes';
import { buildProgress, doorOpen, windowOpen } from '@/content/direction';

const BUILD_TICKS = 14;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let gWind: GainNode, gSub: GainNode, gRoom: GainNode, gWhoosh: GainNode;
let whooshFilter: BiquadFilterNode;
let noiseBuf: AudioBuffer;
let enabled = false;
let lastTick = -1;
let doorWas = 0;
let windowWas = 0;

function makeNoise(c: AudioContext): AudioBuffer {
  const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0;
  for (let i = 0; i < d.length; i++) {
    // rosa approssimato: più morbido del bianco
    const w = Math.random() * 2 - 1;
    b0 = 0.98 * b0 + w * 0.06;
    b1 = 0.94 * b1 + w * 0.12;
    d[i] = (b0 + b1 + w * 0.05) * 1.4;
  }
  return buf;
}

function loopNoise(c: AudioContext): AudioBufferSourceNode {
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  s.start();
  return s;
}

function build(): void {
  if (ctx) return;
  ctx = new AudioContext();
  noiseBuf = makeNoise(ctx);
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  // vento: rosa filtrato basso, respiro lento via LFO
  const windLp = ctx.createBiquadFilter();
  windLp.type = 'lowpass';
  windLp.frequency.value = 420;
  gWind = ctx.createGain();
  gWind.gain.value = 0;
  loopNoise(ctx).connect(windLp).connect(gWind).connect(master);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.13;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 90;
  lfo.connect(lfoG).connect(windLp.frequency);
  lfo.start();

  // sub: quasi inudibile, dà corpo all'intro e al congedo
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = 52;
  gSub = ctx.createGain();
  gSub.gain.value = 0;
  sub.connect(gSub).connect(master);
  sub.start();

  // room tone interni: banda stretta, pulita
  const roomHp = ctx.createBiquadFilter();
  roomHp.type = 'highpass';
  roomHp.frequency.value = 240;
  const roomLp = ctx.createBiquadFilter();
  roomLp.type = 'lowpass';
  roomLp.frequency.value = 900;
  gRoom = ctx.createGain();
  gRoom.gain.value = 0;
  loopNoise(ctx).connect(roomHp).connect(roomLp).connect(gRoom).connect(master);

  // micro-whoosh dello scroll
  whooshFilter = ctx.createBiquadFilter();
  whooshFilter.type = 'bandpass';
  whooshFilter.frequency.value = 500;
  whooshFilter.Q.value = 0.9;
  gWhoosh = ctx.createGain();
  gWhoosh.gain.value = 0;
  loopNoise(ctx).connect(whooshFilter).connect(gWhoosh).connect(master);
}

/** Micro-impatto di cantiere / click di serramento. */
function tick(freq: number, gain = 0.09, dur = 0.07): void {
  if (!ctx || !master || !enabled) return;
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  s.playbackRate.value = 0.7 + Math.random() * 0.5;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  const g = ctx.createGain();
  const t = ctx.currentTime;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(master);
  s.start(t, Math.random() * 1.5, dur + 0.02);
}

export function setAudioEnabled(on: boolean): void {
  enabled = on;
  if (on) {
    build();
    ctx!.resume();
    master!.gain.linearRampToValueAtTime(0.55, ctx!.currentTime + 0.8);
  } else if (ctx && master) {
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
  }
}

/** Chiamata dal ticker: tutto il suono è f(p, velocità). */
export function updateAudio(p: number, velocity: number): void {
  if (!enabled || !ctx || !master) return;
  const t = ctx.currentTime;
  const set = (g: GainNode, v: number) => g.gain.setTargetAtTime(v, t, 0.25);

  // vento: pieno nell'intro, sparisce dentro, torna all'uscita
  const intro = 1 - smooth(span(p, pAt('s03', 0.4), pAt('s04', 0.2)));
  const uscita = smooth(span(p, pAt('s11', 0.3), pAt('s11', 0.9)));
  const congedo = 1 - smooth(span(p, pAt('s12', 0.6), pAt('s12', 0.95)));
  set(gWind, 0.05 * Math.max(intro, uscita * congedo));

  // sub: intro e congedo, appena percettibile
  set(gSub, 0.018 * Math.max(intro, 1 - congedo === 0 ? 0 : smooth(span(p, pAt('s12', 0.3), pAt('s12', 0.8)))));

  // room tone: dagli interni fino alla finestra
  const dentro = smooth(span(p, pAt('s06', 0.9), pAt('s07', 0.3))) *
    (1 - smooth(span(p, pAt('s11', 0.2), pAt('s11', 0.6))));
  set(gRoom, 0.022 * dentro);

  // micro-whoosh: solo quando lo scroll corre
  const v = clamp01(velocity * 3);
  set(gWhoosh, 0.05 * v * v);
  whooshFilter.frequency.setTargetAtTime(350 + v * 900, t, 0.1);

  // costruzione: un micro-impatto per fase (idempotente, con isteresi)
  const bp = buildProgress(p);
  const step = Math.floor(bp * BUILD_TICKS);
  if (step !== lastTick && bp > 0.01 && bp < 0.99) {
    lastTick = step;
    tick(700 + Math.random() * 700, 0.07);
  }

  // serramenti: click discreti su apertura/chiusura
  const d = doorOpen(p);
  if ((doorWas < 0.5) !== (d < 0.5)) tick(1600, 0.08, 0.05);
  doorWas = d;
  const w = windowOpen(p);
  if ((windowWas < 0.5) !== (w < 0.5)) tick(1900, 0.06, 0.045);
  windowWas = w;
}
