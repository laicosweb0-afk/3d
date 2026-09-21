import type { Ingresso } from '@/lib/dati/ingresso';

// Traduttore dei webhook della WhatsApp Cloud API.
//
// Forma documentata: entry[].changes[].value con `contacts[]` (wa_id e
// profile.name), `messages[]` (from, text.body, timestamp) e — quando la
// conversazione nasce da un annuncio click-to-WhatsApp — `referral` con
// **ctwa_clid**, `source_id` e `source_type: ad | post`.
//
// Il numero è l'unica chiave che attraversa i canali: è per questo che una
// persona arrivata prima da Messenger e poi da WhatsApp si può riconoscere
// solo se ci lascia il numero da qualche parte.
//
// DA VERIFICARE sul primo payload vero.

type Qualsiasi = Record<string, unknown>;

const oggetto = (v: unknown): Qualsiasi | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Qualsiasi) : null;
const elenco = (v: unknown): Qualsiasi[] =>
  Array.isArray(v) ? v.filter((x): x is Qualsiasi => !!x && typeof x === 'object') : [];
const testo = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

export function traduciWhatsApp(corpo: unknown): Ingresso[] {
  const radice = oggetto(corpo);
  if (!radice) return [];

  const ingressi: Ingresso[] = [];

  for (const voce of elenco(radice.entry)) {
    for (const cambiamento of elenco(voce.changes)) {
      const valore = oggetto(cambiamento.value);
      if (!valore) continue;

      // I nomi arrivano in un elenco a parte, legati al numero.
      const nomi = new Map<string, string>();
      for (const c of elenco(valore.contacts)) {
        const numero = testo(c.wa_id);
        const nome = testo(oggetto(c.profile)?.name);
        if (numero && nome) nomi.set(numero, nome);
      }

      for (const messaggio of elenco(valore.messages)) {
        const da = testo(messaggio.from);
        if (!da) continue;

        // Il numero arriva senza il +: rimetterlo serve a farlo combaciare
        // con quello scritto in rubrica.
        const numero = da.startsWith('+') ? da : `+${da}`;
        const rinvio = oggetto(messaggio.referral);
        const quando = testo(messaggio.timestamp)
          ? new Date(Number(messaggio.timestamp) * 1000).toISOString()
          : undefined;

        const nomeIntero = nomi.get(da) ?? null;
        const [nome, ...resto] = (nomeIntero ?? '').split(' ');

        ingressi.push({
          canale: 'whatsapp',
          identita: { tipo: 'whatsapp_telefono', valore: numero },
          identitaExtra: [{ tipo: 'telefono', valore: numero }],
          nome: nome || null,
          cognome: resto.join(' ') || null,
          testo: testo(oggetto(messaggio.text)?.body) ?? `[${testo(messaggio.type) ?? 'messaggio'}]`,
          quando,
          idConversazioneEsterna: numero,
          // Quello che identifica la campagna è `source_id`: è l'inserzione.
          // Il `ctwa_clid` identifica **quel clic**, non la campagna, quindi
          // non si usa per cercarla — resta dentro `riferimento`, che è dove
          // servirà quando si faranno i conti con le statistiche di Meta.
          campagna: rinvio
            ? { adId: testo(rinvio.source_id) }
            : undefined,
          riferimento: rinvio ?? null,
        });
      }
    }
  }

  return ingressi;
}
