'use client';

// Suono del gioco: tutto procedurale (WebAudio, zero asset), sul pattern di
// lib/audio.ts del sito — che resta intatto. Il motore è una sega filtrata
// col pitch legato alla velocità, il rotolamento e il vento sono rumore
// rosa filtrato, i passi sono tick, le missioni suonano campanelli.

import type { RuntimeGioco } from './runtime';
import type { Modalita } from './store';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let gMotore: GainNode, gRotola: GainNode, gVento: GainNode;
// i bus del mixer: ognuno regolabile dalle impostazioni
let busEffetti: GainNode, busVoce: GainNode, busAmbiente: GainNode, busMusica: GainNode;
let gCitta: GainNode, gGrilli: GainNode;
let filtroCitta: BiquadFilterNode;
let oscMotore: OscillatorNode;
let filtroMotore: BiquadFilterNode;
let noiseBuf: AudioBuffer;
let attivo = false;
let passoAcc = 0;
let urtoUltimo = 0;
let uccelliUltimo = 0;
let voceUltima = 0;

/** Volumi del mixer, 0–1. Li scrivono le impostazioni. */
export const volumi = { effetti: 1, voce: 1, ambiente: 1, musica: 0.7 };

/**
 * Ganci per le voci registrate: oggi le battute sono sintetizzate, ma la
 * struttura è già pronta. Basterà mettere qui i percorsi dei file audio
 * (uno per tipo di NPC) e `parla()` li userà al posto della sintesi.
 */
export const VOCI_FILE: Record<string, string | null> = {
  maranza: null,
  anziano: null,
  studente: null,
  ciclista: null,
  carabiniere: null,
};

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

  // i quattro bus del mixer
  busEffetti = ctx.createGain();
  busVoce = ctx.createGain();
  busAmbiente = ctx.createGain();
  busMusica = ctx.createGain();
  for (const b of [busEffetti, busVoce, busAmbiente, busMusica]) b.connect(master);
  applicaVolumi();

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

  // il brusio della città: rumore filtrato che cambia con l'ora e con
  // quanta gente hai intorno
  filtroCitta = ctx.createBiquadFilter();
  filtroCitta.type = 'bandpass';
  filtroCitta.frequency.value = 480;
  filtroCitta.Q.value = 0.55;
  gCitta = ctx.createGain();
  gCitta.gain.value = 0;
  loopRumore(ctx).connect(filtroCitta).connect(gCitta).connect(busAmbiente);

  // i grilli della sera in campagna
  const bpGrilli = ctx.createBiquadFilter();
  bpGrilli.type = 'bandpass';
  bpGrilli.frequency.value = 4200;
  bpGrilli.Q.value = 8;
  gGrilli = ctx.createGain();
  gGrilli.gain.value = 0;
  loopRumore(ctx).connect(bpGrilli).connect(gGrilli).connect(busAmbiente);
}

function applicaVolumi(): void {
  if (!ctx || !busEffetti) return;
  const t = ctx.currentTime;
  busEffetti.gain.setTargetAtTime(volumi.effetti, t, 0.1);
  busVoce.gain.setTargetAtTime(volumi.voce, t, 0.1);
  busAmbiente.gain.setTargetAtTime(volumi.ambiente, t, 0.1);
  busMusica.gain.setTargetAtTime(volumi.musica, t, 0.1);
}

/** Aggiorna il mixer dalle impostazioni. */
export function setVolumi(v: Partial<typeof volumi>): void {
  Object.assign(volumi, v);
  applicaVolumi();
}

/**
 * Una battuta di strada: oggi sintetizzata (due-tre sillabe con formante
 * che sale e scende), domani un file da VOCI_FILE. Ha un cooldown suo per
 * non diventare fastidiosa.
 */
export function parla(tipo: string, quando = 0): void {
  if (!attivo || !ctx || !busVoce) return;
  const t = ctx.currentTime;
  if (t - voceUltima < 2.2) return;
  voceUltima = t;
  const file = VOCI_FILE[tipo];
  if (file) return; // qui andrà la riproduzione del campione, quando ci sarà
  const base = tipo === 'anziano' ? 120 : tipo === 'studente' ? 210 : 165;
  const sillabe = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < sillabe; i++) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 6;
    const g = ctx.createGain();
    const t0 = t + quando + i * 0.16;
    const alt = base * (0.9 + Math.random() * 0.35);
    o.frequency.setValueAtTime(alt, t0);
    o.frequency.linearRampToValueAtTime(alt * 0.86, t0 + 0.12);
    f.frequency.setValueAtTime(700 + Math.random() * 700, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.07, t0 + 0.02);
    g.gain.linearRampToValueAtTime(0, t0 + 0.13);
    o.connect(f).connect(g).connect(busVoce);
    o.start(t0);
    o.stop(t0 + 0.16);
  }
}

/** Il campanello della bici che ti sorpassa. */
export function campanello(): void {
  if (!attivo || !ctx || !busEffetti) return;
  const t = ctx.currentTime;
  for (const [f, q] of [[2400, 0], [3100, 0.08]] as const) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, t + q);
    g.gain.exponentialRampToValueAtTime(0.09, t + q + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0008, t + q + 0.32);
    o.connect(g).connect(busEffetti);
    o.start(t + q);
    o.stop(t + q + 0.34);
  }
}

/**
 * Il clacson dell'auto ferma che ti sei parato davanti. Due voci
 * leggermente stonate sono il clacson di un'utilitaria: una sola sarebbe
 * un fischio da elettrodomestico. Suona una volta e basta — è il modo in
 * cui l'auto ti dice che sei in mezzo alla strada, non un allarme.
 */
export function clacson(): void {
  if (!attivo || !ctx || !busEffetti) return;
  const t = ctx.currentTime;
  for (const f of [370, 440]) {
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0008, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
    g.gain.setValueAtTime(0.05, t + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.45);
    o.connect(g).connect(busEffetti);
    o.start(t);
    o.stop(t + 0.47);
  }
}

/**
 * Il letto ambientale: brusio di città di giorno, grilli e silenzio di
 * notte, uccelli al mattino. `luci` è 0 (giorno) → 1 (notte), `vicini` è
 * quanta gente hai attorno.
 */
export function updateAmbiente(luci: number, vicini: number, ora: number): void {
  if (!attivo || !ctx || !gCitta) return;
  const t = ctx.currentTime;
  const giorno = 1 - luci;
  const folla = Math.min(1, vicini / 14);
  gCitta.gain.setTargetAtTime(0.012 + giorno * 0.045 + folla * 0.03, t, 0.9);
  filtroCitta.frequency.setTargetAtTime(380 + folla * 320, t, 1.2);
  gGrilli.gain.setTargetAtTime(luci > 0.55 ? 0.014 : 0, t, 1.5);
  // gli uccelli del mattino, ogni tanto
  if (ora > 5.5 && ora < 10.5 && t - uccelliUltimo > 6 + Math.random() * 10) {
    uccelliUltimo = t;
    for (let i = 0; i < 3; i++) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      const g = ctx.createGain();
      const t0 = t + i * 0.11;
      o.frequency.setValueAtTime(2600 + Math.random() * 900, t0);
      o.frequency.linearRampToValueAtTime(3400 + Math.random() * 800, t0 + 0.07);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.035, t0 + 0.015);
      g.gain.linearRampToValueAtTime(0, t0 + 0.09);
      o.connect(g).connect(busAmbiente);
      o.start(t0);
      o.stop(t0 + 0.1);
    }
  }
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
  s.connect(f).connect(g).connect(busEffetti ?? master!);
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
  o.connect(g).connect(busEffetti ?? master!);
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
export function updateAudio(rt: RuntimeGioco, mode: Modalita, dt: number): void {
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
  } else if (mode === 'bici') {
    // in sella non si sentono i passi e non si sente il motore: si sente la
    // ruota che rotola e, sopra i venti all'ora, un filo d'aria
    set(gMotore, 0.008);
    set(gRotola, Math.min(0.05, rt.vPersona * 0.006));
    set(gVento, Math.max(0, (rt.vPersona - 6) * 0.005));
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
