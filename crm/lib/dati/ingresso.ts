import type { Deposito } from './deposito';
import type { Canale, TipoIdentita } from '@/lib/dominio/campagne';
import {
  CANALE_DI_IDENTITA, ETICHETTA_CANALE, IDENTITA_TRASVERSALI, formeEquivalenti,
  normalizzaIdentita,
} from '@/lib/dominio/campagne';
import type { Fonte } from '@/lib/dominio/tipi';
import { scadenzaFra } from '@/lib/dominio/automazioni';

// Il portone: da qui entra tutto quello che arriva da fuori — Messenger,
// WhatsApp, Instagram, il modulo del sito, la card NFC. È scritto una volta
// sola sopra l'interfaccia del deposito, quindi la versione demo e quella su
// Postgres si comportano **per forza** allo stesso modo.
//
// La sequenza è sempre questa:
//
//   riconosci la persona → collega la campagna → apri o riprendi la
//   conversazione → scrivi l'evento → assicurati che ci sia una prossima
//   azione
//
// Nessun adattatore di canale (quelli veri arriveranno con le API di Meta)
// deve rifare questo ragionamento: traduce il suo payload in `Ingresso` e
// chiama questa funzione.

export type Ingresso = {
  canale: Canale;
  // Come riconosciamo la persona su questo canale.
  identita: { tipo: TipoIdentita; valore: string };
  nome?: string | null;
  cognome?: string | null;
  // Altre chiavi che il canale ci ha dato (il telefono su WhatsApp, l'email
  // di un modulo): servono a ritrovare la stessa persona altrove.
  identitaExtra?: { tipo: TipoIdentita; valore: string }[];
  testo?: string | null;
  quando?: string;
  // L'identificativo del filo dalla parte del canale, per ritrovarlo al
  // messaggio dopo.
  idConversazioneEsterna?: string | null;
  // Quello che il canale dice sull'annuncio.
  campagna?: { adId?: string | null; idEsterno?: string | null; ref?: string | null };
  riferimento?: Record<string, unknown> | null;
};

export type EsitoIngresso = {
  contattoId: string;
  conversazioneId: string;
  nuovoContatto: boolean;
  campagnaId: string | null;
};

// Da che canale arriva → che fonte scriviamo sul contatto. Se il messaggio
// viene da una campagna, la fonte resta il canale: la campagna è un'altra
// cosa e ha il suo campo.
const FONTE_DI_CANALE: Record<Canale, Fonte> = {
  messenger: 'facebook',
  instagram: 'instagram',
  whatsapp: 'whatsapp',
  email: 'altro',
  telefono: 'altro',
  sito: 'sito',
  altro: 'altro',
};

export async function registraIngresso(dep: Deposito, ingresso: Ingresso): Promise<EsitoIngresso> {
  const quando = ingresso.quando ?? new Date().toISOString();
  const chiave = {
    tipo: ingresso.identita.tipo,
    valore: normalizzaIdentita(ingresso.identita.tipo, ingresso.identita.valore),
  };
  const extra = (ingresso.identitaExtra ?? []).map((i) => ({
    tipo: i.tipo,
    valore: normalizzaIdentita(i.tipo, i.valore),
  }));

  // 1. La campagna, se il canale ce l'ha detto.
  const campagna = ingresso.campagna
    ? await dep.trovaCampagna(ingresso.campagna)
    : null;

  // 2. Chi è. Prima la chiave del canale, poi quelle trasversali (telefono,
  //    email): sono le uniche che valgono fuori da questo canale.
  let contattoId = await dep.trovaContattoPerIdentita(chiave.tipo, chiave.valore);
  if (!contattoId) {
    // La chiave del canale vale anche fuori se è un telefono o un'email; le
    // extra sono quelle che il canale ci ha dato in più. Di ciascuna si
    // provano tutte le forme equivalenti.
    const candidate = [chiave, ...extra]
      .filter((k) => IDENTITA_TRASVERSALI.includes(k.tipo))
      .flatMap((k) => formeEquivalenti(k.tipo, k.valore));
    for (const alt of candidate) {
      contattoId = await dep.trovaContattoPerIdentita(alt.tipo, alt.valore);
      if (contattoId) break;
    }
  }

  const nuovoContatto = !contattoId;

  // I recapiti veri, presi da qualunque chiave li porti: il modulo del sito
  // manda il numero fra le identità in più, e senza questo passaggio la
  // scheda resterebbe senza telefono pur sapendolo. Il bottone «Chiama» che
  // non c'è è un cliente che non viene richiamato.
  const recapiti = [chiave, ...extra];
  const telefono = recapiti.find((k) => k.tipo === 'telefono' || k.tipo === 'whatsapp_telefono')?.valore ?? null;
  const email = recapiti.find((k) => k.tipo === 'email')?.valore ?? null;

  if (!contattoId) {
    const nome = (ingresso.nome ?? '').trim() || `Contatto ${ETICHETTA_CANALE[ingresso.canale]}`;
    contattoId = await dep.creaContatto({
      nome,
      cognome: (ingresso.cognome ?? '').trim(),
      telefono,
      email,
      // L'evento lo scrive il passo 6 qui sotto, con dentro il messaggio:
      // due righe «è arrivato un lead» nella stessa storia sono rumore.
      silenzioso: true,
      fonte: FONTE_DI_CANALE[ingresso.canale],
      fonteDettaglio: campagna ? `Campagna «${campagna.nome}»` : ETICHETTA_CANALE[ingresso.canale],
      campagnaId: campagna?.id ?? null,
      fase: 'nuovo',
      azione: {
        tipo: 'rispondere',
        descrizione: `Rispondere su ${ETICHETTA_CANALE[ingresso.canale]}${ingresso.testo ? `: ${ingresso.testo.slice(0, 80)}` : ''}`,
        // Un messaggio pagato con la pubblicità si risponde oggi, non domani.
        scadenza: scadenzaFra(0),
        priorita: 'urgente',
      },
    });
  }

  // 3. Le chiavi si attaccano alla persona: la prossima volta la si riconosce.
  await dep.collegaIdentita(contattoId, chiave.tipo, chiave.valore);
  for (const alt of extra) await dep.collegaIdentita(contattoId, alt.tipo, alt.valore);

  // 4. Su una persona che esisteva già si riempiono solo i buchi: la campagna
  //    se non ne ha una (il primo annuncio che l'ha portata è quello che
  //    conta, non l'ultimo) e i recapiti che ancora non sapevamo. Quello che
  //    è già scritto non si tocca: è stato scritto da una persona.
  if (!nuovoContatto) {
    const dati = await dep.istantanea();
    const gia = dati.contatti.find((c) => c.id === contattoId);
    const patch: { campagnaId?: string; telefono?: string; email?: string } = {};
    if (campagna && !gia?.campagnaId) patch.campagnaId = campagna.id;
    if (telefono && !gia?.telefono?.trim()) patch.telefono = telefono;
    if (email && !gia?.email?.trim()) patch.email = email;
    if (Object.keys(patch).length > 0) await dep.aggiornaContatto(contattoId, patch);
  }

  // 5. La conversazione: si riprende quella aperta invece di aprirne una nuova.
  const esterna = ingresso.idConversazioneEsterna ?? chiave.valore;
  const esistente = await dep.trovaConversazione(ingresso.canale, esterna);

  let conversazioneId: string;
  if (esistente) {
    conversazioneId = esistente.id;
    await dep.aggiornaConversazione(conversazioneId, {
      stato: 'aperta',
      nonLetta: true,
      ultimoMessaggioIl: quando,
      ultimoMessaggioTesto: ingresso.testo ?? null,
      campagnaId: esistente.campagnaId ?? campagna?.id ?? null,
    });
  } else {
    conversazioneId = await dep.creaConversazione({
      contattoId,
      canale: ingresso.canale,
      campagnaId: campagna?.id ?? null,
      idEsterno: esterna,
      primoMessaggioIl: quando,
      ultimoMessaggioIl: quando,
      ultimoMessaggioTesto: ingresso.testo ?? null,
      riferimento: ingresso.riferimento ?? null,
    });
  }

  // 6. L'evento nella storia della persona: una timeline sola, quattro canali.
  await dep.registraEvento({
    contattoId,
    conversazioneId,
    tipo: nuovoContatto ? 'lead_ricevuto' : 'messaggio',
    descrizione: [
      `${ETICHETTA_CANALE[ingresso.canale]}${campagna ? ` — campagna «${campagna.nome}»` : ''}`,
      ingresso.testo?.trim() ? `«${ingresso.testo.trim().slice(0, 300)}»` : null,
    ].filter(Boolean).join(': '),
    quando,
    automatico: true,
  });

  // 7. Un messaggio senza risposta non deve restare senza risposta: se la
  //    persona esisteva già e nessuno ha niente in mano, si apre l'azione.
  if (!nuovoContatto) {
    const dati = await dep.istantanea();
    const aperta = dati.azioni.some((a) => a.contattoId === contattoId && !a.fattaIl);
    if (!aperta) {
      await dep.creaAzione({
        contattoId,
        tipo: 'rispondere',
        descrizione: `Rispondere su ${ETICHETTA_CANALE[ingresso.canale]}`,
        scadenza: scadenzaFra(0),
        priorita: 'urgente',
      });
    }
  }

  return { contattoId, conversazioneId, nuovoContatto, campagnaId: campagna?.id ?? null };
}

// Il canale suggerito da un tipo di identità, per gli adattatori che non lo
// dichiarano esplicitamente.
export const canaleDi = (tipo: TipoIdentita): Canale => CANALE_DI_IDENTITA[tipo];
