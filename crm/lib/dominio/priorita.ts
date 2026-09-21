import type { Azione, Fase, Priorita } from './tipi';
import { fase as descriviFase } from './fasi';

// Quanto urge un contatto. Tre livelli, non venti: urgente = oggi, da fare =
// questa settimana, normale = tutto il resto.
//
// Le soglie stanno qui sopra apposta: cambiarle è cambiare una riga, non
// riscrivere un algoritmo.

export const SOGLIE = {
  // Un'azione in ritardo di tanti giorni diventa urgente anche se vale poco.
  ritardoUrgente: 0,        // scaduta o in scadenza oggi
  giorniDaFare: 3,          // entro tre giorni: da fare
  valoreAlto: 3000,         // sopra questa cifra si alza di un livello
  silenzioLungo: 7,         // giorni senza sentirsi: si alza di un livello
  silenzioGrave: 14,        // giorni senza sentirsi in trattativa: urgente
};

const giorniDaAdesso = (iso: string) =>
  Math.floor((new Date(iso).getTime() - Date.now()) / 86_400_000);

export function calcolaPriorita(dati: {
  fase: Fase;
  prossimaAzione: Azione | null;
  valore: number;
  giorniDiSilenzio: number;
}): Priorita {
  const { fase, prossimaAzione, valore, giorniDiSilenzio } = dati;

  // Chi è fuori dal percorso non urge mai.
  if (descriviFase(fase).chiusa) return 'normale';

  // Senza una prossima azione è il caso peggiore: nessuno se ne sta occupando.
  if (!prossimaAzione) return valore >= SOGLIE.valoreAlto ? 'urgente' : 'da_fare';

  // L'azione dichiarata urgente resta urgente.
  if (prossimaAzione.priorita === 'urgente') return 'urgente';

  const giorni = giorniDaAdesso(prossimaAzione.scadenza);
  if (giorni <= SOGLIE.ritardoUrgente) return 'urgente';

  if (giorniDiSilenzio >= SOGLIE.silenzioGrave) return 'urgente';

  // Qui sta la differenza fra un CRM utile e uno che grida sempre: se tutto è
  // urgente, niente lo è. Una cosa in scadenza fra due giorni è «da fare»,
  // anche se vale molto — il valore conta nell'ordinamento, non nel colore.
  if (giorni <= SOGLIE.giorniDaFare) return 'da_fare';

  if (giorniDiSilenzio >= SOGLIE.silenzioLungo) return 'da_fare';

  return 'normale';
}

export const ORDINE_PRIORITA: Record<Priorita, number> = { urgente: 0, da_fare: 1, normale: 2 };
