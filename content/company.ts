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

// Le Opere: coppie progetto/consegna renderizzate dallo stesso identico
// punto di camera del mondo 3D (coerenza totale tra le due versioni).
export const OPERE = [
  {
    id: 'esterno',
    titolo: 'La villa',
    sotto: 'Involucro, facciate e serramenti',
    p: 0.40,
  },
  {
    id: 'soggiorno',
    titolo: 'La zona giorno',
    sotto: 'Ristrutturazione completa',
    p: 0.494,
  },
  {
    id: 'bagno',
    titolo: 'Il bagno',
    sotto: 'Chiavi in mano, marquina e calacatta',
    p: 0.8,
  },
] as const;
