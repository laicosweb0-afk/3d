import type { Azione, Fase, Priorita } from './tipi';
import { fase as descriviFase } from './fasi';
import { IMPOSTAZIONI_PREDEFINITE, type Soglie } from './impostazioni';

// Quanto urge un contatto. Tre livelli, non venti: urgente = oggi, da fare =
// questa settimana, normale = tutto il resto.
//
// Le soglie non stanno più qui dentro: arrivano dalle impostazioni, che il
// titolare cambia da solo. Questa funzione resta pura — stesse soglie, stessi
// dati, stessa risposta — e per questo la versione demo e quella su Postgres
// non possono dare due numeri diversi.

export const SOGLIE_PREDEFINITE: Soglie = IMPOSTAZIONI_PREDEFINITE.soglie;

const giorniDaAdesso = (iso: string) =>
  Math.floor((new Date(iso).getTime() - Date.now()) / 86_400_000);

export function calcolaPriorita(
  dati: {
    fase: Fase;
    prossimaAzione: Azione | null;
    valore: number;
    giorniDiSilenzio: number;
  },
  soglie: Soglie = SOGLIE_PREDEFINITE,
): Priorita {
  const { fase, prossimaAzione, valore, giorniDiSilenzio } = dati;

  // Chi è fuori dal percorso non urge mai.
  if (descriviFase(fase).chiusa) return 'normale';

  // Senza una prossima azione è il caso peggiore: nessuno se ne sta occupando.
  if (!prossimaAzione) return valore >= soglie.valoreAlto ? 'urgente' : 'da_fare';

  // L'azione dichiarata urgente resta urgente.
  if (prossimaAzione.priorita === 'urgente') return 'urgente';

  const giorni = giorniDaAdesso(prossimaAzione.scadenza);
  if (giorni <= soglie.ritardoUrgente) return 'urgente';

  if (giorniDiSilenzio >= soglie.silenzioGrave) return 'urgente';

  // Qui sta la differenza fra un CRM utile e uno che grida sempre: se tutto è
  // urgente, niente lo è. Una cosa in scadenza fra due giorni è «da fare»,
  // anche se vale molto — il valore conta nell'ordinamento, non nel colore.
  if (giorni <= soglie.giorniDaFare) return 'da_fare';

  if (giorniDiSilenzio >= soglie.silenzioLungo) return 'da_fare';

  return 'normale';
}

export const ORDINE_PRIORITA: Record<Priorita, number> = { urgente: 0, da_fare: 1, normale: 2 };
