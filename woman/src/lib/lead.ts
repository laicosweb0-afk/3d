export type Lead = {
  nome: string;
  email: string;
  telefono: string;
  /** La fragranza ospite di questa edizione, e la maison che la fornisce. */
  fragranza: string;
  maison: string;
  /** Cosa ha sentito: è il dato che vale, e il criterio delle fialette. */
  famiglia: string;
  /** Se ha centrato la famiglia giusta. */
  centrato: boolean;
  /** Il livello raggiunto oggi: naso curioso o naso allenato. */
  livello: string;
  credito: number;
  codiceCredito: string;
  scadenza: string;
  consensoMarketing: boolean;
  timestamp: string;
  sorgente: 'card-nfc';
  club: 'woman';
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
    console.log('[woman] lead (invio simulato)', lead);
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
