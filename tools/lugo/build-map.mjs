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
      for (let i = 0; i < segs.length; i++) {
        if (segs[i][0] === end) {
          found = i;
          break;
        }
        if (segs[i][segs[i].length - 1] === end) {
          found = i;
          rev = true;
          break;
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
  if (name.includes('rossini') && (tags.amenity === 'theatre' || tags.building)) return 'teatro';
  if (name.includes('baracca') && (tags.historic === 'monument' || tags.historic === 'memorial')) return 'baracca';
  return null;
}

// ── lettura e indici ────────────────────────────────────────────────────────
const raw = JSON.parse(readFileSync(RAW, 'utf8'));
const nodes = new Map();
const ways = new Map();
const relations = [];
for (const el of raw.elements) {
  if (el.type === 'node') nodes.set(el.id, el);
  else if (el.type === 'way') ways.set(el.id, el);
  else if (el.type === 'relation') relations.push(el);
}

const wayRing = (w) => {
  const ids = w.nodes[0] === w.nodes[w.nodes.length - 1] ? w.nodes.slice(0, -1) : w.nodes;
  const pts = [];
  for (const id of ids) {
    const n = nodes.get(id);
    if (n) pts.push(proj(n.lat, n.lon));
  }
  return pts;
};
const wayLine = (w) => {
  const pts = [];
  for (const id of w.nodes) {
    const n = nodes.get(id);
    if (n) pts.push(proj(n.lat, n.lon));
  }
  return pts;
};

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

// edifici che arrivano da relation: le way membre non vanno ricontate
const memberWays = new Set();
const relBuildings = [];
for (const rel of relations) {
  const tags = rel.tags || {};
  if (!tags.building) continue;
  const outers = (rel.members || []).filter((m) => m.type === 'way' && m.role !== 'inner');
  for (const m of outers) memberWays.add(m.ref);
  const lists = outers.map((m) => ways.get(m.ref)).filter(Boolean).map((w) => w.nodes);
  for (const ringIds of assembleRings(lists)) {
    const pts = ringIds.map((id) => nodes.get(id)).filter(Boolean).map((n) => proj(n.lat, n.lon));
    if (pts.length >= 3) relBuildings.push({ ring: pts, tags, id: rel.id });
  }
}

function addBuilding(ring, tags, id) {
  let r = simplifyRing(ring, 0.3);
  if (r.length < 3) return;
  const areaAbs = Math.abs(signedArea(r));
  const lm = landmarkOf(tags);
  if (areaAbs < 20 && !lm) return;
  if (signedArea(r) < 0) r = [...r].reverse(); // antiorario, sempre
  const rect = minAreaRect(r);
  if (!rect) return;
  const hullArea = Math.abs(signedArea(convexHull(r)));
  const concavo = hullArea > 0 && areaAbs / hullArea < 0.75;
  stretch(r);
  const b = {
    fp: flatQ(r),
    h: Math.round(altezza(tags, id) * 10) / 10,
    tinta: Math.floor(rand01(id * 7 + 1) * 8),
    collider: concavo
      ? { edges: true }
      : { obb: [q(rect.cx), q(rect.cz), q(rect.hw), q(rect.hd), Math.round(rect.angle * 1000) / 1000] },
  };
  if (lm) b.landmark = lm;
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

for (const w of ways.values()) {
  const tags = w.tags || {};

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

  // monumenti/memoriali mappati come way
  if (tags.historic) {
    const lm = landmarkOf(tags);
    const r = wayRing(w);
    if (lm && r.length >= 3) candidatePoi(lm, tags.name || lm, r, tags);
  }
}

for (const b of relBuildings) {
  addBuilding(b.ring, b.tags, b.id);
  const lm = landmarkOf(b.tags);
  if (lm) candidatePoi(lm, b.tags.name || lm, b.ring, b.tags);
}

// POI da nodi: stazione, monumenti, bar/caffè
const barNodes = [];
for (const n of nodes.values()) {
  const tags = n.tags || {};
  if (!Object.keys(tags).length) continue;
  const [x, z] = proj(n.lat, n.lon);
  if (tags.railway === 'station') {
    const prev = poiCand.get('stazione');
    poiCand.set('stazione', { id: 'stazione', nome: tags.name || 'Stazione', x, z, rot: prev ? prev.rot : 0, area: Infinity });
  }
  if (tags.amenity === 'police' && !poiCand.has('caserma')) {
    poiCand.set('caserma', { id: 'caserma', nome: tags.name || 'Caserma dei Carabinieri', x, z, rot: 0, area: 0 });
  }
  const lmNode = landmarkOf(tags);
  if (lmNode === 'baracca' && !poiCand.has('baracca')) {
    poiCand.set('baracca', { id: 'baracca', nome: tags.name || 'Monumento a Francesco Baracca', x, z, rot: 0, area: 0 });
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
const map = {
  version: 1,
  origin: { lat: LAT0, lon: LON0 },
  bounds: [q(minX), q(minZ), q(maxX), q(maxZ)],
  roads,
  buildings,
  aree,
  rail,
  poi,
};

mkdirSync(dirname(OUT), { recursive: true });
const json = JSON.stringify(map);
writeFileSync(OUT, json);

// ── report ──────────────────────────────────────────────────────────────────
const kb = (n) => (n / 1024).toFixed(0) + ' KB';
console.log('── mappa di Lugo ──────────────────────────────');
console.log(`strade:  ${roads.length}  (${roads.reduce((s, r) => s + r.pts.length / 2, 0)} punti)`);
console.log(`edifici: ${buildings.length}  (di cui landmark: ${buildings.filter((b) => b.landmark).length})`);
console.log(`aree:    ${aree.length}  ·  ferrovia: ${rail.length} tratte`);
console.log(`mondo:   ${((maxX - minX) / 1000).toFixed(2)} × ${((maxZ - minZ) / 1000).toFixed(2)} km`);
console.log(`file:    ${kb(json.length)} → ${OUT}`);
console.log('── POI ────────────────────────────────────────');
for (const p of poi) {
  console.log(`  ${p.id.padEnd(16)} "${p.nome}"  (${(p.x / 10).toFixed(0)} m, ${(p.z / 10).toFixed(0)} m)`);
}
const attesi = ['pavaglione', 'rocca', 'stazione', 'baracca', 'caserma'];
for (const id of attesi) {
  if (!poi.find((p) => p.id === id)) warn.push(`POI atteso mancante: ${id}`);
}
for (const w of warn) console.warn('⚠ ' + w);

if (json.length > MAX_BYTES) {
  console.error(`mappa troppo pesante: ${kb(json.length)} > ${kb(MAX_BYTES)}`);
  process.exit(1);
}
console.log(warn.length ? `completato con ${warn.length} avvisi` : 'completato senza avvisi');
