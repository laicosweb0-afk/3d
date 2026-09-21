import type { Fonte } from './tipi';

// Le fonti, raggruppate in famiglie. Il colore sta sulla famiglia, non sulla
// singola fonte: dieci tinte diverse non si distinguono, cinque sì. La
// famiglia "diretto" resta neutra apposta — un colore acceso su "Altro"
// farebbe sembrare importante quello che non lo è.

export type Famiglia = 'social' | 'ricerca' | 'pubblicita' | 'negozio' | 'diretto';

export type DescrizioneFonte = {
  id: Fonte;
  nome: string;
  famiglia: Famiglia;
};

export const FONTI_DESCRITTE: DescrizioneFonte[] = [
  { id: 'instagram', nome: 'Instagram', famiglia: 'social' },
  { id: 'facebook', nome: 'Facebook', famiglia: 'social' },
  { id: 'google', nome: 'Google', famiglia: 'ricerca' },
  { id: 'sito', nome: 'Sito', famiglia: 'ricerca' },
  { id: 'campagna', nome: 'Campagna', famiglia: 'pubblicita' },
  { id: 'showroom', nome: 'Showroom', famiglia: 'negozio' },
  { id: 'card_nfc', nome: 'Card NFC', famiglia: 'negozio' },
  { id: 'whatsapp', nome: 'WhatsApp', famiglia: 'diretto' },
  { id: 'passaparola', nome: 'Passaparola', famiglia: 'diretto' },
  { id: 'altro', nome: 'Altro', famiglia: 'diretto' },
];

// Tinte validate per contrasto e per chi non distingue i colori.
export const COLORE_FAMIGLIA: Record<Famiglia, string> = {
  social: '#7b7fd4',
  ricerca: '#00a39b',
  pubblicita: '#d96a4a',
  negozio: '#a9852a',
  diretto: '#8f8b83',
};

const PER_ID = new Map(FONTI_DESCRITTE.map((f) => [f.id, f]));

export const fonte = (id: Fonte): DescrizioneFonte =>
  PER_ID.get(id) ?? { id: 'altro', nome: 'Altro', famiglia: 'diretto' };
export const nomeFonte = (id: Fonte) => fonte(id).nome;
export const coloreFonte = (id: Fonte) => COLORE_FAMIGLIA[fonte(id).famiglia];
