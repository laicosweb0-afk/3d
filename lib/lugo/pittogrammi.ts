// I simboli di mestiere delle botteghe di Lugo, disegnati da noi.
//
// Un marchio vero non si può copiare senza l'autorizzazione di chi lo
// possiede — e infatti qui dentro non ce n'è nemmeno uno. Una tazzina, una
// croce, un paio di forbici sì: sono simboli di mestiere, vecchi quanto le
// botteghe, e sono il modo legale e immediato per capire da lontano che
// cosa vende un negozio. Il nome sul cartello dice CHI è; il simbolo dice
// CHE COSA fa, e si legge anche quando il nome è già diventato una riga
// grigia.
//
// LA REGOLA CHE GOVERNA OGNI DISEGNO non è il gusto, è il mipmap. A 60
// metri il simbolo occupa una decina di pixel sullo schermo e la scheda
// video campiona un livello ridotto dell'atlante: un tratto sottile,
// mediato quattro volte, diventa grigio e sparisce. Quindi tratto grosso
// (mai sotto 0,15 del lato), estremi tondi, tutto dentro il cerchio
// centrale, e nessun dettaglio più piccolo del tratto.

import type { CategoriaAttivita } from './attivita';

export type Pittogramma =
  | 'tazzina' | 'bicchiere' | 'forchetta' | 'pane' | 'torta' | 'cono'
  | 'coltellaccio' | 'mela' | 'T' | 'croce' | 'sacchetto' | 'maglietta'
  | 'scarpa' | 'borsa' | 'gioiello' | 'occhiali' | 'forbici' | 'chiaveInglese'
  | 'libro' | 'fiore' | 'carrello' | 'bottiglia' | 'telefono' | 'casa'
  | 'bici' | 'pallone' | 'busta' | 'chiave';

export const REPERTORIO: readonly Pittogramma[] = [
  'tazzina', 'bicchiere', 'forchetta', 'pane', 'torta', 'cono',
  'coltellaccio', 'mela', 'T', 'croce', 'sacchetto', 'maglietta',
  'scarpa', 'borsa', 'gioiello', 'occhiali', 'forbici', 'chiaveInglese',
  'libro', 'fiore', 'carrello', 'bottiglia', 'telefono', 'casa',
  'bici', 'pallone', 'busta', 'chiave',
];

/** Il simbolo di ripiego, quando dei negozio si sa solo la categoria. */
export const PITTOGRAMMA_CATEGORIA: Record<CategoriaAttivita, Pittogramma> = {
  bar: 'tazzina',
  cibo: 'forchetta',
  tabacchi: 'T',
  farmacia: 'croce',
  negozio: 'sacchetto',
  servizi: 'busta',
};

/**
 * La tabella fine sul valore grezzo di `shop=*` / `amenity=*` di
 * OpenStreetMap. Serve perché la pipeline schiaccia due terzi delle
 * botteghe nella categoria generica "negozio": senza questa tabella mezza
 * Lugo porterebbe lo stesso sacchetto.
 */
export const PITTOGRAMMA_OSM: Record<string, Pittogramma> = {
  cafe: 'tazzina', bar: 'bicchiere', pub: 'bicchiere',
  restaurant: 'forchetta', fast_food: 'forchetta', ice_cream: 'cono',
  pharmacy: 'croce', chemist: 'croce', tobacco: 'T',
  post_office: 'busta', bank: 'busta', travel_agency: 'busta', copyshop: 'busta',
  bakery: 'pane', pastry: 'torta', confectionery: 'torta',
  butcher: 'coltellaccio', deli: 'coltellaccio', seafood: 'coltellaccio',
  greengrocer: 'mela', farm: 'mela',
  supermarket: 'carrello', convenience: 'carrello', grocery: 'carrello',
  alcohol: 'bottiglia', wine: 'bottiglia', beverages: 'bottiglia',
  optician: 'occhiali', hairdresser: 'forbici', beauty: 'forbici',
  clothes: 'maglietta', boutique: 'maglietta', fashion: 'maglietta',
  laundry: 'maglietta', dry_cleaning: 'maglietta',
  shoes: 'scarpa', bag: 'borsa', leather: 'borsa',
  jewelry: 'gioiello', watches: 'gioiello',
  books: 'libro', newsagent: 'libro', stationery: 'libro', kiosk: 'libro', music: 'libro',
  florist: 'fiore', garden_centre: 'fiore',
  hardware: 'chiaveInglese', doityourself: 'chiaveInglese', car_repair: 'chiaveInglese',
  car_parts: 'chiaveInglese', paint: 'chiaveInglese',
  locksmith: 'chiave',
  mobile_phone: 'telefono', electronics: 'telefono', computer: 'telefono', photo: 'telefono',
  estate_agent: 'casa', furniture: 'casa',
  bicycle: 'bici', sports: 'pallone', toys: 'pallone',
  gift: 'sacchetto', variety_store: 'sacchetto',
};

/**
 * Le due tessere che NON si tingono col colore della bottega. La T bianca
 * in campo nero e la croce verde in campo bianco non sono decorazioni: sono
 * segnaletica, hanno colori loro, e tingerle del rosa di una merceria
 * sarebbe sbagliato prima ancora che illeggibile.
 */
export const PITTOGRAMMI_NON_TINTI: ReadonlySet<Pittogramma> = new Set(['T', 'croce']);

const CAMPO_T = '#14161C';
const CAMPO_CROCE = '#F4F2ED';
const VERDE_CROCE = '#1E8A46';

/** L'inchiostro di serie dei simboli tinti: quasi nero, mai nero pieno. */
export const INCHIOSTRO = '#171310';

const CATEGORIE = new Set<string>(['bar', 'cibo', 'tabacchi', 'farmacia', 'negozio', 'servizi']);

/** Il simbolo di una bottega: prima il dato fine di OSM, poi la categoria. */
export function pittogrammaDi(categoria: string, osm?: string): Pittogramma {
  const fine = osm ? PITTOGRAMMA_OSM[osm] : undefined;
  if (fine) return fine;
  const cat = (CATEGORIE.has(categoria) ? categoria : 'servizi') as CategoriaAttivita;
  return PITTOGRAMMA_CATEGORIA[cat];
}

// ── il disegno ──────────────────────────────────────────────────────────────

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const raggio = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + raggio, y);
  ctx.arcTo(x + w, y, x + w, y + h, raggio);
  ctx.arcTo(x + w, y + h, x, y + h, raggio);
  ctx.arcTo(x, y + h, x, y, raggio);
  ctx.arcTo(x, y, x + w, y, raggio);
  ctx.closePath();
  ctx.fill();
}

/** Rettangolo ruotato attorno al proprio centro: lame, gambi, telai. */
function barra(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, lung: number, spess: number, ang: number, r = spess / 2,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  rr(ctx, -lung / 2, -spess / 2, lung, spess, r);
  ctx.restore();
}

function poly(ctx: CanvasRenderingContext2D, punti: number[][]) {
  ctx.beginPath();
  ctx.moveTo(punti[0][0], punti[0][1]);
  for (let i = 1; i < punti.length; i++) ctx.lineTo(punti[i][0], punti[i][1]);
  ctx.closePath();
  ctx.fill();
}

function ellisse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fill();
}

function cerchio(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function anello(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, spess: number, da = 0, a = Math.PI * 2) {
  ctx.lineWidth = spess;
  ctx.beginPath();
  ctx.arc(x, y, r, da, a);
  ctx.stroke();
}

function linea(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, spess: number) {
  ctx.lineWidth = spess;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/**
 * Disegna un simbolo dentro il quadrato di lato `lato` centrato in (cx,cy).
 * Non sceglie i colori: chi chiama garantisce che inchiostro e fondo si
 * stacchino abbastanza. Sulla bandiera l'inchiostro è scuro su campo
 * chiaro; sulla fascia frontale è chiaro su fondo scuro. Sono le due
 * letture opposte dello stesso simbolo, ed è voluto.
 */
export function disegnaPittogramma(
  ctx: CanvasRenderingContext2D,
  id: Pittogramma,
  cx: number,
  cy: number,
  lato: number,
  inchiostro: string,
  fondo: string,
): void {
  const L = lato;
  const T = 0.15 * L;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fillStyle = inchiostro;
  ctx.strokeStyle = inchiostro;

  switch (id) {
    case 'tazzina': {
      rr(ctx, cx - 0.26 * L, cy - 0.16 * L, 0.44 * L, 0.34 * L, 0.06 * L);
      anello(ctx, cx + 0.24 * L, cy + 0.01 * L, 0.13 * L, T, -1.1, 1.1);
      rr(ctx, cx - 0.38 * L, cy + 0.20 * L, 0.76 * L, 0.10 * L, 0.05 * L);
      // due volute di vapore: decoro, spariscono col mip ed è giusto così
      ctx.lineWidth = 0.09 * L;
      for (const dx of [-0.12, 0.06]) {
        ctx.beginPath();
        ctx.moveTo(cx + dx * L, cy - 0.24 * L);
        ctx.quadraticCurveTo(cx + (dx + 0.09) * L, cy - 0.32 * L, cx + dx * L, cy - 0.40 * L);
        ctx.stroke();
      }
      break;
    }
    case 'bicchiere': {
      poly(ctx, [
        [cx - 0.22 * L, cy - 0.28 * L], [cx + 0.22 * L, cy - 0.28 * L],
        [cx + 0.09 * L, cy + 0.06 * L], [cx - 0.09 * L, cy + 0.06 * L],
      ]);
      rr(ctx, cx - 0.045 * L, cy + 0.06 * L, 0.09 * L, 0.20 * L, 0.02 * L);
      rr(ctx, cx - 0.22 * L, cy + 0.26 * L, 0.44 * L, 0.08 * L, 0.04 * L);
      break;
    }
    case 'forchetta': {
      for (const d of [-0.10, 0, 0.10]) {
        rr(ctx, cx - 0.28 * L + d * L - 0.045 * L, cy - 0.34 * L, 0.09 * L, 0.20 * L, 0.03 * L);
      }
      rr(ctx, cx - 0.38 * L, cy - 0.16 * L, 0.20 * L, 0.09 * L, 0.04 * L);
      rr(ctx, cx - 0.315 * L, cy - 0.16 * L, 0.07 * L, 0.50 * L, 0.03 * L);
      poly(ctx, [
        [cx + 0.15 * L, cy - 0.36 * L], [cx + 0.31 * L, cy - 0.12 * L],
        [cx + 0.31 * L, cy - 0.02 * L], [cx + 0.15 * L, cy - 0.02 * L],
      ]);
      rr(ctx, cx + 0.19 * L, cy - 0.02 * L, T, 0.36 * L, 0.03 * L);
      break;
    }
    case 'pane': {
      ellisse(ctx, cx, cy + 0.02 * L, 0.38 * L, 0.24 * L);
      ctx.strokeStyle = fondo;
      for (const d of [-0.18, 0, 0.18]) {
        linea(ctx, cx + d * L - 0.08 * L, cy + 0.08 * L, cx + d * L + 0.08 * L, cy - 0.08 * L, 0.07 * L);
      }
      break;
    }
    case 'torta': {
      poly(ctx, [[cx - 0.34 * L, cy + 0.28 * L], [cx + 0.34 * L, cy + 0.28 * L], [cx, cy - 0.30 * L]]);
      ctx.fillStyle = fondo;
      cerchio(ctx, cx, cy - 0.18 * L, 0.13 * L);
      ctx.fillStyle = inchiostro;
      cerchio(ctx, cx, cy - 0.18 * L, 0.09 * L);
      break;
    }
    case 'cono': {
      cerchio(ctx, cx - 0.12 * L, cy - 0.16 * L, 0.15 * L);
      cerchio(ctx, cx + 0.12 * L, cy - 0.18 * L, 0.15 * L);
      poly(ctx, [[cx - 0.20 * L, cy - 0.02 * L], [cx + 0.20 * L, cy - 0.02 * L], [cx, cy + 0.38 * L]]);
      break;
    }
    case 'coltellaccio': {
      rr(ctx, cx - 0.32 * L, cy - 0.26 * L, 0.44 * L, 0.28 * L, 0.05 * L);
      rr(ctx, cx + 0.10 * L, cy - 0.17 * L, 0.26 * L, 0.11 * L, 0.055 * L);
      ctx.fillStyle = fondo;
      cerchio(ctx, cx - 0.22 * L, cy - 0.16 * L, 0.045 * L);
      break;
    }
    case 'mela': {
      cerchio(ctx, cx - 0.11 * L, cy + 0.06 * L, 0.22 * L);
      cerchio(ctx, cx + 0.11 * L, cy + 0.06 * L, 0.22 * L);
      rr(ctx, cx - 0.025 * L, cy - 0.30 * L, 0.05 * L, 0.18 * L, 0.02 * L);
      ellisse(ctx, cx + 0.13 * L, cy - 0.26 * L, 0.12 * L, 0.06 * L, -0.6);
      break;
    }
    case 'T': {
      // la T bianca in campo nero è la segnaletica pubblica dei Monopoli:
      // non è il marchio di nessuno, e riconoscerla al volo è tutto il punto
      ctx.fillStyle = CAMPO_T;
      ctx.fillRect(cx - L / 2, cy - L / 2, L, L);
      ctx.strokeStyle = '#E8E2D2';
      ctx.lineWidth = 0.055 * L;
      ctx.strokeRect(cx - 0.43 * L, cy - 0.43 * L, 0.86 * L, 0.86 * L);
      ctx.fillStyle = '#F0EADA';
      ctx.fillRect(cx - 0.075 * L, cy - 0.30 * L, 0.15 * L, 0.62 * L);
      ctx.fillRect(cx - 0.30 * L, cy - 0.30 * L, 0.60 * L, 0.17 * L);
      break;
    }
    case 'croce': {
      // la croce delle farmacie ha colori fissi: verde su bianco
      ctx.fillStyle = CAMPO_CROCE;
      ctx.fillRect(cx - L / 2, cy - L / 2, L, L);
      ctx.fillStyle = VERDE_CROCE;
      ctx.fillRect(cx - 0.15 * L, cy - 0.46 * L, 0.30 * L, 0.92 * L);
      ctx.fillRect(cx - 0.46 * L, cy - 0.15 * L, 0.92 * L, 0.30 * L);
      break;
    }
    case 'sacchetto': {
      poly(ctx, [
        [cx - 0.30 * L, cy - 0.10 * L], [cx + 0.30 * L, cy - 0.10 * L],
        [cx + 0.26 * L, cy + 0.36 * L], [cx - 0.26 * L, cy + 0.36 * L],
      ]);
      for (const d of [-0.13, 0.13]) anello(ctx, cx + d * L, cy - 0.10 * L, 0.11 * L, 0.12 * L, Math.PI, Math.PI * 2);
      break;
    }
    case 'maglietta': {
      poly(ctx, [
        [cx - 0.34 * L, cy - 0.22 * L], [cx - 0.18 * L, cy - 0.30 * L],
        [cx + 0.18 * L, cy - 0.30 * L], [cx + 0.34 * L, cy - 0.22 * L],
        [cx + 0.22 * L, cy - 0.06 * L], [cx + 0.22 * L, cy + 0.32 * L],
        [cx - 0.22 * L, cy + 0.32 * L], [cx - 0.22 * L, cy - 0.06 * L],
      ]);
      ctx.fillStyle = fondo;
      ctx.beginPath();
      ctx.arc(cx, cy - 0.29 * L, 0.10 * L, 0, Math.PI);
      ctx.fill();
      break;
    }
    case 'scarpa': {
      ctx.fillStyle = inchiostro;
      ctx.beginPath();
      ctx.moveTo(cx - 0.34 * L, cy + 0.22 * L);
      ctx.lineTo(cx - 0.34 * L, cy - 0.04 * L);
      ctx.quadraticCurveTo(cx - 0.10 * L, cy - 0.10 * L, cx + 0.10 * L, cy + 0.04 * L);
      ctx.lineTo(cx + 0.34 * L, cy + 0.11 * L);
      ctx.lineTo(cx + 0.34 * L, cy + 0.22 * L);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'borsa': {
      rr(ctx, cx - 0.30 * L, cy - 0.06 * L, 0.60 * L, 0.38 * L, 0.06 * L);
      anello(ctx, cx, cy - 0.06 * L, 0.19 * L, 0.12 * L, Math.PI, Math.PI * 2);
      break;
    }
    case 'gioiello': {
      poly(ctx, [
        [cx, cy - 0.34 * L], [cx + 0.32 * L, cy - 0.02 * L],
        [cx, cy + 0.34 * L], [cx - 0.32 * L, cy - 0.02 * L],
      ]);
      ctx.strokeStyle = fondo;
      linea(ctx, cx - 0.32 * L, cy - 0.02 * L, cx + 0.32 * L, cy - 0.02 * L, 0.055 * L);
      linea(ctx, cx - 0.16 * L, cy - 0.18 * L, cx, cy + 0.34 * L, 0.055 * L);
      break;
    }
    case 'occhiali': {
      for (const d of [-0.20, 0.20]) anello(ctx, cx + d * L, cy, 0.16 * L, T);
      linea(ctx, cx - 0.045 * L, cy, cx + 0.045 * L, cy, T);
      linea(ctx, cx - 0.36 * L, cy - 0.02 * L, cx - 0.44 * L, cy - 0.08 * L, T);
      linea(ctx, cx + 0.36 * L, cy - 0.02 * L, cx + 0.44 * L, cy - 0.08 * L, T);
      break;
    }
    case 'forbici': {
      barra(ctx, cx, cy - 0.05 * L, 0.62 * L, 0.10 * L, 0.38 - Math.PI / 2);
      barra(ctx, cx, cy - 0.05 * L, 0.62 * L, 0.10 * L, -0.38 + Math.PI / 2);
      for (const d of [-0.16, 0.16]) anello(ctx, cx + d * L, cy + 0.28 * L, 0.10 * L, 0.10 * L);
      cerchio(ctx, cx, cy - 0.05 * L, 0.05 * L);
      break;
    }
    case 'chiaveInglese': {
      const a = 0.7;
      barra(ctx, cx, cy + 0.04 * L, 0.62 * L, 0.16 * L, a);
      const ex = cx + Math.cos(a) * 0.31 * L;
      const ey = cy + 0.04 * L + Math.sin(a) * 0.31 * L;
      ctx.strokeStyle = inchiostro;
      anello(ctx, ex, ey, 0.17 * L, 0.13 * L, a - 0.55 * Math.PI + Math.PI, a + 0.55 * Math.PI + Math.PI);
      break;
    }
    case 'libro': {
      poly(ctx, [
        [cx - 0.36 * L, cy - 0.22 * L], [cx - 0.03 * L, cy - 0.14 * L],
        [cx - 0.03 * L, cy + 0.28 * L], [cx - 0.36 * L, cy + 0.20 * L],
      ]);
      poly(ctx, [
        [cx + 0.36 * L, cy - 0.22 * L], [cx + 0.03 * L, cy - 0.14 * L],
        [cx + 0.03 * L, cy + 0.28 * L], [cx + 0.36 * L, cy + 0.20 * L],
      ]);
      rr(ctx, cx - 0.03 * L, cy - 0.16 * L, 0.06 * L, 0.46 * L, 0.02 * L);
      break;
    }
    case 'fiore': {
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k * Math.PI * 2) / 5;
        ellisse(ctx, cx + Math.cos(a) * 0.20 * L, cy - 0.06 * L + Math.sin(a) * 0.20 * L, 0.13 * L, 0.13 * L);
      }
      ctx.fillStyle = fondo;
      cerchio(ctx, cx, cy - 0.06 * L, 0.10 * L);
      ctx.fillStyle = inchiostro;
      rr(ctx, cx - 0.035 * L, cy + 0.10 * L, 0.07 * L, 0.28 * L, 0.03 * L);
      break;
    }
    case 'carrello': {
      ctx.strokeStyle = inchiostro;
      ctx.lineWidth = T;
      ctx.beginPath();
      ctx.moveTo(cx - 0.28 * L, cy - 0.14 * L);
      ctx.lineTo(cx + 0.32 * L, cy - 0.14 * L);
      ctx.lineTo(cx + 0.22 * L, cy + 0.12 * L);
      ctx.lineTo(cx - 0.18 * L, cy + 0.12 * L);
      ctx.closePath();
      ctx.stroke();
      linea(ctx, cx - 0.28 * L, cy - 0.14 * L, cx - 0.40 * L, cy - 0.30 * L, T);
      cerchio(ctx, cx - 0.12 * L, cy + 0.28 * L, 0.075 * L);
      cerchio(ctx, cx + 0.16 * L, cy + 0.28 * L, 0.075 * L);
      break;
    }
    case 'bottiglia': {
      rr(ctx, cx - 0.07 * L, cy - 0.36 * L, 0.14 * L, 0.20 * L, 0.03 * L);
      rr(ctx, cx - 0.19 * L, cy - 0.18 * L, 0.38 * L, 0.52 * L, 0.07 * L);
      ctx.fillStyle = fondo;
      ctx.fillRect(cx - 0.19 * L, cy + 0.02 * L, 0.38 * L, 0.14 * L);
      break;
    }
    case 'telefono': {
      rr(ctx, cx - 0.20 * L, cy - 0.36 * L, 0.40 * L, 0.72 * L, 0.07 * L);
      ctx.fillStyle = fondo;
      rr(ctx, cx - 0.135 * L, cy - 0.28 * L, 0.27 * L, 0.50 * L, 0.03 * L);
      break;
    }
    case 'casa': {
      poly(ctx, [[cx, cy - 0.34 * L], [cx + 0.36 * L, cy - 0.02 * L], [cx - 0.36 * L, cy - 0.02 * L]]);
      ctx.fillRect(cx - 0.26 * L, cy - 0.02 * L, 0.52 * L, 0.34 * L);
      ctx.fillStyle = fondo;
      ctx.fillRect(cx - 0.075 * L, cy + 0.10 * L, 0.15 * L, 0.22 * L);
      break;
    }
    case 'bici': {
      for (const d of [-0.24, 0.24]) anello(ctx, cx + d * L, cy + 0.10 * L, 0.16 * L, 0.11 * L);
      ctx.strokeStyle = inchiostro;
      ctx.lineWidth = 0.09 * L;
      ctx.beginPath();
      ctx.moveTo(cx - 0.24 * L, cy + 0.10 * L);
      ctx.lineTo(cx - 0.02 * L, cy + 0.10 * L);
      ctx.lineTo(cx - 0.08 * L, cy - 0.14 * L);
      ctx.closePath();
      ctx.stroke();
      linea(ctx, cx - 0.08 * L, cy - 0.14 * L, cx + 0.24 * L, cy + 0.10 * L, 0.09 * L);
      linea(ctx, cx + 0.16 * L, cy - 0.16 * L, cx + 0.28 * L, cy - 0.16 * L, 0.09 * L);
      break;
    }
    case 'pallone': {
      cerchio(ctx, cx, cy, 0.34 * L);
      ctx.fillStyle = fondo;
      const p: number[][] = [];
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k * Math.PI * 2) / 5;
        p.push([cx + Math.cos(a) * 0.14 * L, cy + Math.sin(a) * 0.14 * L]);
      }
      poly(ctx, p);
      ctx.strokeStyle = fondo;
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k * Math.PI * 2) / 5;
        linea(ctx, cx + Math.cos(a) * 0.16 * L, cy + Math.sin(a) * 0.16 * L,
          cx + Math.cos(a) * 0.33 * L, cy + Math.sin(a) * 0.33 * L, 0.05 * L);
      }
      break;
    }
    case 'busta': {
      ctx.fillRect(cx - 0.34 * L, cy - 0.22 * L, 0.68 * L, 0.44 * L);
      ctx.strokeStyle = fondo;
      ctx.lineWidth = 0.075 * L;
      ctx.beginPath();
      ctx.moveTo(cx - 0.34 * L, cy - 0.22 * L);
      ctx.lineTo(cx, cy + 0.04 * L);
      ctx.lineTo(cx + 0.34 * L, cy - 0.22 * L);
      ctx.stroke();
      break;
    }
    case 'chiave': {
      anello(ctx, cx - 0.20 * L, cy - 0.16 * L, 0.14 * L, 0.11 * L);
      barra(ctx, cx + 0.06 * L, cy + 0.06 * L, 0.50 * L, 0.10 * L, 0.7);
      const ex = cx + 0.06 * L + Math.cos(0.7) * 0.25 * L;
      const ey = cy + 0.06 * L + Math.sin(0.7) * 0.25 * L;
      for (const d of [0, 0.10]) {
        barra(ctx, ex - Math.cos(0.7) * d * L + Math.sin(0.7) * 0.07 * L,
          ey - Math.sin(0.7) * d * L - Math.cos(0.7) * 0.07 * L, 0.14 * L, 0.09 * L, 0.7 + Math.PI / 2);
      }
      break;
    }
  }
  ctx.restore();
}

/**
 * Dipinge la tessera di un simbolo dentro l'atlante, gutter compreso. Il
 * gutter riempito col colore di campo è quello che impedisce alle tessere
 * vicine di sbavare l'una nell'altra ai livelli di mipmap bassi: senza, a
 * quaranta metri la tazzina del bar prende dentro un pezzo della croce
 * verde qui accanto.
 *
 * Le tessere si dipingono in BIANCO con l'inchiostro scuro, e sarà il
 * colore del vertice a tingerle del colore della bottega. Le due tessere di
 * segnaletica — la T e la croce — si dipingono invece coi loro colori veri
 * e la geometria le lascia bianche.
 */
export function tesseraPittogramma(
  ctx: CanvasRenderingContext2D,
  id: Pittogramma,
  x: number,
  y: number,
  lato: number,
  gutter: number,
): void {
  ctx.save();
  ctx.fillStyle = id === 'T' ? CAMPO_T : id === 'croce' ? CAMPO_CROCE : '#FFFFFF';
  ctx.fillRect(x, y, lato, lato);
  const interno = lato - gutter * 2;
  disegnaPittogramma(
    ctx,
    id,
    x + lato / 2,
    y + lato / 2,
    interno,
    INCHIOSTRO,
    id === 'T' ? CAMPO_T : id === 'croce' ? CAMPO_CROCE : '#FFFFFF',
  );
  ctx.restore();
}
