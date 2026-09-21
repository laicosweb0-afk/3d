// La card NFC: il pezzo di plastica appoggiato sul bancone.
//
// Oggi in negozio ce n'è una sola e porta tutti allo stesso posto, quindi
// quando arriva un contatto «da card» non si sa da quale card, né da dove.
// Con più card — bancone, vetrina, la borsa del posatore, una fiera — serve
// sapere quale ha funzionato, o comprarne altre è tirare a indovinare.
//
// Perciò ogni card ha un codice suo. Il codice sta nell'indirizzo scritto
// dentro il chip: /nfc/bancone-01. Chi la tocca passa di lì, il CRM segna il
// passaggio e lo manda avanti alla pagina di sempre.
//
// Un tocco **non è** un contatto: tanta gente appoggia il telefono per
// curiosità e se ne va. I tocchi si contano a parte, e diventano un contatto
// solo se poi qualcuno lascia il nome.

export type CardNfc = {
  id: string;
  codice: string;            // quello che finisce nell'indirizzo: bancone-01
  nome: string;              // come la chiama il titolare
  luogo: string | null;      // dov'è appoggiata
  campagnaId: string | null; // se è stata distribuita dentro un'iniziativa
  destinazione: string | null; // dove manda; vuoto = la pagina del Club
  attiva: boolean;
  tocchi: number;
  ultimoToccoIl: string | null;
  note: string | null;
  demo: boolean;
  creataIl: string;
};

// Il codice finisce in un indirizzo e va letto ad alta voce al telefono:
// niente maiuscole, niente accenti, niente spazi.
export function normalizzaCodiceCard(grezzo: string): string {
  return grezzo
    .trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

// Dove manda una card quando la si tocca e non le è stata data una
// destinazione sua.
//
// In produzione il CRM sta su un indirizzo (crm.ramastore.it) e la pagina del
// Club su un altro (ramastore.it/club/): senza dirlo, la card manderebbe a
// una pagina che nel CRM non esiste. Si configura con `SITO_URL`; se non c'è,
// resta il percorso relativo — che è giusto quando i due stanno insieme, come
// in modalità dimostrativa.
export const DESTINAZIONE_PREDEFINITA = '/club/';

export function destinazionePredefinita(): string {
  const sito = process.env.SITO_URL?.trim();
  return sito ? `${sito.replace(/\/$/, '')}${DESTINAZIONE_PREDEFINITA}` : DESTINAZIONE_PREDEFINITA;
}

// L'indirizzo da scrivere nel chip. Serve alla pagina di gestione per farlo
// copiare senza sbagliare: è l'unica cosa che va trascritta a mano su un
// oggetto fisico, e un errore lì si scopre solo in negozio.
export const indirizzoCard = (base: string, codice: string) =>
  `${base.replace(/\/$/, '')}/nfc/${codice}`;
