// Quello che arriva da /api/lead viene da una pagina pubblica: si accetta solo
// ciò che la card può davvero produrre. Le liste combaciano con le scelte di
// public/club/index.html — se lì si aggiunge una risposta, va aggiunta qui.

export const PROGETTI = ['Bagno', 'Cucina', 'Salotto', 'Casa intera'] as const;
export const STILI = ['Minimal', 'Classico'] as const;
export const CONSEGNE = ['Negozio', 'Email'] as const;

export type Progetto = (typeof PROGETTI)[number];
export type Stile = (typeof STILI)[number];
export type Consegna = (typeof CONSEGNE)[number];

export type LeadValido = {
  nome: string;
  email: string;
  consenso: boolean;
  progetto: Progetto;
  stile: Stile;
  consegna: Consegna;
  clientToken: string | null;
};

export type EsitoValidazione =
  | { ok: true; lead: LeadValido }
  | { ok: false; motivo: string };

// Volutamente permissiva: serve a fermare gli errori di battitura, non a
// decidere se una casella esiste. Quello lo dice solo l'invio.
const FORMA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function testo(valore: unknown, max: number): string {
  return typeof valore === 'string' ? valore.trim().slice(0, max) : '';
}

export function validaLead(corpo: unknown): EsitoValidazione {
  if (typeof corpo !== 'object' || corpo === null) return { ok: false, motivo: 'corpo assente' };
  const dati = corpo as Record<string, unknown>;

  // Campo trappola: invisibile nella pagina, lo riempiono solo i robot.
  if (testo(dati.hp, 200) !== '') return { ok: false, motivo: 'honeypot' };

  const nome = testo(dati.nome, 120);
  if (nome.length < 2) return { ok: false, motivo: 'nome' };

  const email = testo(dati.email, 200).toLowerCase();
  if (!FORMA_EMAIL.test(email)) return { ok: false, motivo: 'email' };

  const progetto = testo(dati.progetto, 40) as Progetto;
  if (!PROGETTI.includes(progetto)) return { ok: false, motivo: 'progetto' };

  const stile = testo(dati.stile, 40) as Stile;
  if (!STILI.includes(stile)) return { ok: false, motivo: 'stile' };

  const consegna = testo(dati.consegna, 40) as Consegna;
  if (!CONSEGNE.includes(consegna)) return { ok: false, motivo: 'consegna' };

  const clientToken = testo(dati.client_token, 80) || null;

  return {
    ok: true,
    lead: { nome, email, consenso: dati.consenso === true, progetto, stile, consegna, clientToken },
  };
}
