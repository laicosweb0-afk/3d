// Schema della mappa di Lugo generata dalla pipeline OSM
// (tools/lugo/fetch-osm.mjs → tools/lugo/build-map.mjs → public/lugo/map.json).
//
// Convenzioni:
//  - coordinate in DECIMETRI interi, piano locale con origine alla Rocca
//    Estense (44.4208 N, 11.9109 E): +X = est, −Z = nord, Y = altezza;
//  - i poligoni sono anelli senza il punto di chiusura duplicato;
//  - gli array `pts`/`poly`/`fp` sono appiattiti [x0, z0, x1, z1, …].

/** Fattore di quantizzazione: decimetri per metro. */
export const DM = 10;

export type ClasseStrada =
  | 'primaria'
  | 'secondaria'
  | 'residenziale'
  | 'servizio'
  | 'pedonale';

export interface StradaMap {
  classe: ClasseStrada;
  /** Larghezza carreggiata in metri. */
  larghezza: number;
  nome?: string;
  /** 1 = anello di rotonda (junction=roundabout). */
  rotonda?: 1;
  /** Polilinea [x0,z0,x1,z1,…] in dm. */
  pts: number[];
}

/** Rettangolo orientato minimo: centro, semi-larghezza, semi-profondità (dm), angolo (rad). */
export type ObbCollider = { obb: [number, number, number, number, number] };
/** Footprint concavo (cortili!): collisione sui segmenti del perimetro. */
export type EdgeCollider = { edges: true };

export interface EdificioMap {
  /** Footprint [x0,z0,…] in dm, antiorario nel piano matematico x-z (nord = −Z). */
  fp: number[];
  /** Cortili/buchi del footprint, ciascuno [x0,z0,…] in dm. Con fori il collider è sempre `edges`. */
  fori?: number[][];
  /** Altezza in metri. */
  h: number;
  /** Indice nella palette intonaci (lib/lugo/palette.ts). */
  tinta: number;
  /** 1 = tetto a falde (dai tag OSM o dall'euristica); 0 = piatto. Assente nelle mappe vecchie. */
  falde?: 0 | 1;
  /** 1 = edificio di culto: riceve il campanile. */
  chiesa?: 1;
  /** Colore dichiarato in OSM (building:colour), hex normalizzato. */
  col?: string;
  collider: ObbCollider | EdgeCollider;
  /** Id landmark (pavaglione, rocca, stazione, caserma, teatro…) se riconosciuto. */
  landmark?: string;
}

export interface AreaMap {
  kind: 'verde' | 'acqua' | 'piazza' | 'parcheggio';
  /** Poligono [x0,z0,…] in dm. */
  poly: number[];
}

export interface PoiMap {
  id: string;
  nome: string;
  /** Posizione in dm. */
  x: number;
  z: number;
  /** Orientamento (rad) dal rettangolo minimo del footprint, se disponibile. */
  rot?: number;
}

export interface NegozioMap {
  /** Insegna (nome vero da OSM). */
  n: string;
  /** Categoria: tabacchi | farmacia | bar | cibo | negozio. */
  c?: string;
  x: number;
  z: number;
}

export type TipoArredo = 'albero' | 'zebre' | 'semaforo' | 'bus' | 'fontana' | 'obelisco';

export interface ArredoMap {
  t: TipoArredo;
  x: number;
  z: number;
}

export interface LugoMap {
  version: 1;
  origin: { lat: number; lon: number };
  /** Bbox del mondo in dm: [minX, minZ, maxX, maxZ]. */
  bounds: [number, number, number, number];
  roads: StradaMap[];
  buildings: EdificioMap[];
  aree: AreaMap[];
  /** Polilinee ferroviarie, ciascuna [x0,z0,…] in dm. */
  rail: number[][];
  poi: PoiMap[];
  /** Botteghe con nome vero (assente nelle mappe vecchie). */
  negozi?: NegozioMap[];
  /** Arredi urbani mappati uno per uno (assente nelle mappe vecchie). */
  arredi?: ArredoMap[];
}
