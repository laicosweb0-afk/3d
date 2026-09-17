import type { Config } from 'tailwindcss';

/**
 * I token del sistema. Tutto quello che si ripete nell'interfaccia nasce qui:
 * nei componenti non compaiono valori sciolti, così cambiare un colore o una
 * spaziatura è una riga sola e vale ovunque.
 *
 * Sono gli stessi valori di `club-rama/`, cifra per cifra: crema, oro e il
 * rubino del premio grosso, la scala tipografica di iOS sui font di sistema,
 * gli stessi raggi e le stesse ombre. Club Aurea è l'altro mondo, non un
 * altro design: quello che cambia è il gioco dentro, non il vestito.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        crema: '#F5F3EE',      // sfondo
        superficie: '#FBFAF7', // card e campi
        ink: '#1D1D1F',        // testo principale
        'ink-soft': '#86868B', // testo secondario
        linea: '#E5E1D8',      // separatori
        oro: {
          chiaro: '#E8CD86',
          DEFAULT: '#C9A54E',
          scuro: '#8C6E27',
        },
        // Il premio grosso. Non un rosso da insegna: un rubino profondo, che
        // accanto all'oro e al quasi nero sta senza urlare.
        rubino: {
          chiaro: '#A8383A',
          DEFAULT: '#8A2B2E',
          scuro: '#5E1C1F',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"',
          'Inter', 'system-ui', 'sans-serif',
        ],
      },
      // Scala tipografica iOS: dimensione / interlinea / crenatura.
      fontSize: {
        largeTitle: ['34px', { lineHeight: '41px', letterSpacing: '-0.02em', fontWeight: '700' }],
        title: ['28px', { lineHeight: '34px', letterSpacing: '-0.02em', fontWeight: '700' }],
        headline: ['17px', { lineHeight: '22px', letterSpacing: '-0.01em', fontWeight: '600' }],
        body: ['17px', { lineHeight: '22px', letterSpacing: '-0.01em' }],
        callout: ['16px', { lineHeight: '21px', letterSpacing: '-0.01em' }],
        footnote: ['13px', { lineHeight: '18px' }],
        credito: ['104px', { lineHeight: '1', letterSpacing: '-0.045em', fontWeight: '700' }],
      },
      borderRadius: {
        campo: '14px',
        card: '18px',
        pill: '999px',
      },
      boxShadow: {
        // Ombre larghe e appena percettibili: mai un grigio duro sotto un bordo.
        card: '0 1px 2px rgba(29,29,31,.04), 0 8px 24px -12px rgba(29,29,31,.10)',
        rilievo: '0 2px 6px rgba(29,29,31,.06), 0 20px 50px -20px rgba(29,29,31,.22)',
        moneta: '0 10px 30px -8px rgba(140,110,39,.45), inset 0 0 0 1px rgba(255,255,255,.5)',
      },
      spacing: { safe: 'env(safe-area-inset-bottom)' },
    },
  },
  plugins: [],
} satisfies Config;
