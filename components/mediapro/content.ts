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
  image: string;
  // Gradiente di riserva se l'immagine non è disponibile.
  fallback: string;
};

export const PROJECTS: Project[] = [
  {
    id: 'nike',
    client: 'NIKE',
    type: 'Social Media Campaign',
    year: '2025',
    image: '/assets/mediapro/nike.jpg',
    fallback: 'radial-gradient(120% 140% at 20% 10%, #2a2118 0%, #14100b 45%, #090909 100%)',
  },
  {
    id: 'tissot',
    client: 'TISSOT',
    type: 'Product Video',
    year: '2025',
    image: '/assets/mediapro/tissot.jpg',
    fallback: 'radial-gradient(120% 140% at 80% 20%, #1d2026 0%, #0f1114 45%, #090909 100%)',
  },
  {
    id: 'lamaceramiche',
    client: 'LAMACERAMICHE',
    type: 'Brand Identity',
    year: '2024',
    image: '/assets/mediapro/lamaceramiche.jpg',
    fallback: 'radial-gradient(120% 140% at 30% 80%, #201d1a 0%, #121110 45%, #090909 100%)',
  },
  {
    id: 'futurelab',
    client: 'FUTURE LAB',
    type: 'Web Design',
    year: '2024',
    image: '/assets/mediapro/futurelab.jpg',
    fallback: 'radial-gradient(120% 140% at 70% 70%, #171d2a 0%, #0e1118 45%, #090909 100%)',
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
