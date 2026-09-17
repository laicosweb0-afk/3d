/**
 * I suoni sono generati al volo, non caricati da file: pesano zero, partono
 * senza attesa, e quello della ruota può seguire la velocità vera invece di
 * essere una registrazione che va per conto suo.
 *
 * Tutto resta sotto una soglia bassa di volume: è una card che si tocca in
 * un negozio, non un videogioco.
 */

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
      master.gain.value = 0.9;
      master.connect(ctx.destination);

      // Mezzo secondo di rumore bianco, riusato da tutti i suoni percussivi.
      const n = Math.floor(ctx.sampleRate * 0.5);
      rumore = ctx.createBuffer(1, n, ctx.sampleRate);
      const dati = rumore.getChannelData(0);
      for (let i = 0; i < n; i++) dati[i] = Math.random() * 2 - 1;
    }
    // Su iOS il contesto nasce sospeso e si sblocca solo dentro un gesto.
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function silenziato(): boolean { return muto; }

export function commutaSilenzio(): boolean {
  muto = !muto;
  if (master && ctx) master.gain.setTargetAtTime(muto ? 0 : 0.9, ctx.currentTime, 0.02);
  osservatori.forEach((f) => f(muto));
  return muto;
}

export function osservaSilenzio(f: (m: boolean) => void): () => void {
  osservatori.add(f);
  return () => { osservatori.delete(f); };
}

/** Sblocca l'audio al primo gesto dell'utente. Da chiamare e dimenticare. */
export function sblocca(): void { avvia(); }

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
  g.gain.exponentialRampToValueAtTime(0.085, t + 0.002);
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
  go.gain.exponentialRampToValueAtTime(0.04, t + 0.003);
  go.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
  o.connect(go).connect(master!);
  o.start(t);
  o.stop(t + 0.06);
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
  g.gain.exponentialRampToValueAtTime(0.055, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  o.connect(lp).connect(g).connect(master!);
  o.start(t);
  o.stop(t + 0.12);
}

/** La vittoria: tre note che salgono e restano a lungo. Oro, non casinò. */
export function vittoria(): void {
  const c = avvia();
  if (!c || muto) return;
  const t = c.currentTime;
  [659.26, 830.61, 987.77].forEach((hz, i) => {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = hz;
    const g = c.createGain();
    const a = t + i * 0.085;
    g.gain.setValueAtTime(0.0001, a);
    g.gain.exponentialRampToValueAtTime(0.06, a + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, a + 1.5);
    o.connect(g).connect(master!);
    o.start(a);
    o.stop(a + 1.6);
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
      g.gain.setTargetAtTime(0.03 * k, c.currentTime, 0.05);
      lp.frequency.setTargetAtTime(340 + 900 * k, c.currentTime, 0.05);
    },
    ferma() {
      const t = c.currentTime;
      g.gain.setTargetAtTime(0, t, 0.08);
      try { s.stop(t + 0.5); } catch { /* già fermo */ }
    },
  };
}
