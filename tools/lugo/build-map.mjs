// Trasforma i dati grezzi Overpass (tools/lugo/cache/overpass-raw.json) nella
// mappa compatta del gioco: public/lugo/map.json (schema: lib/lugo/types.ts).
//
// Passi: proiezione equirettangolare locale (origine alla Rocca Estense),
// semplificazione Douglas-Peucker, filtro aree minime, altezze con default
// per tipo e jitter deterministico, collider OBB minimo (o segmenti per i
// footprint concavi: i cortili come quello del Pavaglione restano
// percorribili), riconoscimento dei landmark, quantizzazione a decimetri.
//
// Uso: node tools/lugo/build-map.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW = join(HERE, 'cache', 'overpass-raw.json');
const OUT = join(HERE, '..', '..', 'public', 'lugo', 'map.json');
const MAX_BYTES = 4 * 1024 * 1024;

// ── proiezione ──────────────────────────────────────────────────────────────
const LAT0 = 44.4208;
const LON0 = 11.9109;
const M_LON = 111320 * Math.cos((LAT0 * Math.PI) / 180);
const M_LAT = 110574;
/** lat/lon → metri locali: +X est, −Z nord. */
const proj = (lat, lon) => [(lon - LON0) * M_LON, -(lat - LAT0) * M_LAT];
const q = (v) => Math.round(v * 10); // metri → decimetri interi

// ── geometria ───────────────────────────────────────────────────────────────
function simplify(pts, eps) {
  if (pts.length <= 2) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let maxD = -1;
    let idx = -1;
    const [ax, az] = pts[a];
    const [bx, bz] = pts[b];
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz;
    for (let i = a + 1; i < b; i++) {
      const [px, pz] = pts[i];
      let d;
      if (len2 === 0) d = Math.hypot(px - ax, pz - az);
      else {
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2));
        d = Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
      }
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > eps) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

/** Semplifica un anello chiuso (senza punto duplicato in coda). */
function simplifyRing(ring, eps) {
  const closed = simplify([...ring, ring[0]], eps);
  closed.pop();
  return closed;
}

/** Area con segno (shoelace) su (x,z); >0 = antiorario nel piano x-z. */
function signedArea(ring) {
  let s = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, z1] = ring[i];
    const [x2, z2] = ring[(i + 1) % ring.length];
    s += x1 * z2 - x2 * z1;
  }
  return s / 2;
}

function centroid(ring) {
  let cx = 0;
  let cz = 0;
  for (const [x, z] of ring) {
    cx += x;
    cz += z;
  }
  return [cx / ring.length, cz / ring.length];
}

function convexHull(points) {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length <= 2) return pts;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/** Rettangolo orientato di area minima (rotating calipers sul guscio). */
function minAreaRect(ring) {
  const hull = convexHull(ring);
  let best = null;
  for (let i = 0; i < hull.length; i++) {
    const [ax, az] = hull[i];
    const [bx, bz] = hull[(i + 1) % hull.length];
    const angle = Math.atan2(bz - az, bx - ax);
    const c = Math.cos(-angle);
    const s = Math.sin(-angle);
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const [x, z] of hull) {
      const rx = x * c - z * s;
      const rz = x * s + z * c;
      if (rx < minX) minX = rx;
      if (rx > maxX) maxX = rx;
      if (rz < minZ) minZ = rz;
      if (rz > maxZ) maxZ = rz;
    }
    const area = (maxX - minX) * (maxZ - minZ);
    if (!best || area < best.area) {
      const mx = (minX + maxX) / 2;
      const mz = (minZ + maxZ) / 2;
      const cb = Math.cos(angle);
      const sb = Math.sin(angle);
      best = {
        area,
        cx: mx * cb - mz * sb,
        cz: mx * sb + mz * cb,
        hw: (maxX - minX) / 2,
        hd: (maxZ - minZ) / 2,
        angle,
      };
    }
  }
  return best;
}

/** Concatena le way di una relation multipolygon in anelli chiusi di id-nodo. */
function assembleRings(wayNodeLists) {
  const segs = wayNodeLists.map((l) => [...l]).filter((l) => l.length >= 2);
  const rings = [];
  while (segs.length) {
    let ring = segs.pop();
    let guard = 0;
    while (ring[0] !== ring[ring.length - 1] && guard++ < 1000) {
      const end = ring[ring.length - 1];
      let found = -1;
      let rev = false;
      // tra i segmenti che si agganciano, meglio quello che CHIUDE l'anello:
      // due anelli outer che condividono un nodo non vanno fusi in uno
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        const testa = s[0] === end;
        const coda = s[s.length - 1] === end;
        if (!testa && !coda) continue;
        const estremo = testa ? s[s.length - 1] : s[0];
        if (estremo === ring[0]) {
          found = i;
          rev = coda;
          break;
        }
        if (found === -1) {
          found = i;
          rev = coda;
        }
      }
      if (found === -1) break;
      const s = segs.splice(found, 1)[0];
      if (rev) s.reverse();
      ring = ring.concat(s.slice(1));
    }
    if (ring[0] === ring[ring.length - 1] && ring.length >= 4) rings.push(ring.slice(0, -1));
  }
  return rings;
}

/** Nastro poligonale attorno a una polilinea (per i corsi d'acqua). */
function ribbon(pts, width) {
  const hw = width / 2;
  const left = [];
  const right = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0];
    let dz = b[1] - a[1];
    const l = Math.hypot(dx, dz) || 1;
    dx /= l;
    dz /= l;
    left.push([pts[i][0] - dz * hw, pts[i][1] + dx * hw]);
    right.push([pts[i][0] + dz * hw, pts[i][1] - dx * hw]);
  }
  return left.concat(right.reverse());
}

// jitter deterministico dall'id OSM (xorshift)
function rand01(id) {
  let x = (Number(id) ^ 0x9e3779b9) >>> 0;
  x ^= x << 13;
  x >>>= 0;
  x ^= x >> 17;
  x ^= x << 5;
  x >>>= 0;
  return x / 4294967296;
}

// ── classificazioni ─────────────────────────────────────────────────────────
const CLASSE_STRADA = {
  motorway: 'primaria', trunk: 'primaria', primary: 'primaria',
  motorway_link: 'primaria', trunk_link: 'primaria', primary_link: 'primaria',
  secondary: 'secondaria', secondary_link: 'secondaria',
  tertiary: 'secondaria', tertiary_link: 'secondaria',
  residential: 'residenziale', unclassified: 'residenziale', living_street: 'residenziale',
  service: 'servizio',
  footway: 'pedonale', path: 'pedonale', pedestrian: 'pedonale',
  cycleway: 'pedonale', track: 'pedonale', steps: 'pedonale',
};
const LARGHEZZA = { primaria: 9, secondaria: 7, residenziale: 5.5, servizio: 4, pedonale: 3 };

function altezza(tags, id) {
  if (tags.height) {
    const v = parseFloat(String(tags.height).replace(',', '.'));
    if (v > 0) return Math.min(v, 40);
  }
  if (tags['building:levels']) {
    const l = parseFloat(tags['building:levels']);
    if (l > 0) return Math.min(l * 3.2, 40);
  }
  const t = tags.building;
  const j = rand01(id);
  if (t === 'church' || t === 'cathedral' || t === 'chapel') return 14;
  if (t === 'castle') return 12;
  if (t === 'garage' || t === 'garages' || t === 'shed' || t === 'hut' || t === 'roof' || t === 'carport') return 2.8;
  if (t === 'industrial' || t === 'warehouse' || t === 'retail' || t === 'commercial') return 5.5 + j * 2;
  if (t === 'apartments') return 9 + j * 6;
  return 6 + j * 3.5; // case romagnole: 2-3 piani
}

function landmarkOf(tags) {
  const name = (tags.name || '').toLowerCase();
  if (name.includes('pavaglione')) return 'pavaglione';
  if (tags.historic === 'castle' || name.includes('rocca estense')) return 'rocca';
  if (tags.building === 'train_station' || tags.railway === 'station') return 'stazione';
  if (tags.amenity === 'police') return 'caserma';
  if (tags.amenity === 'theatre' || (name.includes('rossini') && tags.building)) return 'teatro';
  if (name.includes('baracca') && (tags.historic === 'monument' || tags.historic === 'memorial')) return 'baracca';
  return null;
}

// colore dichiarato in OSM (building:colour): hex o nomi comuni
const COLORI_NOMI = {
  white: '#EFEAE0', yellow: '#E3C25F', cream: '#EDE0BC', beige: '#DCC9A2',
  red: '#B0492F', orange: '#D98A4A', pink: '#DBA79A', brown: '#8A5A3C',
  grey: '#B5AFA6', gray: '#B5AFA6', tan: '#D2B48C', ochre: '#D9A662',
};
function coloreEdificio(tags) {
  const v = String(tags['building:colour'] || '').toLowerCase().trim();
  if (!v) return null;
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  if (/^#[0-9a-f]{3}$/.test(v)) return '#' + [...v.slice(1)].map((c) => c + c).join('');
  return COLORI_NOMI[v] || null;
}

// ── lettura e indici ────────────────────────────────────────────────────────
const raw = JSON.parse(readFileSync(RAW, 'utf8'));
const nodes = new Map();
const ways = new Map();
const relations = [];
for (const el of raw.elements) {
  if (el.type === 'relation') {
    relations.push(el);
    continue;
  }
  // `out body; >; out skel qt;` ristampa gli elementi ricorsi SENZA tag:
  // una copia "skeleton" non deve mai sovrascrivere quella taggata
  const indice = el.type === 'node' ? nodes : ways;
  const prev = indice.get(el.id);
  if (!prev || (el.tags && !prev.tags)) indice.set(el.id, el);
}

// nodi referenziati ma assenti dalla risposta: se sono troppi la risposta
// era monca e la mappa uscirebbe distorta in silenzio
let refTotali = 0;
let refMancanti = 0;

const wayRing = (w) => {
  const ids = w.nodes[0] === w.nodes[w.nodes.length - 1] ? w.nodes.slice(0, -1) : w.nodes;
  const pts = [];
  for (const id of ids) {
    const n = nodes.get(id);
    refTotali++;
    if (n) pts.push(proj(n.lat, n.lon));
    else refMancanti++;
  }
  return pts;
};
const wayLine = (w) => {
  const pts = [];
  for (const id of w.nodes) {
    const n = nodes.get(id);
    refTotali++;
    if (n) pts.push(proj(n.lat, n.lon));
    else refMancanti++;
  }
  return pts;
};

/** Ray casting: il punto (x,z) è dentro l'anello? */
function puntoInPoligono(x, z, ring) {
  let dentro = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i];
    const [xj, zj] = ring[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) dentro = !dentro;
  }
  return dentro;
}

// ── costruzione ─────────────────────────────────────────────────────────────
const roads = [];
const buildings = [];
const aree = [];
const rail = [];
const poi = [];
const warn = [];

let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
const stretch = (pts) => {
  for (const [x, z] of pts) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
};
const flatQ = (pts) => {
  const out = [];
  let px = null, pz = null;
  for (const [x, z] of pts) {
    const qx = q(x), qz = q(z);
    if (qx === px && qz === pz) continue;
    out.push(qx, qz);
    px = qx;
    pz = qz;
  }
  return out;
};

// edifici che arrivano da relation: le way membre non vanno ricontate.
// Gli anelli "inner" sono i CORTILI: vanno tenuti come fori, altrimenti il
// quadriportico diventa un blocco pieno col collider che sbarra la corte.
const memberWays = new Set();
const relBuildings = [];
const relPoi = [];
for (const rel of relations) {
  const tags = rel.tags || {};
  if (tags.building) {
    const outerLists = [];
    const innerLists = [];
    for (const m of rel.members || []) {
      if (m.type !== 'way') continue;
      const w = ways.get(m.ref);
      if (!w) continue;
      memberWays.add(m.ref);
      (m.role === 'inner' ? innerLists : outerLists).push(w.nodes);
    }
    const idsToPts = (ringIds) =>
      ringIds.map((nid) => nodes.get(nid)).filter(Boolean).map((n) => proj(n.lat, n.lon));
    const outers = assembleRings(outerLists).map(idsToPts).filter((r) => r.length >= 3);
    const inners = assembleRings(innerLists).map(idsToPts).filter((r) => r.length >= 3);
    for (const outer of outers) {
      const fori = inners.filter((inner) => {
        const [cx, cz] = centroid(inner);
        return puntoInPoligono(cx, cz, outer);
      });
      relBuildings.push({ ring: outer, fori, tags, id: rel.id });
    }
    continue;
  }
  // caserma (o altro POI) mappato come relation senza tag building
  if (tags.amenity === 'police') {
    const pts = [];
    for (const m of rel.members || []) {
      if (m.type === 'way') {
        const w = ways.get(m.ref);
        if (w) pts.push(...wayRing(w));
      } else if (m.type === 'node') {
        const n = nodes.get(m.ref);
        if (n) pts.push(proj(n.lat, n.lon));
      }
    }
    if (pts.length >= 3) relPoi.push({ nome: tags.name || 'Caserma dei Carabinieri', ring: pts, tags });
  }
}

function addBuilding(ring, tags, id, fori = []) {
  let r = simplifyRing(ring, 0.3);
  if (r.length < 3) return;
  const foriSempl = fori
    .map((f) => simplifyRing(f, 0.3))
    .filter((f) => f.length >= 3);
  const areaOuter = Math.abs(signedArea(r));
  const areaFori = foriSempl.reduce((s, f) => s + Math.abs(signedArea(f)), 0);
  const areaNetta = areaOuter - areaFori;
  const lm = landmarkOf(tags);
  if (areaNetta < 20 && !lm) return;
  if (signedArea(r) < 0) r = [...r].reverse(); // antiorario, sempre
  const rect = minAreaRect(r);
  if (!rect) return;
  const hullArea = Math.abs(signedArea(convexHull(r)));
  // coi fori il collider è SEMPRE a segmenti: il cortile resta percorribile
  const concavo = foriSempl.length > 0 || (hullArea > 0 && areaNetta / hullArea < 0.75);
  stretch(r);
  const hVal = Math.round(altezza(tags, id) * 10) / 10;
  const b = {
    fp: flatQ(r),
    h: hVal,
    tinta: Math.floor(rand01(id * 7 + 1) * 8),
    collider: concavo
      ? { edges: true }
      : { obb: [q(rect.cx), q(rect.cz), q(rect.hw), q(rect.hd), Math.round(rect.angle * 1000) / 1000] },
  };
  const foriQ = foriSempl.map((f) => flatQ(f)).filter((f) => f.length >= 6);
  if (foriQ.length) b.fori = foriQ;
  if (lm) b.landmark = lm;

  // tetto a falde: dai tag quando ci sono, altrimenti euristica romagnola
  const forma = String(tags['roof:shape'] || '').toLowerCase();
  const tipo = String(tags.building || '');
  let falde = false;
  if (!foriQ.length) {
    if (/gabled|hipped/.test(forma)) falde = true;
    else if (forma === 'flat') falde = false;
    else {
      falde =
        hVal < 12 &&
        areaNetta < 650 &&
        !/industrial|warehouse|retail|commercial|garage|garages|roof|shed|carport|apartments/.test(tipo);
    }
  }
  b.falde = falde ? 1 : 0;
  if (/^(church|cathedral|chapel)$/.test(tipo)) b.chiesa = 1;
  const col = coloreEdificio(tags);
  if (col) b.col = col;

  if (b.fp.length >= 6) buildings.push(b);
}

// candidati POI raccolti in corsa: per ogni id tengo il footprint più grande
const poiCand = new Map();
function candidatePoi(id, nome, ring, tags) {
  const area = Math.abs(signedArea(ring));
  const prev = poiCand.get(id);
  if (prev && prev.area >= area) return;
  const [cx, cz] = centroid(ring);
  const rect = minAreaRect(ring);
  poiCand.set(id, { id, nome, x: cx, z: cz, rot: rect ? rect.angle : 0, area });
}

// L'elenco delle attività si riempie da due parti: dalle AREE qui sotto e
// dai NODI più in giù. Va dichiarato prima di tutte e due.
const negozi = [];

for (const w of ways.values()) {
  const tags = w.tags || {};

  // Un'attività mappata come area: il supermercato, la banca, l'officina,
  // l'albergo. Sono quasi tutte quelle grandi, ed erano l'unica categoria
  // di botteghe che il gioco non vedeva proprio.
  {
    const att = attivitaDaTag(tags);
    if (att) {
      const anello = wayRing(w);
      if (anello.length >= 3) {
        let cx = 0;
        let cz = 0;
        for (const [px, pz] of anello) {
          cx += px;
          cz += pz;
        }
        cx /= anello.length;
        cz /= anello.length;
        negozi.push({ ...att, x: q(cx), z: q(cz) });
      }
    }
  }

  // strade (le piazze pedonali ad area diventano aree "piazza")
  if (tags.highway) {
    if (tags.highway === 'pedestrian' && (tags.area === 'yes' || w.nodes[0] === w.nodes[w.nodes.length - 1])) {
      const r = simplifyRing(wayRing(w), 0.5);
      if (r.length >= 3) {
        stretch(r);
        aree.push({ kind: 'piazza', poly: flatQ(r) });
      }
      continue;
    }
    const classe = CLASSE_STRADA[tags.highway];
    if (!classe) continue;
    const line = simplify(wayLine(w), 0.5);
    if (line.length < 2) continue;
    stretch(line);
    const road = { classe, larghezza: LARGHEZZA[classe], pts: flatQ(line) };
    if (tags.name) road.nome = tags.name;
    if (tags.junction === 'roundabout') road.rotonda = 1;
    if (road.pts.length >= 4) roads.push(road);
    continue;
  }

  if (tags.building && !memberWays.has(w.id)) {
    const ring = wayRing(w);
    if (ring.length >= 3) {
      addBuilding(ring, tags, w.id);
      const lm = landmarkOf(tags);
      if (lm) candidatePoi(lm, tags.name || lm, ring, tags);
    }
    continue;
  }

  // verde
  if (
    /^(grass|meadow|village_green|cemetery)$/.test(tags.landuse || '') ||
    /^(park|garden|pitch|playground)$/.test(tags.leisure || '')
  ) {
    const r = simplifyRing(wayRing(w), 0.5);
    if (r.length >= 3) {
      stretch(r);
      aree.push({ kind: 'verde', poly: flatQ(r) });
      if (tags.leisure === 'park') candidatePoi('parco', tags.name || 'Parco', r, tags);
    }
    continue;
  }

  // acqua: specchi (poligoni) e corsi (nastri)
  if (tags.natural === 'water') {
    const r = simplifyRing(wayRing(w), 0.5);
    if (r.length >= 3) {
      stretch(r);
      aree.push({ kind: 'acqua', poly: flatQ(r) });
    }
    continue;
  }
  if (/^(river|canal|stream)$/.test(tags.waterway || '')) {
    const width = tags.waterway === 'river' ? 8 : tags.waterway === 'canal' ? 5 : 3;
    const line = simplify(wayLine(w), 1.0);
    if (line.length >= 2) {
      const r = ribbon(line, width);
      stretch(r);
      aree.push({ kind: 'acqua', poly: flatQ(r) });
    }
    continue;
  }

  if (tags.railway === 'rail') {
    const line = simplify(wayLine(w), 0.5);
    if (line.length >= 2) {
      stretch(line);
      const flat = flatQ(line);
      if (flat.length >= 4) rail.push(flat);
    }
    continue;
  }

  if (tags.place === 'square') {
    const r = wayRing(w);
    if (r.length >= 3) {
      const nome = (tags.name || '').toLowerCase();
      if (nome.includes('baracca')) candidatePoi('piazza-baracca', tags.name, r, tags);
    }
    continue;
  }

  // caserma mappata come recinto (way con amenity=police, senza building)
  if (tags.amenity === 'police') {
    const r = wayRing(w);
    if (r.length >= 3) candidatePoi('caserma', tags.name || 'Caserma dei Carabinieri', r, tags);
    continue;
  }

  // i piazzali di sosta chiari che si vedono dall'alto
  if (tags.amenity === 'parking' && !tags.building) {
    const r = simplifyRing(wayRing(w), 0.5);
    if (r.length >= 3 && Math.abs(signedArea(r)) > 120) {
      stretch(r);
      aree.push({ kind: 'parcheggio', poly: flatQ(r) });
    }
    continue;
  }

  // monumenti/memoriali mappati come way
  if (tags.historic) {
    const lm = landmarkOf(tags);
    const r = wayRing(w);
    if (lm && r.length >= 3) candidatePoi(lm, tags.name || lm, r, tags);
  }
}

for (const b of relBuildings) {
  addBuilding(b.ring, b.tags, b.id, b.fori);
  const lm = landmarkOf(b.tags);
  if (lm) candidatePoi(lm, b.tags.name || lm, b.ring, b.tags);
}
for (const p of relPoi) candidatePoi('caserma', p.nome, p.ring, p.tags);

/**
 * Un'attività aperta al pubblico, riconosciuta dai suoi tag. Restituisce
 * il tipo GREZZO di OpenStreetMap (che nel gioco sceglie il simbolo di
 * mestiere: la tazzina, le forbici, la chiave inglese) e la categoria
 * larga, che serve al listino e al colore.
 *
 * Prima questa logica viveva dentro il ciclo dei nodi e conosceva cinque
 * categorie: quaranta botteghe su sessantacinque finivano in "negozio" e
 * portavano tutte lo stesso sacchetto sull'insegna. E le attività mappate
 * come AREA — il supermercato, la banca, l'officina, cioè quasi tutte
 * quelle grandi — non venivano proprio viste.
 */
function attivitaDaTag(tags) {
  const nome = tags.name;
  if (!nome || nome.length > 34) return null;
  const shop = tags.shop || '';
  const amenity = tags.amenity || '';
  const craft = tags.craft || '';
  const office = tags.office || '';
  const tourism = tags.tourism || '';
  const leisure = tags.leisure || '';
  const healthcare = tags.healthcare || '';
  // il tipo grezzo: il primo che c'è, in ordine di specificità
  const grezzo =
    shop ||
    (amenity && /^(cafe|bar|pub|restaurant|fast_food|ice_cream|pharmacy|bank|post_office|bureau_de_change|fuel|dentist|doctors|veterinary|driving_school|library|cinema|nightclub|internet_cafe)$/.test(amenity)
      ? amenity
      : '') ||
    craft ||
    (office ? 'office_' + office : '') ||
    (tourism && /^(hotel|guest_house|museum|information)$/.test(tourism) ? tourism : '') ||
    (leisure && /^(fitness_centre|sports_centre)$/.test(leisure) ? leisure : '') ||
    (healthcare ? 'healthcare' : '');
  if (!grezzo) return null;

  // la categoria larga. Nove secchi invece di cinque: sotto ognuno il
  // gioco sa che listino mettere in vetrina e di che colore fare l'insegna
  let cat = 'negozio';
  if (shop === 'tobacco' || /tabacch/i.test(nome)) cat = 'tabacchi';
  else if (amenity === 'pharmacy' || shop === 'chemist' || healthcare || /^(dentist|doctors|veterinary)$/.test(amenity)) cat = 'farmacia';
  else if (/^(cafe|bar|pub|ice_cream|nightclub)$/.test(amenity)) cat = 'bar';
  else if (/^(restaurant|fast_food)$/.test(amenity) || /^(bakery|pastry|confectionery|butcher|greengrocer|deli|seafood|cheese|alcohol|wine|beverages|supermarket|convenience|grocery)$/.test(shop)) cat = 'cibo';
  else if (office || craft || /^(bank|post_office|bureau_de_change|fuel|driving_school|library|cinema|internet_cafe)$/.test(amenity) || tourism || leisure) cat = 'servizi';
  return { n: nome, c: cat, s: grezzo };
}

// POI da nodi: stazione, monumenti, bar/caffè, le botteghe vere e gli
// arredi urbani mappati uno per uno (alberi, strisce, semafori, fermate)
const barNodes = [];
const arredi = [];
for (const n of nodes.values()) {
  const tags = n.tags || {};
  if (!Object.keys(tags).length) continue;
  const [x, z] = proj(n.lat, n.lon);
  // insegne: TUTTE le attività con un nome, con la loro categoria e il loro
  // tipo vero
  const att = attivitaDaTag(tags);
  if (att) negozi.push({ ...att, x: q(x), z: q(z) });
  if (tags.natural === 'tree') arredi.push({ t: 'albero', x: q(x), z: q(z) });
  else if (tags.highway === 'crossing') arredi.push({ t: 'zebre', x: q(x), z: q(z) });
  else if (tags.highway === 'traffic_signals') arredi.push({ t: 'semaforo', x: q(x), z: q(z) });
  else if (tags.highway === 'bus_stop') arredi.push({ t: 'bus', x: q(x), z: q(z) });
  else if (tags.amenity === 'fountain') arredi.push({ t: 'fontana', x: q(x), z: q(z) });
  else if (
    (tags.historic === 'memorial' || tags.historic === 'monument') &&
    !/baracca/i.test(tags.name || '')
  ) {
    arredi.push({ t: 'obelisco', x: q(x), z: q(z) });
  }
  if (tags.railway === 'station') {
    const prev = poiCand.get('stazione');
    poiCand.set('stazione', { id: 'stazione', nome: tags.name || 'Stazione', x, z, rot: prev ? prev.rot : 0, area: Infinity });
  }
  if (tags.amenity === 'police' && !poiCand.has('caserma')) {
    poiCand.set('caserma', { id: 'caserma', nome: tags.name || 'Caserma dei Carabinieri', x, z, rot: 0, area: 0 });
  }
  // qualunque landmark mappato come nodo (monumenti, teatro…) diventa POI
  const lmNode = landmarkOf(tags);
  if (lmNode && !poiCand.has(lmNode)) {
    poiCand.set(lmNode, { id: lmNode, nome: tags.name || lmNode, x, z, rot: 0, area: 0 });
  }
  if (tags.amenity === 'cafe' || tags.amenity === 'bar') barNodes.push({ x, z, nome: tags.name || 'Bar' });
}

// il bar delle missioni: il più vicino al Pavaglione (o all'origine)
const pav = poiCand.get('pavaglione');
if (barNodes.length) {
  const rx = pav ? pav.x : 0;
  const rz = pav ? pav.z : 0;
  barNodes.sort((a, b) => Math.hypot(a.x - rx, a.z - rz) - Math.hypot(b.x - rx, b.z - rz));
  const bar = barNodes[0];
  poiCand.set('bar', { id: 'bar', nome: bar.nome, x: bar.x, z: bar.z, rot: 0, area: 0 });
}

for (const c of poiCand.values()) {
  poi.push({ id: c.id, nome: c.nome, x: q(c.x), z: q(c.z), rot: Math.round((c.rot || 0) * 1000) / 1000 });
}

// ── output ──────────────────────────────────────────────────────────────────
// le insegne più vicine al Pavaglione hanno la precedenza; ogni tipo di
// arredo ha il suo tetto per non gonfiare il file
// Le stesse insegne possono arrivare due volte: una dal nodo dentro il
// locale e una dall'area del locale stesso, che su OpenStreetMap capita
// spesso. Vince il nodo, che sta dove sta davvero la porta.
{
  const visti = new Map();
  for (const a of negozi) {
    const chiave = a.n.toLowerCase().trim();
    const gia = visti.get(chiave);
    if (!gia) {
      visti.set(chiave, a);
      continue;
    }
    // due attività con lo stesso nome a più di ottanta metri sono due
    // filiali diverse, e restano tutte e due
    if (Math.hypot(gia.x - a.x, gia.z - a.z) > 800) visti.set(chiave + '#' + a.x, a);
  }
  negozi.length = 0;
  negozi.push(...visti.values());
}

// le più vicine al Pavaglione per prime: se il tetto taglia, taglia la
// periferia e non il centro
negozi.sort((a, b) => Math.hypot(a.x, a.z - 810) - Math.hypot(b.x, b.z - 810));
const tettiArredi = { albero: 900, zebre: 240, semaforo: 80, bus: 90, fontana: 24, obelisco: 12 };
const contatori = {};
const arrediFiltrati = arredi.filter((a) => {
  contatori[a.t] = (contatori[a.t] || 0) + 1;
  return contatori[a.t] <= (tettiArredi[a.t] ?? 50);
});

const map = {
  version: 1,
  origin: { lat: LAT0, lon: LON0 },
  bounds: [q(minX), q(minZ), q(maxX), q(maxZ)],
  roads,
  buildings,
  aree,
  rail,
  poi,
  negozi: negozi.slice(0, 350),
  arredi: arrediFiltrati,
};

const json = JSON.stringify(map);
const bytes = Buffer.byteLength(json);

// guardie PRIMA di scrivere: mai lasciare su disco una mappa monca o obesa
if (refMancanti > 0) {
  const frazione = refMancanti / Math.max(1, refTotali);
  console.warn(`⚠ nodi mancanti nella risposta: ${refMancanti}/${refTotali} riferimenti`);
  if (frazione > 0.005) {
    console.error('risposta Overpass incompleta: rifare il fetch (--force)');
    process.exit(1);
  }
}
if (bytes > MAX_BYTES) {
  console.error(`mappa troppo pesante: ${(bytes / 1024).toFixed(0)} KB > ${(MAX_BYTES / 1024).toFixed(0)} KB`);
  process.exit(1);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, json);

// ── report ──────────────────────────────────────────────────────────────────
const kb = (n) => (n / 1024).toFixed(0) + ' KB';
console.log('── mappa di Lugo ──────────────────────────────');
console.log(`strade:  ${roads.length}  (${roads.reduce((s, r) => s + r.pts.length / 2, 0)} punti)`);
console.log(`edifici: ${buildings.length}  (di cui landmark: ${buildings.filter((b) => b.landmark).length})`);
console.log(`aree:    ${aree.length}  ·  ferrovia: ${rail.length} tratte`);
console.log(`negozi:  ${Math.min(350, negozi.length)}  ·  arredi: ${arrediFiltrati.length} (${Object.entries(contatori).map(([k, v]) => k + ' ' + Math.min(v, tettiArredi[k] ?? 50)).join(', ')})`);
console.log(`mondo:   ${((maxX - minX) / 1000).toFixed(2)} × ${((maxZ - minZ) / 1000).toFixed(2)} km`);
console.log(`file:    ${kb(bytes)} → ${OUT}`);
console.log('── POI ────────────────────────────────────────');
for (const p of poi) {
  console.log(`  ${p.id.padEnd(16)} "${p.nome}"  (${(p.x / 10).toFixed(0)} m, ${(p.z / 10).toFixed(0)} m)`);
}
const attesi = ['pavaglione', 'rocca', 'stazione', 'baracca', 'caserma'];
for (const id of attesi) {
  if (!poi.find((p) => p.id === id)) warn.push(`POI atteso mancante: ${id}`);
}
for (const w of warn) console.warn('⚠ ' + w);
console.log(warn.length ? `completato con ${warn.length} avvisi` : 'completato senza avvisi');
