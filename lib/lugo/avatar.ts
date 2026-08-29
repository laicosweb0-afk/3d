// Il guardaroba di LUGO CITY: sistema DATI della personalizzazione.
//
// Il protagonista non è più un numero fra quattro completi cablati: è una
// configurazione di pezzi indipendenti — capelli, copricapo, top, pantaloni,
// scarpe, accessorio — ciascuno con il suo prezzo in euro virtuali. Per
// aggiungere un capo basta una riga qui: il modello 3D lo monta da solo e il
// negozio lo mette in vendita.
//
// Il look di partenza è quello della key art: cappellino nero, felpa nera
// con lo stemma LC, cargo kaki, sneaker rosse.

export type CategoriaCapo = 'capelli' | 'copricapo' | 'top' | 'pantaloni' | 'scarpe' | 'accessorio';

export interface Capo {
  id: string;
  nome: string;
  categoria: CategoriaCapo;
  /** Euro virtuali. 0 = si parte già con questo. */
  prezzo: number;
  /** Livello del giocatore richiesto per comprarlo. */
  livello?: number;
  /** Tinte disponibili per il capo; la prima è quella di serie. */
  tinte?: readonly string[];
}

const NERI = ['#1B1D24', '#2A2E38', '#3D4350'] as const;
const CHIARI = ['#EDE7DA', '#D8D2C4', '#C9C2B2'] as const;

export const CAPELLI: readonly Capo[] = [
  { id: 'corti', nome: 'Corti', categoria: 'capelli', prezzo: 0 },
  { id: 'fade', nome: 'Fade', categoria: 'capelli', prezzo: 20 },
  { id: 'crop', nome: 'Crop col ciuffo', categoria: 'capelli', prezzo: 25 },
  { id: 'ricci', nome: 'Ricci', categoria: 'capelli', prezzo: 30 },
  { id: 'medi', nome: 'Medi', categoria: 'capelli', prezzo: 30 },
  { id: 'rasato', nome: 'Rasato', categoria: 'capelli', prezzo: 15 },
];

export const COPRICAPO: readonly Capo[] = [
  { id: 'niente', nome: 'A testa scoperta', categoria: 'copricapo', prezzo: 0 },
  { id: 'cappellino', nome: 'Cappellino', categoria: 'copricapo', prezzo: 0, tinte: NERI },
  { id: 'cuffia', nome: 'Cuffia di lana', categoria: 'copricapo', prezzo: 22, tinte: ['#8A3A30', '#2F4A55', '#43413C'] },
];

export const TOP: readonly Capo[] = [
  { id: 'felpa', nome: 'Felpa col cappuccio', categoria: 'top', prezzo: 0, tinte: NERI },
  { id: 'tshirt', nome: 'T-shirt', categoria: 'top', prezzo: 25, tinte: CHIARI },
  { id: 'giubbotto', nome: 'Giubbotto', categoria: 'top', prezzo: 89, tinte: ['#3A4356', '#4A3A2E', '#2F3540'] },
  { id: 'tuta', nome: 'Giacca della tuta', categoria: 'top', prezzo: 60, tinte: ['#1E3C72', '#7A2E2E', '#2F6B4F'] },
  { id: 'camicia', nome: 'Camicia', categoria: 'top', prezzo: 45, livello: 3, tinte: CHIARI },
];

export const PANTALONI: readonly Capo[] = [
  { id: 'cargo', nome: 'Cargo', categoria: 'pantaloni', prezzo: 0, tinte: ['#C2A878', '#6E6A5A', '#3A4356'] },
  { id: 'jeans', nome: 'Jeans', categoria: 'pantaloni', prezzo: 35, tinte: ['#3A4A62', '#26303C', '#7A8595'] },
  { id: 'baggy', nome: 'Baggy', categoria: 'pantaloni', prezzo: 50, tinte: ['#2A2E38', '#5A6070'] },
  { id: 'tuta', nome: 'Pantaloni della tuta', categoria: 'pantaloni', prezzo: 30, tinte: ['#1B1D24', '#1E3C72'] },
];

export const SCARPE: readonly Capo[] = [
  { id: 'sneaker', nome: 'Sneaker', categoria: 'scarpe', prezzo: 0, tinte: ['#C0392B', '#F0EDE6', '#1B1D24'] },
  { id: 'alte', nome: 'Sneaker alte', categoria: 'scarpe', prezzo: 70, tinte: ['#F0EDE6', '#1B1D24', '#1E3C72'] },
  { id: 'basse', nome: 'Scarpe basse', categoria: 'scarpe', prezzo: 40, livello: 3, tinte: ['#3A281C', '#15171D'] },
];

export const ACCESSORI: readonly Capo[] = [
  { id: 'niente', nome: 'Niente', categoria: 'accessorio', prezzo: 0 },
  { id: 'occhiali', nome: 'Occhiali da sole', categoria: 'accessorio', prezzo: 35 },
  { id: 'zaino', nome: 'Zaino', categoria: 'accessorio', prezzo: 55 },
  { id: 'catenina', nome: 'Catenina', categoria: 'accessorio', prezzo: 45, livello: 2 },
  { id: 'orologio', nome: 'Orologio', categoria: 'accessorio', prezzo: 120, livello: 4 },
];

export const GUARDAROBA: Readonly<Record<CategoriaCapo, readonly Capo[]>> = {
  capelli: CAPELLI,
  copricapo: COPRICAPO,
  top: TOP,
  pantaloni: PANTALONI,
  scarpe: SCARPE,
  accessorio: ACCESSORI,
};

export const TINTE_PELLE = ['#E8C0A0', '#D9A67C', '#B87F52', '#8D5A38', '#5C3A26'] as const;
export const TINTE_CAPELLI = ['#221C18', '#4A3323', '#7A5230', '#B08A50', '#8A8A90'] as const;

/** La configurazione di un avatar: solo id e indici di tinta, così si salva in poco. */
export interface Avatar {
  pelle: number;
  capelli: string;
  capelliTinta: number;
  copricapo: string;
  copricapoTinta: number;
  top: string;
  topTinta: number;
  pantaloni: string;
  pantaloniTinta: number;
  scarpe: string;
  scarpeTinta: number;
  accessorio: string;
}

/** Il look della key art: cappellino nero, felpa nera, cargo kaki, sneaker rosse. */
export const AVATAR_INIZIALE: Avatar = {
  pelle: 1,
  capelli: 'corti',
  capelliTinta: 0,
  copricapo: 'cappellino',
  copricapoTinta: 0,
  top: 'felpa',
  topTinta: 0,
  pantaloni: 'cargo',
  pantaloniTinta: 0,
  scarpe: 'sneaker',
  scarpeTinta: 0,
  accessorio: 'niente',
};

export function capoDi(categoria: CategoriaCapo, id: string): Capo {
  const lista = GUARDAROBA[categoria];
  return lista.find((c) => c.id === id) ?? lista[0];
}

/** La tinta effettiva di un capo, con ripiego sicuro se l'indice è fuori scala. */
export function tintaDi(categoria: CategoriaCapo, id: string, indice: number): string {
  const capo = capoDi(categoria, id);
  const tinte = capo.tinte;
  if (!tinte || !tinte.length) return '#8A8A90';
  return tinte[((indice % tinte.length) + tinte.length) % tinte.length];
}

/** Ripulisce un avatar arrivato dal salvataggio: nessun campo può restare invalido. */
export function avatarValido(grezzo: unknown): Avatar {
  const a = (grezzo ?? {}) as Partial<Avatar>;
  const id = (cat: CategoriaCapo, v: unknown, def: string) =>
    typeof v === 'string' && GUARDAROBA[cat].some((c) => c.id === v) ? v : def;
  const n = (v: unknown, max: number) =>
    typeof v === 'number' && Number.isFinite(v) ? ((Math.trunc(v) % max) + max) % max : 0;
  return {
    pelle: n(a.pelle, TINTE_PELLE.length),
    capelli: id('capelli', a.capelli, AVATAR_INIZIALE.capelli),
    capelliTinta: n(a.capelliTinta, TINTE_CAPELLI.length),
    copricapo: id('copricapo', a.copricapo, AVATAR_INIZIALE.copricapo),
    copricapoTinta: n(a.copricapoTinta, 8),
    top: id('top', a.top, AVATAR_INIZIALE.top),
    topTinta: n(a.topTinta, 8),
    pantaloni: id('pantaloni', a.pantaloni, AVATAR_INIZIALE.pantaloni),
    pantaloniTinta: n(a.pantaloniTinta, 8),
    scarpe: id('scarpe', a.scarpe, AVATAR_INIZIALE.scarpe),
    scarpeTinta: n(a.scarpeTinta, 8),
    accessorio: id('accessorio', a.accessorio, AVATAR_INIZIALE.accessorio),
  };
}
