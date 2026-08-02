// Copy del viaggio. Testi provvisori: la struttura è quella definitiva
// (SCALETTA_BUFALA.md), le parole vanno riviste col cliente prima del lancio.
// Regola di scrittura (Direzione §4): affermazioni brevi, nessuna
// spiegazione, nessun claim commerciale, nessun riferimento geografico.

import type { SceneId } from '@/lib/bufala/scenes';

export interface SceneCopy {
  /** Titolo grande in Canela. Poche parole: 6-8 al massimo per riga. */
  titolo: string;
  /** Riga di accompagnamento, opzionale. Neue Haas, corpo piccolo. */
  nota?: string;
}

export const sceneCopy: Record<SceneId, SceneCopy> = {
  s01: {
    titolo: 'Prima che\nabbia un nome',
    nota: 'Scorri',
  },
  s02: {
    titolo: 'Una forma sola',
    nota: 'Nessuno stampo la ripete uguale',
  },
  s03: {
    titolo: 'La pelle trattiene\nla luce',
  },
  s04: {
    titolo: 'Pesa quanto\nsembra fragile',
  },
  s05: {
    titolo: 'Il dentro',
    nota: 'È qui che si capisce',
  },
  s06: {
    titolo: 'Si misura in ore',
    nota: 'Non in giorni',
  },
  s07: {
    titolo: 'Non è sola',
  },
  s08: {
    titolo: 'Quelli della bufala',
  },
};

/** Titoli delle sezioni dopo il viaggio. */
export const sezioni = {
  banco: {
    titolo: 'Il banco',
    testo:
      'Il punto vendita è aperto a grossisti e privati, senza distinzione: si entra, si guarda, si chiede.',
  },
  prodotti: {
    titolo: 'I prodotti',
    // ⚠️ Elenco reale ancora da farsi dare dal cliente (SCALETTA §5).
    // Finché non arriva, la sezione non elenca nulla di inventato.
    testo: null as string | null,
  },
  dove: {
    titolo: 'Dove siamo',
  },
  contatti: {
    titolo: 'Contatti',
  },
} as const;
