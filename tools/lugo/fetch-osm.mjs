// Scarica da Overpass i dati grezzi di Lugo di Ravenna (strade, edifici,
// verde, acqua, ferrovia, landmark) e li salva in cache locale gitignorata.
// La cache rende idempotente la pipeline: se il file esiste già non si
// riscarica nulla (usa --force per rifare la query).
//
// Uso: node tools/lugo/fetch-osm.mjs [--bbox S,W,N,E] [--force]

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'cache', 'overpass-raw.json');

// Bbox ~1.8×1.8 km sul centro di Lugo: Rocca, Pavaglione, Piazza Baracca,
// stazione, anello dei viali, Parco del Tondo.
const DEFAULT_BBOX = '44.4125,11.9010,44.4290,11.9235';

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const args = process.argv.slice(2);
const force = args.includes('--force');
const bboxArg = args.includes('--bbox') ? args[args.indexOf('--bbox') + 1] : DEFAULT_BBOX;
const bbox = bboxArg.split(',').map(Number);
if (bbox.length !== 4 || bbox.some(Number.isNaN)) {
  console.error('bbox non valida: attesa S,W,N,E — ricevuta: ' + bboxArg);
  process.exit(1);
}
const B = bbox.join(',');

const QUERY = `[out:json][timeout:90];
(
  way["highway"](${B});
  way["building"](${B});
  relation["building"]["type"="multipolygon"](${B});
  way["landuse"~"^(grass|meadow|village_green|cemetery)$"](${B});
  way["leisure"~"^(park|garden|pitch|playground)$"](${B});
  way["natural"="water"](${B});
  way["waterway"~"^(river|canal|stream)$"](${B});
  way["railway"="rail"](${B});
  way["place"="square"](${B});
  nwr["historic"~"^(castle|memorial|monument)$"](${B});
  node["railway"="station"](${B});
  node["amenity"~"^(cafe|bar)$"](${B});
  nwr["amenity"="police"](${B});
);
out body;
>;
out skel qt;`;

if (existsSync(OUT) && !force) {
  console.log('cache già presente: ' + OUT + ' (usa --force per riscaricare)');
  process.exit(0);
}

async function tryMirror(url, attempt) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 120_000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(QUERY),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (!Array.isArray(json.elements) || json.elements.length === 0) {
      throw new Error('risposta senza elementi');
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

let data = null;
outer: for (const url of MIRRORS) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`overpass: ${url} (tentativo ${attempt})…`);
      data = await tryMirror(url, attempt);
      break outer;
    } catch (e) {
      console.warn('  fallito: ' + (e && e.message ? e.message : e));
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
}

if (!data) {
  console.error('Tutti i mirror Overpass hanno fallito.');
  process.exit(1);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(data));
const nodes = data.elements.filter((e) => e.type === 'node').length;
const ways = data.elements.filter((e) => e.type === 'way').length;
const rels = data.elements.filter((e) => e.type === 'relation').length;
console.log(`scaricato: ${nodes} nodi, ${ways} way, ${rels} relation → ${OUT}`);
