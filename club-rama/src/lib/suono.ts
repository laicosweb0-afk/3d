/**
 * I suoni sono generati al volo, non caricati da file: pesano zero, partono
 * senza attesa, e quello della ruota può seguire la velocità vera invece di
 * essere una registrazione che va per conto suo.
 *
 * Tutto resta sotto una soglia bassa di volume: è una card che si tocca in
 * un negozio, non un videogioco.
 */

/**
 * Su iPhone l'interruttore del silenzioso zittisce anche il WebAudio. Se però
 * nella pagina c'è un elemento media in riproduzione, il suono passa dal
 * canale multimediale, che il silenzioso non tocca. Teniamo quindi un file
 * muto in loop: non si sente, serve solo a tenere aperta quella porta.
 *
 * Non è garantito su tutte le versioni di iOS. La via sicura resta togliere
 * il silenzioso.
 */
function wavMuto(): string {
  const CAMPIONI = 800;
  const d = new Uint8Array(44 + CAMPIONI);
  const v = new DataView(d.buffer);
  const testo = (o: number, t: string) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  testo(0, 'RIFF'); v.setUint32(4, 36 + CAMPIONI, true); testo(8, 'WAVE');
  testo(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  testo(36, 'data'); v.setUint32(40, CAMPIONI, true);
  d.fill(128, 44); // 128 è lo zero nel formato a 8 bit senza segno
  let bin = '';
  d.forEach((b) => { bin += String.fromCharCode(b); });
  return `data:audio/wav;base64,${btoa(bin)}`;
}

let portaAperta: HTMLAudioElement | null = null;
function apriCanaleMultimediale(): void {
  if (portaAperta) return;
  try {
    portaAperta = new Audio(wavMuto());
    portaAperta.loop = true;
    portaAperta.volume = 0.0001;
    portaAperta.setAttribute('playsinline', '');
    void portaAperta.play().catch(() => { /* niente da fare, resta il silenzioso */ });
  } catch {
    portaAperta = null;
  }
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let rumore: AudioBuffer | null = null;
let muto = false;

/** Ascoltatori del silenziatore, per tenere aggiornata l'icona. */
const osservatori = new Set<(m: boolean) => void>();

function avvia(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 1;
      master.connect(ctx.destination);

      // Mezzo secondo di rumore bianco, riusato da tutti i suoni percussivi.
      const n = Math.floor(ctx.sampleRate * 0.5);
      rumore = ctx.createBuffer(1, n, ctx.sampleRate);
      const dati = rumore.getChannelData(0);
      for (let i = 0; i < n; i++) dati[i] = Math.random() * 2 - 1;
    }
    // Su iOS il contesto nasce sospeso e si sblocca solo dentro un gesto.
    if (ctx.state === 'suspended') void ctx.resume();
    apriCanaleMultimediale();
    return ctx;
  } catch {
    return null;
  }
}

export function silenziato(): boolean { return muto; }

export function commutaSilenzio(): boolean {
  muto = !muto;
  if (master && ctx) master.gain.setTargetAtTime(muto ? 0 : 1, ctx.currentTime, 0.02);
  osservatori.forEach((f) => f(muto));
  return muto;
}

export function osservaSilenzio(f: (m: boolean) => void): () => void {
  osservatori.add(f);
  return () => { osservatori.delete(f); };
}

/** Sblocca l'audio al primo gesto dell'utente. Da chiamare e dimenticare. */
export function sblocca(): void { avvia(); }

/** Vero se il contesto sta davvero suonando: serve a non sprecare i suoni. */
export function pronto(): boolean { return ctx?.state === 'running'; }

/** Colpo secco: uno spicchio è passato sotto la lancetta. */
export function tick(): void {
  const c = avvia();
  if (!c || !rumore || muto) return;
  const t = c.currentTime;

  const s = c.createBufferSource();
  s.buffer = rumore;
  const passa = c.createBiquadFilter();
  passa.type = 'bandpass';
  passa.frequency.value = 2600;
  passa.Q.value = 3.4;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.30, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.032);
  s.connect(passa).connect(g).connect(master!);
  s.start(t);
  s.stop(t + 0.05);

  // Un filo di corpo sotto il click, se no suona di plastica.
  const o = c.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(1150, t);
  o.frequency.exponentialRampToValueAtTime(760, t + 0.03);
  const go = c.createGain();
  go.gain.setValueAtTime(0.0001, t);
  go.gain.exponentialRampToValueAtTime(0.16, t + 0.003);
  go.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
  o.connect(go).connect(master!);
  o.start(t);
  o.stop(t + 0.06);
}

/**
 * Il pop dei box: una goccia. Testa che scende in fretta, corpo corto,
 * un pizzico di transiente sopra perché si senta anche in un negozio.
 */
export function pop(): void {
  const c = avvia();
  if (!c || !rumore || muto) return;
  const t = c.currentTime;

  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(920, t);
  o.frequency.exponentialRampToValueAtTime(240, t + 0.085);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.34, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
  o.connect(g).connect(master!);
  o.start(t);
  o.stop(t + 0.16);

  const n = c.createBufferSource();
  n.buffer = rumore;
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1800;
  const gn = c.createGain();
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.exponentialRampToValueAtTime(0.09, t + 0.002);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.022);
  n.connect(hp).connect(gn).connect(master!);
  n.start(t);
  n.stop(t + 0.04);
}

/** Il tintinnio dell'apertura, sotto "Benvenuto da Rama Ceramiche". */
export function apertura(): void {
  const c = avvia();
  if (!c || muto) return;
  const t = c.currentTime;
  [523.25, 783.99].forEach((hz, i) => {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = hz;
    const g = c.createGain();
    const a = t + i * 0.13;
    g.gain.setValueAtTime(0.0001, a);
    g.gain.exponentialRampToValueAtTime(0.13, a + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, a + 1.3);
    o.connect(g).connect(master!);
    o.start(a);
    o.stop(a + 1.4);
  });
}

/** Tocco su un'opzione o su un bottone: morbido, quasi un respiro. */
export function tocco(acuto = false): void {
  const c = avvia();
  if (!c || muto) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(acuto ? 780 : 560, t);
  o.frequency.exponentialRampToValueAtTime(acuto ? 560 : 400, t + 0.06);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2200;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.20, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  o.connect(lp).connect(g).connect(master!);
  o.start(t);
  o.stop(t + 0.12);
}

/**
 * L'annuncio del credito. Un colpo pieno sotto — quello che si sente nel
 * petto — e sopra un arpeggio che sale e resta. Deve arrivare in un negozio
 * rumoroso, non in una biblioteca.
 */
export function vittoria(): void {
  const c = avvia();
  if (!c || !rumore || muto) return;
  const t = c.currentTime;

  // Il colpo: una sinusoide bassa che scende, come una grancassa morbida.
  const b = c.createOscillator();
  b.type = 'sine';
  b.frequency.setValueAtTime(180, t);
  b.frequency.exponentialRampToValueAtTime(48, t + 0.42);
  const gb = c.createGain();
  gb.gain.setValueAtTime(0.0001, t);
  gb.gain.exponentialRampToValueAtTime(0.42, t + 0.012);
  gb.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
  b.connect(gb).connect(master!);
  b.start(t);
  b.stop(t + 0.75);

  // Lo scroscio che apre, sopra il colpo.
  const n = c.createBufferSource();
  n.buffer = rumore;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(900, t);
  bp.frequency.exponentialRampToValueAtTime(5200, t + 0.35);
  bp.Q.value = 0.9;
  const gn = c.createGain();
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.exponentialRampToValueAtTime(0.14, t + 0.03);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  n.connect(bp).connect(gn).connect(master!);
  n.start(t);
  n.stop(t + 0.6);

  // L'arpeggio: do, mi, sol, do sopra. Sale e resta.
  [523.25, 659.26, 783.99, 1046.5].forEach((hz, i) => {
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.value = hz;
    const g = c.createGain();
    const a = t + 0.06 + i * 0.1;
    g.gain.setValueAtTime(0.0001, a);
    g.gain.exponentialRampToValueAtTime(i === 3 ? 0.24 : 0.17, a + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, a + (i === 3 ? 2.1 : 1.4));
    o.connect(g).connect(master!);
    o.start(a);
    o.stop(a + 2.2);
  });
}

/**
 * Il fruscio della ruota che gira. Resta acceso per tutto il giro e segue la
 * velocità: si apre e si alza quando corre, si chiude e si spegne mentre
 * frena. È questo a far sembrare la ruota pesante, più dei singoli tick.
 */
export function fruscioRuota(): { aggiorna: (v: number) => void; ferma: () => void } {
  const c = avvia();
  if (!c || !rumore || muto) return { aggiorna: () => {}, ferma: () => {} };

  const s = c.createBufferSource();
  s.buffer = rumore;
  s.loop = true;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 400;
  const g = c.createGain();
  g.gain.value = 0;
  s.connect(lp).connect(g).connect(master!);
  s.start();

  return {
    aggiorna(v: number) {
      const k = Math.max(0, Math.min(1, v));
      g.gain.setTargetAtTime(0.11 * k, c.currentTime, 0.05);
      lp.frequency.setTargetAtTime(300 + 1700 * k, c.currentTime, 0.05);
    },
    ferma() {
      const t = c.currentTime;
      g.gain.setTargetAtTime(0, t, 0.08);
      try { s.stop(t + 0.5); } catch { /* già fermo */ }
    },
  };
}
