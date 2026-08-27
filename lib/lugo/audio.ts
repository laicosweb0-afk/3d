'use client';

// Suono del gioco: tutto procedurale (WebAudio, zero asset), sul pattern di
// lib/audio.ts del sito — che resta intatto. Il motore è una sega filtrata
// col pitch legato alla velocità, il rotolamento e il vento sono rumore
// rosa filtrato, i passi sono tick, le missioni suonano campanelli.

import type { RuntimeGioco } from './runtime';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let gMotore: GainNode, gRotola: GainNode, gVento: GainNode;
let oscMotore: OscillatorNode;
let filtroMotore: BiquadFilterNode;
let noiseBuf: AudioBuffer;
let attivo = false;
let passoAcc = 0;
let urtoUltimo = 0;

function creaRumore(c: AudioContext): AudioBuffer {
  const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.98 * b0 + w * 0.06;
    b1 = 0.94 * b1 + w * 0.12;
    d[i] = (b0 + b1 + w * 0.05) * 1.4;
  }
  return buf;
}

function loopRumore(c: AudioContext): AudioBufferSourceNode {
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  s.start();
  return s;
}

function costruisci(): void {
  if (ctx) return;
  ctx = new AudioContext();
  noiseBuf = creaRumore(ctx);
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  // motore: sawtooth + lowpass, il pitch sale con la velocità
  oscMotore = ctx.createOscillator();
  oscMotore.type = 'sawtooth';
  oscMotore.frequency.value = 55;
  filtroMotore = ctx.createBiquadFilter();
  filtroMotore.type = 'lowpass';
  filtroMotore.frequency.value = 320;
  gMotore = ctx.createGain();
  gMotore.gain.value = 0;
  oscMotore.connect(filtroMotore).connect(gMotore).connect(master);
  oscMotore.start();

  // rotolamento gomme: rumore basso
  const lpRotola = ctx.createBiquadFilter();
  lpRotola.type = 'lowpass';
  lpRotola.frequency.value = 260;
  gRotola = ctx.createGain();
  gRotola.gain.value = 0;
  loopRumore(ctx).connect(lpRotola).connect(gRotola).connect(master);

  // vento in velocità
  const bpVento = ctx.createBiquadFilter();
  bpVento.type = 'bandpass';
  bpVento.frequency.value = 700;
  bpVento.Q.value = 0.8;
  gVento = ctx.createGain();
  gVento.gain.value = 0;
  loopRumore(ctx).connect(bpVento).connect(gVento).connect(master);
}

function tick(freq: number, gain = 0.1, dur = 0.06): void {
  if (!ctx || !master || !attivo) return;
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  s.playbackRate.value = 0.8 + Math.random() * 0.4;
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

function nota(freq: number, quando: number, dur = 0.16, gain = 0.14): void {
  if (!ctx || !master) return;
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.value = freq;
  const g = ctx.createGain();
  const t = ctx.currentTime + quando;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export function setAudioAttivo(on: boolean): void {
  attivo = on;
  if (on) {
    costruisci();
    void ctx!.resume();
    master!.gain.linearRampToValueAtTime(0.5, ctx!.currentTime + 0.6);
  } else if (ctx && master) {
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
  }
}

export function suonaEvento(evento: 'tappa' | 'successo' | 'fallita' | 'salita'): void {
  if (!attivo || !ctx) return;
  if (evento === 'tappa') {
    nota(880, 0);
    nota(1320, 0.09);
  } else if (evento === 'successo') {
    nota(660, 0, 0.14);
    nota(880, 0.1, 0.14);
    nota(1100, 0.2, 0.22, 0.16);
  } else if (evento === 'fallita') {
    nota(220, 0, 0.3, 0.12);
    nota(165, 0.16, 0.4, 0.12);
  } else {
    tick(1400, 0.12, 0.05);
  }
}

/** Chiamata ogni frame dal driver dentro il canvas. */
export function updateAudio(rt: RuntimeGioco, mode: 'auto' | 'piedi', dt: number): void {
  if (!attivo || !ctx || !master) return;
  const t = ctx.currentTime;
  const set = (g: GainNode, v: number) => g.gain.setTargetAtTime(v, t, 0.08);

  if (mode === 'auto') {
    const v = Math.abs(rt.vAuto);
    const giri = Math.min(1, v / 22);
    oscMotore.frequency.setTargetAtTime(50 + giri * 130, t, 0.06);
    filtroMotore.frequency.setTargetAtTime(260 + giri * 900, t, 0.08);
    set(gMotore, 0.05 + giri * 0.075);
    set(gRotola, Math.min(0.09, v * 0.006));
    set(gVento, Math.max(0, (v - 11) * 0.006));
  } else {
    set(gMotore, 0.012); // il motore resta acceso al minimo, in lontananza
    set(gRotola, 0);
    set(gVento, 0);
    // passi
    if (rt.vPersona > 0.4) {
      passoAcc += dt * (rt.vPersona > 3 ? 3.4 : 2.2);
      if (passoAcc >= 1) {
        passoAcc = 0;
        tick(900, 0.06, 0.045);
      }
    }
  }

  // urti dell'auto
  if (rt.urto > 2 && t - urtoUltimo > 0.25) {
    urtoUltimo = t;
    tick(180, Math.min(0.3, 0.08 + rt.urto * 0.02), 0.12);
  }
}
