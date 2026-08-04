// L'ordine — i dati e le regole del titolare (WhatsApp inoltrato, 04/08).
//
// Il sito è statico: non c'è un negozio elettronico, c'è un compositore di
// messaggi. Il visitatore sceglie qui, WhatsApp consegna, il banco
// conferma. Nessun pagamento, nessun server, nessuna promessa che una
// pagina statica non possa mantenere.
//
// ⚠️ Il catalogo è PARZIALE per dichiarazione dell'utente (04/08): «la
// lista prodotti attualmente non è del tutto completa». Qui dentro ci sono
// solo prodotti REALI già confermati altrove nel sito (la mozzarella, e le
// cinque tappe della vetrina — lette sulle confezioni vere). Quando il
// titolare manda l'elenco completo, si allunga questa lista e basta.
// Nel frattempo il compositore accetta anche prodotti scritti a mano:
// un catalogo incompleto non deve far perdere un ordine.

export interface Ordinabile {
  /** Il nome reale del prodotto. Nessun claim: il nome. */
  nome: string;
  /** La categoria, che è anche vocabolario di ricerca («salumi» trova il
   *  prosciutto). Parole del mestiere, non tassonomie. */
  categoria: string;
  /** Il produttore, dove è leggibile sulla confezione reale. */
  produttore?: string;
  /** Kg minimi. Regola del titolare: «l'ordine minimo parta da 1 kg di
   *  mozzarella»; l'utente l'ha estesa a tutto («il minimo dell'ordine un
   *  chilo»). */
  minKg: number;
}

export const ordinabili: Ordinabile[] = [
  { nome: 'Mozzarella di bufala', categoria: 'Mozzarella', minKg: 1 },
  { nome: 'Prataiola alla rucola', categoria: 'Formaggi', produttore: 'Moncalo', minKg: 1 },
  { nome: 'Formaggio di capra', categoria: 'Formaggi', minKg: 1 },
  { nome: 'Prosciutto stagionato', categoria: 'Salumi', minKg: 1 },
  { nome: 'Friarielli all’olio', categoria: 'Gastronomia', minKg: 1 },
  { nome: 'Olive Bella di Cerignola', categoria: 'Gastronomia', produttore: 'Luliv', minKg: 1 },
];

/** Il passo dello stepper, in kg. Mezzo chilo: abbastanza fine per una
 *  spesa vera, abbastanza grosso da non trasformare il più in una slot. */
export const PASSO_KG = 0.5;

/** Le finestre di prenotazione, dal messaggio del titolare (04/08),
 *  lettura confermata dall'utente: la finestra APRE e CHIUDE — «x lunedì:
 *  venerdì alle 17 entro sabato alle 12» = si ordina da venerdì 17:00 a
 *  sabato 12:00. Giovedì e weekend senza ritiro: il banco è chiuso
 *  (coerente con company.orari).
 *
 *  I giorni sono nella convenzione JavaScript: 0 = domenica … 6 = sabato.
 *  Le stringhe `quando` e `apreTesto` sono scritte qui e non composte a
 *  runtime: quattro righe fisse non giustificano un formattatore. */
export interface Finestra {
  ritiro: string;
  quando: string;
  apreTesto: string;
  apre: { giorno: number; ora: string };
  chiude: { giorno: number; ora: string };
}

export const finestre: Finestra[] = [
  {
    ritiro: 'lunedì',
    quando: 'da venerdì 17:00 a sabato 12:00',
    apreTesto: 'venerdì alle 17:00',
    apre: { giorno: 5, ora: '17:00' },
    chiude: { giorno: 6, ora: '12:00' },
  },
  {
    ritiro: 'martedì',
    quando: 'da venerdì 17:00 a sabato 12:00',
    apreTesto: 'venerdì alle 17:00',
    apre: { giorno: 5, ora: '17:00' },
    chiude: { giorno: 6, ora: '12:00' },
  },
  {
    ritiro: 'mercoledì',
    quando: 'da domenica 12:00 a lunedì 12:00',
    apreTesto: 'domenica alle 12:00',
    apre: { giorno: 0, ora: '12:00' },
    chiude: { giorno: 1, ora: '12:00' },
  },
  {
    ritiro: 'venerdì',
    quando: 'da martedì 17:00 a mercoledì 12:00',
    apreTesto: 'martedì alle 17:00',
    apre: { giorno: 2, ora: '17:00' },
    chiude: { giorno: 3, ora: '12:00' },
  },
];

const MINUTI_SETTIMANA = 7 * 24 * 60;

function minuti(p: { giorno: number; ora: string }): number {
  const [h, m] = p.ora.split(':').map(Number);
  return p.giorno * 1440 + h * 60 + m;
}

/** Il minuto della settimana in cui siamo ADESSO, nel fuso del banco.
 *  Sempre Europe/Rome: chi guarda il sito dall'estero deve vedere le
 *  finestre del banco, non le proprie. */
export function minutoRoma(adesso = new Date()): number {
  const parti = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(adesso);
  const leggi = (tipo: string) => parti.find((p) => p.type === tipo)?.value ?? '';
  const giorni: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return (giorni[leggi('weekday')] ?? 0) * 1440 + Number(leggi('hour')) * 60 + Number(leggi('minute'));
}

/** Lo stato delle finestre in un dato minuto della settimana: quali sono
 *  aperte adesso e, se nessuna lo è, quale apre per prima. Nessuna
 *  finestra scavalca la mezzanotte fra sabato e domenica, quindi il
 *  confronto è un intervallo semplice. */
export function statoFinestre(t: number): { aperte: Finestra[]; prossima: Finestra } {
  const aperte = finestre.filter((f) => t >= minuti(f.apre) && t < minuti(f.chiude));
  const prossima = [...finestre].sort(
    (a, b) =>
      ((minuti(a.apre) - t + MINUTI_SETTIMANA) % MINUTI_SETTIMANA) -
      ((minuti(b.apre) - t + MINUTI_SETTIMANA) % MINUTI_SETTIMANA),
  )[0];
  return { aperte, prossima };
}
