export type Lead = {
  nome: string;
  email: string;
  telefono: string;
  /** Lo stile scelto: è il dato che vale, dice che arredo comprerà. */
  stile: string;
  /** I tre pezzi consigliati, per chi lo richiama dal negozio. */
  pezzi: string[];
  /** Gli articoli col cuore nella vetrina: cosa mostrargli appena entra. */
  preferiti: string[];
  credito: number;
  /** Da quale spesa vale il credito. */
  spesaMinima: number;
  codiceCredito: string;
  scadenza: string;
  consensoMarketing: boolean;
  timestamp: string;
  sorgente: 'card-nfc';
  club: 'bazar-marrakech';
};

/**
 * Invio del contatto. Senza VITE_LEAD_WEBHOOK_URL resta un finto invio che
 * aspetta 800ms e scrive in console: basta per provare il percorso completo
 * senza dipendere da un servizio esterno. Con la variabile impostata, il
 * contatto parte davvero in POST JSON.
 */
export async function submitLead(lead: Lead): Promise<void> {
  const url = import.meta.env.VITE_LEAD_WEBHOOK_URL as string | undefined;

  if (!url) {
    await new Promise((r) => setTimeout(r, 800));
    console.log('[bazar] lead (invio simulato)', lead);
    return;
  }

  const risposta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lead),
  });
  if (!risposta.ok) {
    throw new Error(`Il server ha risposto ${risposta.status}`);
  }
}
