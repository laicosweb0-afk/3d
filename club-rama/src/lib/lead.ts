export type Lead = {
  nome: string;
  email: string;
  telefono: string;
  ambiente: string;
  stile: string;
  credito: number;
  codiceCredito: string;
  scadenza: string;
  ritiro: 'negozio' | 'email' | 'whatsapp';
  consensoMarketing: boolean;
  timestamp: string;
  sorgente: 'card-nfc';
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
    console.log('[club-rama] lead (invio simulato)', lead);
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
