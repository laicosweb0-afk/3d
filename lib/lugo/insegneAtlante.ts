// L'atlante unico delle insegne, e il colore che ogni bottega si porta
// addosso. Qui non c'è React: è codice puro, così l'atlante si costruisce
// una volta per mondo e il collaudo può misurarlo senza montare la scena.
//
// Il conto che governa tutte le misure è uno solo:
//   px = altezzaViewport * altezzaInMetri / (2 * distanza * tan(fov/2))
// Col fov 55° del gioco e una finestra alta 800 px viene px ≈ 768 * h / d.
// Sotto i nove pixel una forma non si riconosce più; sotto i dieci pixel di
// altezza-maiuscola una parola non si legge più. Da lì escono i numeri qui
// sotto, e da lì esce anche la dichiarazione onesta: IL NOME SI LEGGE FINO
// A UNA TRENTINA DI METRI. Più in là il lavoro lo fanno il simbolo e il
// colore, ed è per questo che esistono.

import * as THREE from 'three';
import { COLORE_CATEGORIA, hashNome, type CategoriaAttivita } from './attivita';
import { estrai } from './carattere';
import {
  PITTOGRAMMI_NON_TINTI,
  REPERTORIO,
  tesseraPittogramma,
  disegnaPittogramma,
  type Pittogramma,
} from './pittogrammi';

export interface IdentitaBottega {
  /** Il fondo scuro della fascia frontale. */
  fondo: THREE.Color;
  /** Il colore del nome sulla fascia. */
  testo: THREE.Color;
  /** Il campo chiaro del pannello a bandiera. */
  campo: THREE.Color;
  /** La tela del tendone. */
  tenda: THREE.Color;
  /** La pietra della cornicetta e della piastra. */
  cornice: THREE.Color;
}

export const MISURE = {
  /** Altezza della fascia frontale. A 20 m fa 25 px: si vede che c'è. */
  bandaH: 0.66,
  /** Altezza della maiuscola del nome al corpo massimo. A 25 m fa 13 px. */
  capNome: 0.42,
  /** Il pannello a bandiera: a 60 m è ancora una macchia di colore da 14 px. */
  bandieraW: 0.95,
  bandieraH: 1.10,
  /** La piastra chiara dietro: sporge 6 cm e stacca il pannello dal muro. */
  piastraW: 1.07,
  piastraH: 1.22,
  /** Il simbolo dentro il pannello. */
  simboloH: 0.86,
  /** Quanto sporgono dal muro bandiera e tendone. */
  sportoBandiera: 1.25,
  sportoTenda: 1.35,
  tendaCaduta: 0.62,
  mantovanaH: 0.28,
  offsetFascia: 0.10,
  offsetMerce: 0.085,
} as const;

export interface UV {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

export interface DatiBottega {
  nome: string;
  categoria: CategoriaAttivita;
  pittogramma: Pittogramma;
  identita: IdentitaBottega;
  larghezza: number;
  /** Solo da logoAutorizzato(): mai il valore grezzo del file dei dati. */
  logo: string | null;
}

/** Quanti pixel alti fa a schermo un oggetto di `hMetri` a `distanza`. */
export function pixelSuSchermo(
  hMetri: number,
  distanza: number,
  altezzaViewport: number,
  fovGradi: number,
): number {
  return (altezzaViewport * hMetri) / (2 * distanza * Math.tan((fovGradi * Math.PI) / 360));
}

// ── l'identità cromatica ────────────────────────────────────────────────────

const CAMPO_L: Record<CategoriaAttivita, [number, number]> = {
  bar: [0.56, 0.64],
  cibo: [0.52, 0.60],
  tabacchi: [0.44, 0.52],
  farmacia: [0.50, 0.58],
  negozio: [0.58, 0.66],
  servizi: [0.36, 0.44],
};

const CAMPO_S_MIN: Record<CategoriaAttivita, number> = {
  bar: 0.62, cibo: 0.58, tabacchi: 0.44, farmacia: 0.50, negozio: 0.40, servizi: 0.14,
};

const PIETRA_CORNICE = '#EDE5D2';

function luminanza(c: THREE.Color): number {
  const f = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}

const _hsl = { h: 0, s: 0, l: 0 };

/**
 * Il colore di una bottega: deterministico dal nome, imparentato con la
 * categoria, e SCOSTATO dal colore della facciata che la ospita.
 *
 * L'ultimo punto è quello che conta davvero. Lugo è una città di intonaci
 * gialli fra i 30 e i 45 gradi di tinta: senza lo scarto, ogni bar e ogni
 * panetteria diventano invisibili proprio sulle vie del centro, che è dove
 * stanno tutte.
 */
export function identitaBottega(
  nome: string,
  categoria: CategoriaAttivita,
  facciata: THREE.Color,
  insegnaAutorizzata?: { fondo?: string; testo?: string; tenda?: string },
): IdentitaBottega {
  const h32 = hashNome(nome + '|' + categoria);
  const r = (k: number) => estrai(h32, k);
  const base = new THREE.Color(COLORE_CATEGORIA[categoria] ?? '#8A8A96');
  base.getHSL(_hsl);

  let H = (_hsl.h + (r(1) - 0.5) * 0.05 + 1) % 1;
  let S = Math.max(CAMPO_S_MIN[categoria], Math.min(0.94, _hsl.s * (0.86 + r(2) * 0.3)));

  const hf = facciata.getHSL({ h: 0, s: 0, l: 0 }).h;
  const dH = Math.min(Math.abs(H - hf), 1 - Math.abs(H - hf));
  if (dH < 0.055) {
    H = (H + (H >= hf ? 0.075 : -0.075) + 1) % 1;
    S = Math.min(0.94, S + 0.1);
  }

  const [lMin, lMax] = CAMPO_L[categoria];
  const fondo = new THREE.Color().setHSL(H, Math.min(0.8, S * 0.92), 0.17 + r(3) * 0.06);
  const campo = new THREE.Color().setHSL(H, S, lMin + r(4) * (lMax - lMin));
  const tenda = new THREE.Color().setHSL(H, S * 0.88, 0.4 + r(5) * 0.07);

  if (insegnaAutorizzata?.fondo) fondo.set(insegnaAutorizzata.fondo);
  if (insegnaAutorizzata?.tenda) tenda.set(insegnaAutorizzata.tenda);

  // Il colore del nome NON si eredita mai alla cieca: si ricalcola dalla
  // luminanza del fondo, anche quando i colori arrivano dal file dei dati.
  // Un esercente può autorizzare i suoi colori; non può autorizzare
  // un'insegna illeggibile.
  const chiaro = new THREE.Color('#F4EEDD');
  const scuro = new THREE.Color('#1A1712');
  let testo = luminanza(fondo) > 0.3 ? scuro : chiaro;
  if (insegnaAutorizzata?.testo) {
    const voluto = new THREE.Color(insegnaAutorizzata.testo);
    const contrasto =
      (Math.max(luminanza(voluto), luminanza(fondo)) + 0.05) /
      (Math.min(luminanza(voluto), luminanza(fondo)) + 0.05);
    if (contrasto >= 4.5) testo = voluto;
  }

  return { fondo, testo, campo, tenda, cornice: new THREE.Color(PIETRA_CORNICE) };
}

// ── l'atlante ───────────────────────────────────────────────────────────────

export interface Atlante {
  tex: THREE.CanvasTexture;
  canvas: HTMLCanvasElement;
  lato: number;
  /** La banda col nome della bottega i. */
  uvBanda(i: number): UV;
  /** La tessera di un simbolo. */
  uvSimbolo(p: Pittogramma): UV;
  /** Il texel bianco puro su cui appoggiano i quad tinti dal vertice. */
  uvBianco(): UV;
  /** Le righe della tela del tendone, con la mantovana festonata in fondo. */
  uvRighe(): UV;
  /** Dipinge i loghi autorizzati dentro le bande. Ritorna quanti ne ha messi. */
  applicaLoghi(botteghe: DatiBottega[]): Promise<number>;
  /** Quante bande ci stanno: oltre, le botteghe in più restano senza nome. */
  slot: number;
}

/**
 * L'atlante: 2048×2048, uno solo, opaco. Quattro fasce, e la somma fa
 * esattamente 2048 righe.
 *   A — bande col nome, 512×96, quattro colonne
 *   B — pittogrammi, 128×128, sedici per riga
 *   C — riserva
 *   D — servizio: il bianco puro e le righe del tendone
 *
 * Con `ridotto` (qualità bassa) scende a 1024×1024: a quella qualità anche
 * il rapporto di pixel è 1.0, quindi non si perde niente che si vedesse.
 */
export function costruisciAtlante(botteghe: DatiBottega[], ridotto: boolean): Atlante {
  const lato = ridotto ? 1024 : 2048;
  const k = ridotto ? 0.5 : 1;
  const BW = 512 * k;
  const BH = 96 * k;
  const COL = 4;
  const RIGHE_A = 17;
  const SLOT = COL * RIGHE_A;
  const yB = RIGHE_A * BH; // 1632 (o 816)
  const PW = 128 * k;
  const yD = lato - 64 * k;

  const canvas = document.createElement('canvas');
  canvas.width = lato;
  canvas.height = lato;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#2A2430';
  ctx.fillRect(0, 0, lato, lato);

  // ── fascia A: una banda per bottega ──
  const gutter = 6 * k;
  botteghe.slice(0, SLOT).forEach((b, i) => {
    const cx = (i % COL) * BW;
    const cy = ((i / COL) | 0) * BH;
    const fondo = '#' + b.identita.fondo.getHexString();
    const testo = '#' + b.identita.testo.getHexString();
    ctx.fillStyle = fondo;
    ctx.fillRect(cx, cy, BW, BH);

    // il riquadro del simbolo a sinistra: se la bottega ha un logo
    // autorizzato resta vuoto e lo riempirà applicaLoghi
    const lat = BH - gutter * 2 - 4 * k;
    if (!b.logo) {
      disegnaPittogramma(ctx, b.pittogramma, cx + gutter + lat / 2, cy + BH / 2, lat, testo, fondo);
    }

    // il nome: si parte grande e si scende finché non ci sta
    const x0 = cx + gutter + lat + 12 * k;
    const larghezza = cx + BW - gutter - x0;
    ctx.fillStyle = testo;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    let corpo = Math.round(74 * k);
    const pavimento = Math.round(40 * k);
    let nome = (b.nome || 'Bottega').toUpperCase();
    const font = (c: number) => `bold ${c}px ui-sans-serif, system-ui, sans-serif`;
    ctx.font = font(corpo);
    while (ctx.measureText(nome).width > larghezza && corpo > pavimento) {
      corpo -= 2;
      ctx.font = font(corpo);
    }
    if (ctx.measureText(nome).width > larghezza) {
      nome = nome.slice(0, 26) + '…';
      while (ctx.measureText(nome).width > larghezza && nome.length > 4) {
        nome = nome.slice(0, -2) + '…';
      }
    }
    // la spaziatura fra lettere non esiste su tutti i browser: dove manca,
    // il nome esce un filo più stretto e basta
    if ('letterSpacing' in ctx) {
      (ctx as unknown as { letterSpacing: string }).letterSpacing = (corpo * 0.03).toFixed(1) + 'px';
    }
    ctx.fillText(nome, x0, cy + BH / 2 - 2 * k);
    if ('letterSpacing' in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = '0px';

    // il filetto di categoria: due botteghe vicine non hanno la stessa insegna
    ctx.fillStyle = COLORE_CATEGORIA[b.categoria] ?? '#8A8A96';
    ctx.fillRect(cx + gutter, cy + BH - gutter - 4 * k, BW - gutter * 2, 4 * k);
  });

  // ── fascia B: i pittogrammi ──
  const perRiga = 16;
  const slotSimbolo = new Map<Pittogramma, number>();
  REPERTORIO.forEach((p, i) => {
    slotSimbolo.set(p, i);
    const x = (i % perRiga) * PW;
    const y = yB + ((i / perRiga) | 0) * PW;
    tesseraPittogramma(ctx, p, x, y, PW, 10 * k);
  });

  // ── fascia D: il bianco di servizio e le righe del tendone ──
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, yD, 64 * k, 64 * k);
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#FFFFFF' : '#9E9E9E';
    ctx.fillRect(64 * k + i * 32 * k, yD, 32 * k, 64 * k);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;

  const u = (px: number) => px / lato;
  const v = (px: number) => 1 - px / lato;

  const atl: Atlante = {
    tex,
    canvas,
    lato,
    slot: SLOT,
    uvBanda(i) {
      const j = Math.min(i, SLOT - 1);
      const cx = (j % COL) * BW;
      const cy = ((j / COL) | 0) * BH;
      return { u0: u(cx + 2), v0: v(cy + BH - 2), u1: u(cx + BW - 2), v1: v(cy + 2) };
    },
    uvSimbolo(p) {
      const i = slotSimbolo.get(p) ?? 0;
      const x = (i % perRiga) * PW;
      const y = yB + ((i / perRiga) | 0) * PW;
      const g = 8 * k;
      return { u0: u(x + g), v0: v(y + PW - g), u1: u(x + PW - g), v1: v(y + g) };
    },
    uvBianco() {
      // sempre lo stesso texel centrale: nessun filtro e nessun livello di
      // mipmap può inquinarlo, ed è quello su cui appoggiano tutti i quad
      // che prendono il colore dal vertice
      const c = u(32 * k);
      const d = v(yD + 32 * k);
      return { u0: c, v0: d, u1: c, v1: d };
    },
    uvRighe() {
      return { u0: u(64 * k), v0: v(yD + 64 * k), u1: u(576 * k), v1: v(yD) };
    },
    async applicaLoghi(elenco) {
      let messi = 0;
      await Promise.all(
        elenco.slice(0, SLOT).map(
          (b, i) =>
            new Promise<void>((risolvi) => {
              if (!b.logo) return risolvi();
              const img = new Image();
              img.decoding = 'async';
              img.onload = () => {
                const cx = (i % COL) * BW;
                const cy = ((i / COL) | 0) * BH;
                const lat = BH - gutter * 2 - 4 * k;
                ctx.fillStyle = '#' + b.identita.fondo.getHexString();
                ctx.fillRect(cx + gutter, cy + gutter, lat, lat);
                // contenuto dentro il riquadro, mai stirato
                const s = Math.min((lat - 4 * k) / img.width, (lat - 4 * k) / img.height);
                const w = img.width * s;
                const h = img.height * s;
                ctx.drawImage(img, cx + gutter + (lat - w) / 2, cy + gutter + (lat - h) / 2, w, h);
                messi++;
                tex.needsUpdate = true;
                risolvi();
              };
              // se il file manca o è rotto resta il pittogramma: mai un
              // riquadro nero sull'insegna di qualcuno
              img.onerror = () => risolvi();
              img.src = b.logo;
            }),
        ),
      );
      return messi;
    },
  };
  return atl;
}

/** Il simbolo va tinto col colore della bottega, o ha già i suoi? */
export function simboloTinto(p: Pittogramma): boolean {
  return !PITTOGRAMMI_NON_TINTI.has(p);
}
