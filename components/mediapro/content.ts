// Tutti i testi e i dati del sito MediaPro in un unico posto:
// per cambiare copy, progetti o numeri si tocca solo questo file.

/**
 * ATTENZIONE — email, WhatsApp e social qui sotto sono SEGNAPOSTO inventati:
 * non corrispondono a nessuna casella e a nessun profilo reale. È l'unico
 * contenuto non veritiero rimasto sul sito, ed è il motivo per cui la pagina
 * è ancora `noindex` (vedi app/mediapro/layout.tsx). Sostituirli con i recapiti
 * veri e togliere il noindex sono la stessa operazione: finché un visitatore
 * può scrivere a un indirizzo che non esiste, il sito non va indicizzato.
 */
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
  { id: 'risultati', label: 'Settori' },
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
};

export const PROJECTS: Project[] = [
  {
    id: 'bufala',
    client: 'Quelli della Bufala',
    type: 'Brand & Packaging',
    year: '2025',
    line: 'Dal latte alla carta: un’identità che sa di fresco.',
    matter: 'Latte, bianco, carta',
  },
  {
    id: 'mou',
    client: 'MOU',
    type: 'Brand & Mascotte',
    year: '2025',
    line: 'La mozzarella dove vuoi tu: un marchio che si fa riconoscere da lontano.',
    matter: 'Verde, panna, mozzarella',
  },
  {
    id: 'mondial',
    client: 'Mondial Service',
    type: 'Sito & Direzione',
    year: '2025',
    line: 'Ristrutturazioni, impianti, servizi: il mestiere messo in scena.',
    matter: 'Blu notte, ambra, metallo',
  },
  {
    id: 'aurea',
    client: 'AureaClub',
    type: 'Brand & Piattaforma',
    year: '2024',
    line: 'The intelligence of beauty: una rete globale che si muove come un club.',
    matter: 'Rosa, perla, nero',
  },
  {
    id: 'loewe',
    client: 'LOEWE × Jacob & Co',
    // Shooting per il lancio, non identita' di marca: la distinzione e'
    // importante, sono due affermazioni diverse su cosa abbiamo fatto.
    type: 'Shooting',
    year: '2025',
    line: 'A bordo di uno yacht a Montecarlo, per il lancio della collaborazione.',
    matter: 'Cromo, nero, notte',
  },
  {
    id: 'woman',
    client: 'Woman Beauty Center',
    type: 'Art Direction',
    year: '2024',
    line: 'Dal 1989: eleganza che non ha bisogno di alzare la voce.',
    matter: 'Magenta, nero, luce',
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
 * Sezione 04. Al posto di statistiche inventate — 100+ clienti, 50M+
 * visualizzazioni e simili, che non corrispondevano a nulla — ci sono i
 * settori realmente attraversati, con i clienti come prova verificabile.
 * Numeri veri se e quando ci saranno; nel frattempo nessuna cifra falsa.
 */
export const SECTORS = [
  {
    label: 'Alimentare',
    clients: 'Quelli della Bufala · MOU',
    line: 'Marchi nati da zero, dal nome al packaging.',
  },
  {
    label: 'Edilizia e impianti',
    clients: 'Mondial Service',
    line: 'Un mestiere concreto raccontato senza retorica.',
  },
  {
    label: 'Beauty',
    clients: 'AureaClub · Woman Beauty Center',
    line: 'Identità e piattaforme per un settore che vive di immagine.',
  },
  {
    label: 'Lusso ed eventi',
    clients: 'LOEWE × Jacob & Co',
    line: 'Shooting sul posto, dove il tempo per rifare non esiste.',
  },
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
