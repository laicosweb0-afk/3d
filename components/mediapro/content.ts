// Tutti i testi e i dati del sito MediaPro in un unico posto:
// per cambiare copy, progetti o numeri si tocca solo questo file.

export const BRAND = {
  name: 'MediaPro',
  tagline: 'Content & Creative Studio',
  email: 'hello@mediapro.studio',
  whatsapp: 'https://wa.me/393000000000',
  instagram: 'https://instagram.com/mediapro',
  linkedin: 'https://linkedin.com/company/mediapro',
};

export const NAV = [
  { id: 'hero', label: 'Home' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'servizi', label: 'Servizi' },
  { id: 'risultati', label: 'Risultati' },
  { id: 'metodo', label: 'Metodo' },
  { id: 'contatti', label: 'Contatti' },
];

export const HERO = {
  kicker: 'MediaPro',
  // Le righe del titolo: la parola accentata va in oro.
  lines: [
    { text: 'Creiamo contenuti', accent: false },
    { text: 'che trasformano', accent: true },
    { text: 'i brand in esperienze.', accent: false },
  ],
  sub: 'Studio creativo indipendente. Strategia, produzione e design per marchi che vogliono farsi ricordare.',
  cta: 'Scopri il nostro universo',
};

export type Project = {
  id: string;
  client: string;
  type: string;
  year: string;
  /** Riga che accompagna la scena 3D dedicata al progetto. */
  line: string;
  /** Materia da cui è fatto il mondo di questo progetto. */
  matter: string;
  /** Marchio del cliente, mostrato dentro la scena. */
  logo: string;
};

export const PROJECTS: Project[] = [
  {
    id: 'bufala',
    client: 'Quelli della Bufala',
    type: 'Brand & Packaging',
    year: '2025',
    line: 'Dal latte alla carta: un’identità che sa di fresco.',
    matter: 'Latte, bianco, carta',
    logo: '/assets/mediapro/bufala.jpg',
  },
  {
    id: 'mou',
    client: 'MOU',
    type: 'Brand & Mascotte',
    year: '2025',
    line: 'La mozzarella dove vuoi tu: un marchio che si fa riconoscere da lontano.',
    matter: 'Verde, panna, mozzarella',
    logo: '/assets/mediapro/mou.jpg',
  },
  {
    id: 'mondial',
    client: 'Mondial Service',
    type: 'Sito & Direzione',
    year: '2025',
    line: 'Ristrutturazioni, impianti, servizi: il mestiere messo in scena.',
    matter: 'Blu notte, ambra, metallo',
    logo: '/assets/mediapro/mondial.jpg',
  },
  {
    id: 'aurea',
    client: 'AureaClub',
    type: 'Brand & Piattaforma',
    year: '2024',
    line: 'The intelligence of beauty: una rete globale che si muove come un club.',
    matter: 'Rosa, perla, nero',
    logo: '/assets/mediapro/aurea.jpg',
  },
  {
    id: 'woman',
    client: 'Woman Beauty Center',
    type: 'Art Direction',
    year: '2024',
    line: 'Dal 1989: eleganza che non ha bisogno di alzare la voce.',
    matter: 'Magenta, nero, luce',
    logo: '/assets/mediapro/woman.jpg',
  },
];

export const SERVICES = [
  { id: 'content', label: 'Content Creation', desc: 'Fotografia e contenuti pensati per fermare lo scroll.' },
  { id: 'video', label: 'Video Production', desc: 'Dal concept al montaggio, con occhio cinematografico.' },
  { id: 'social', label: 'Social Media', desc: 'Gestione completa dei canali, con una voce riconoscibile.' },
  { id: 'web', label: 'Web Design', desc: 'Siti che sembrano prodotti, non brochure.' },
  { id: 'ai', label: 'AI Content', desc: 'Pipeline generative integrate nella produzione reale.' },
  { id: 'adv', label: 'Advertising', desc: 'Campagne misurabili su Meta, Google e TikTok.' },
  { id: 'brand', label: 'Brand Identity', desc: 'Identità visive coerenti, dal logo al tono di voce.' },
  { id: 'strategy', label: 'Strategy', desc: 'Prima la direzione, poi la produzione.' },
];

/**
 * Formattazione italiana deterministica (2500 → "2.500"). Non usiamo
 * toLocaleString: il Node della build e il browser applicano regole CLDR
 * diverse sul raggruppamento, e la differenza rompe l'idratazione di React.
 */
export const formatIt = (n: number): string =>
  n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export const STATS = [
  { value: 100, suffix: '+', label: 'Clienti soddisfatti' },
  { value: 2500, suffix: '+', label: 'Contenuti creati' },
  { value: 50, suffix: 'M+', label: 'Visualizzazioni totali' },
  { value: 300, suffix: '+', label: 'Campagne lanciate' },
  { value: 98, suffix: '%', label: 'Clienti che ci raccomandano' },
];

export const STEPS = [
  { n: '01', label: 'Strategia', desc: 'Ascoltiamo, studiamo il mercato, definiamo la direzione.' },
  { n: '02', label: 'Produzione', desc: 'Set, luci, camera: il contenuto prende forma.' },
  { n: '03', label: 'AI & Creatività', desc: 'Strumenti generativi al servizio dell’idea.' },
  { n: '04', label: 'Ottimizzazione', desc: 'Test, iterazioni, formati su misura per ogni canale.' },
  { n: '05', label: 'Crescita', desc: 'Numeri che salgono, brand che restano.' },
];

export const CONTACT = {
  kicker: '06 — Contatti',
  title: 'Il prossimo progetto potrebbe essere il tuo.',
  sub: 'Raccontaci il tuo progetto e ti rispondiamo entro 24 ore.',
  channels: [
    { label: 'WhatsApp', href: BRAND.whatsapp },
    { label: 'Instagram', href: BRAND.instagram },
    { label: 'Email', href: `mailto:${BRAND.email}` },
    { label: 'LinkedIn', href: BRAND.linkedin },
  ],
};
