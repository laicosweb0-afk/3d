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
// La PREMIUM CORE ZONE del gioco: due chilometri di raggio attorno al
// centro di Lugo, cioè un quadrato di quattro chilometri di lato. Prima
// erano 1,8 × 1,8 km — meno di un chilometro di raggio — e mezza città
// restava fuori: il quartiere della stazione, il Tondo, le vie oltre il
// canale. Due chilometri CURATI valgono più di venti chilometri vuoti, ma
// due chilometri devono essere due chilometri.
const DEFAULT_BBOX = '44.3945,11.8760,44.4305,11.9265';

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const args = process.argv.slice(2);
const force = args.includes('--force');
const bboxArg = args.includes('--bbox') ? args[args.indexOf('--bbox') + 1] : DEFAULT_BBOX;
if (!bboxArg) {
  console.error('--bbox richiede un valore S,W,N,E');
  process.exit(1);
}
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
  nwr["amenity"="theatre"](${B});
  node["railway"="station"](${B});
  // LE ATTIVITÀ. Prima si prendevano solo i NODI con shop=* e quattro
  // amenity: due terzi delle botteghe di Lugo restavano fuori, perché una
  // bottega grande (il supermercato, la banca, l'officina) su OpenStreetMap
  // è quasi sempre mappata come AREA, non come punto. E le categorie erano
  // cinque, quindi quaranta insegne su sessantacinque finivano nel generico.
  // Qui si prende tutto quello che è un'attività aperta al pubblico, nodo o
  // area che sia, col suo tipo vero.
  nwr["shop"](${B});
  nwr["amenity"~"^(cafe|bar|pub|restaurant|fast_food|ice_cream|pharmacy|bank|post_office|bureau_de_change|fuel|dentist|doctors|veterinary|driving_school|library|cinema|nightclub|internet_cafe)$"](${B});
  nwr["craft"](${B});
  nwr["office"~"^(estate_agent|insurance|lawyer|accountant|travel_agent|company|employment_agency|architect|it|advertising_agency)$"](${B});
  nwr["tourism"~"^(hotel|guest_house|museum|information)$"](${B});
  nwr["leisure"~"^(fitness_centre|sports_centre)$"](${B});
  nwr["healthcare"](${B});
  node["natural"="tree"](${B});
  node["highway"~"^(crossing|traffic_signals|bus_stop)$"](${B});
  node["amenity"="fountain"](${B});
  way["amenity"="parking"](${B});
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
    // Overpass può rispondere 200 con dati PARZIALI e un campo "remark"
    // (timeout/memoria a metà output): mai accettarli, finirebbero in cache
    if (json.remark) throw new Error('risposta parziale da Overpass: ' + json.remark);
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
