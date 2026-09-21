import type { Ingresso } from '@/lib/dati/ingresso';

// Traduttore dei webhook di Messenger e Instagram verso il modello del CRM.
//
// La forma del payload è quella documentata da Meta (campi `messages` e
// `messaging_referrals`): entry[].messaging[] con `sender.id` (il PSID, o
// l'IGSID per Instagram), `message.text`, e — quando la conversazione nasce
// da un annuncio — `referral` oppure `postback.referral` con `ad_id`, `ref`,
// `source: ADS`.
//
// DA VERIFICARE sul primo payload vero: Meta cambia i dettagli senza
// preavviso, e per Instagram la forma non è identica a quella di Messenger.
// Per questo il payload grezzo viene salvato **prima** di essere tradotto:
// se qui sbagliamo una chiave, il dato non è perso.

type Qualsiasi = Record<string, unknown>;

const oggetto = (v: unknown): Qualsiasi | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Qualsiasi) : null;
const elenco = (v: unknown): Qualsiasi[] =>
  Array.isArray(v) ? v.filter((x): x is Qualsiasi => !!x && typeof x === 'object') : [];
const testo = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

export function traduciMessenger(corpo: unknown, canale: 'messenger' | 'instagram' = 'messenger'): Ingresso[] {
  const radice = oggetto(corpo);
  if (!radice) return [];

  // `object` dice se è una Pagina o un account Instagram; non lo usiamo per
  // decidere, ma tenerlo d'occhio aiuta a capire cosa è arrivato.
  const ingressi: Ingresso[] = [];

  for (const voce of elenco(radice.entry)) {
    for (const messaggio of elenco(voce.messaging)) {
      const mittente = oggetto(messaggio.sender);
      const identificativo = testo(mittente?.id);
      // Gli echo dei messaggi che mandiamo noi non sono ingressi.
      const contenuto = oggetto(messaggio.message);
      if (!identificativo || contenuto?.is_echo) continue;

      const rinvio = oggetto(messaggio.referral)
        ?? oggetto(oggetto(messaggio.postback)?.referral);

      const quando = typeof messaggio.timestamp === 'number'
        ? new Date(messaggio.timestamp).toISOString()
        : undefined;

      ingressi.push({
        canale,
        identita: {
          tipo: canale === 'instagram' ? 'instagram_igsid' : 'messenger_psid',
          valore: identificativo,
        },
        // Nome e cognome non arrivano col messaggio: si chiedono alla User
        // Profile API con il PSID, quando l'app sarà approvata.
        nome: null,
        testo: testo(contenuto?.text) ?? testo(oggetto(messaggio.postback)?.title),
        quando,
        idConversazioneEsterna: identificativo,
        campagna: rinvio
          ? { adId: testo(rinvio.ad_id), ref: testo(rinvio.ref) }
          : undefined,
        riferimento: rinvio ?? null,
      });
    }
  }

  return ingressi;
}
