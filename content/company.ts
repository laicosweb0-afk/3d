// Dati aziendali reali Mondial Service Srl (forniti dal cliente, 2026-07-19).
// Nessun dato inventato: i campi mancanti restano null finché non arrivano.

export const COMPANY = {
  name: 'Mondial Service Srl',
  phone: '+39 329 700 3558',
  phoneHref: 'tel:+393297003558',
  whatsappHref: 'https://wa.me/393297003558',
  address: 'Via Giacomo Matteotti, 10 – 40027 Mordano (BO)',
  mapsHref: 'https://www.google.com/maps/search/?api=1&query=Via+Giacomo+Matteotti+10%2C+40027+Mordano+BO',
  website: 'https://www.mondialservicesrl.it',
  email: 'mmondial.servicee@gmail.com',
  emailHref: 'mailto:mmondial.servicee@gmail.com',
  piva: '03999921208',
  claims: [
    { title: 'Garanzia e affidabilità', body: 'Ogni intervento è garantito e seguito da un unico interlocutore, dall’inizio alla fine.' },
    { title: 'Disponibili 24 ore su 24', body: 'Le urgenze non hanno orari. Noi nemmeno.' },
    { title: 'Assistenza su WhatsApp', body: 'Una foto, un messaggio, una risposta. Il canale più semplice è quello che usi già.' },
  ],
} as const;

// Voci sotto i tre pilastri del logo. Solo servizi già raccontati nel
// viaggio o dichiarati dal cliente; elenco da confermare/estendere.
export const SERVICES = [
  {
    pillar: 'Ristrutturazioni',
    items: ['Ristrutturazioni complete', 'Bagni chiavi in mano', 'Rifacimento pavimenti e rivestimenti'],
  },
  {
    pillar: 'Impianti',
    items: ['Impianti termoidraulici', 'Riscaldamento radiante a pavimento', 'Impianti elettrici', 'Isolamento termico'],
  },
  {
    pillar: 'Servizi',
    items: ['Sopralluoghi e preventivi', 'Assistenza e urgenze 24/7', 'Manutenzioni programmate'],
  },
] as const;

// Le Opere: cantiere -> consegna. Soggiorno e bagno usano lo stesso fotogramma
// grezzo che apre i video del viaggio (camera già combaciante con la foto
// reale finita) — coerenza totale, zero asset nuovi. La villa resta l'unica
// coppia dal mondo 3D: non abbiamo ancora una foto reale della facciata in
// cantiere, va sostituita appena disponibile.
export const OPERE = [
  {
    id: 'esterno',
    titolo: 'La villa',
    sotto: 'Involucro, facciate e serramenti',
    before: '/assets/opere/esterno-progetto.jpg',
    after: '/assets/opere/esterno-consegna.jpg',
  },
  {
    id: 'soggiorno',
    titolo: 'La zona giorno',
    sotto: 'Ristrutturazione completa',
    before: '/assets/video/soggiorno-costruzione-poster.jpg',
    after: '/assets/foto/soggiorno-1.jpg',
  },
  {
    id: 'bagno',
    titolo: 'Il bagno',
    sotto: 'Chiavi in mano, marquina e calacatta',
    before: '/assets/video/bagno-costruzione-poster.jpg',
    after: '/assets/foto/bagno-reale.jpg',
  },
] as const;
