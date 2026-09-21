// Date e testi come li legge chi sta in negozio: italiano, fuso di Roma,
// niente ISO in faccia all'utente.

const FUSO = 'Europe/Rome';

export function dataOra(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: FUSO,
  });
}

export function soloData(iso: string | null): string {
  if (!iso) return '—';
  const quando = iso.length === 10 ? new Date(`${iso}T12:00:00Z`) : new Date(iso);
  return quando.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: FUSO,
  });
}

// "oggi", "ieri", "fra 3 giorni": nella lista delle cose da fare conta la
// distanza, non la data esatta.
export function quando(iso: string): string {
  const giorni = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (giorni <= -2) return `${Math.abs(giorni)} giorni fa`;
  if (giorni === -1) return 'ieri';
  if (giorni === 0) return 'oggi';
  if (giorni === 1) return 'domani';
  return `fra ${giorni} giorni`;
}

export function inRitardo(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

// "oggi", "ieri", "3 giorni fa": al singolare e al plurale come si deve.
export function daQuanto(giorni: number): string {
  if (giorni <= 0) return 'oggi';
  if (giorni === 1) return 'ieri';
  return `${giorni} giorni fa`;
}

// Il campo <input type="datetime-local"> manda un orario senza fuso
// ("2026-09-16T14:30"). Il server sta in UTC: letto così com'è, un richiamo
// fissato alle 14:30 finirebbe alle 16:30. Qui lo si legge come ora di Roma.
export function daOrarioItaliano(valore: string): string {
  const conSecondi = valore.length === 16 ? `${valore}:00` : valore;
  const comeSeFosseUtc = new Date(`${conSecondi}Z`);
  if (Number.isNaN(comeSeFosseUtc.getTime())) return new Date().toISOString();
  const aRoma = new Date(comeSeFosseUtc.toLocaleString('en-US', { timeZone: FUSO }));
  const aGreenwich = new Date(comeSeFosseUtc.toLocaleString('en-US', { timeZone: 'UTC' }));
  return new Date(comeSeFosseUtc.getTime() - (aRoma.getTime() - aGreenwich.getTime())).toISOString();
}

// Una riga CSV che regge virgole, virgolette e a capo.
export function rigaCsv(valori: (string | number | boolean | null)[]): string {
  return valori
    .map((valore) => {
      const testo = valore === null || valore === undefined ? '' : String(valore);
      return /[",\n;]/.test(testo) ? `"${testo.replace(/"/g, '""')}"` : testo;
    })
    .join(';');
}
