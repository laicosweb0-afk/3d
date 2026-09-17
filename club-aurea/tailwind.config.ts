import type { Config } from 'tailwindcss';

/**
 * I token del sistema. Tutto quello che si ripete nell'interfaccia nasce qui:
 * nei componenti non compaiono valori sciolti, così cambiare un colore o una
 * spaziatura è una riga sola e vale ovunque.
 *
 * La tavolozza è quella del mondo Woman / Aurea: magenta, nero e luce, con
 * l'oro tenuto da parte per il metallo — la moneta del credito e lo spicchio
 * grosso della ruota. Il fondo non è il crema di Club Rama ma una cipria
 * appena rosata: stessa luce, un'altra pelle.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cipria: '#F6F0F2',     // sfondo
        superficie: '#FFFBFC', // card e campi
        ink: '#1A0E13',        // testo principale
        'ink-soft': '#8B7A81', // testo secondario
        linea: '#EADFE3',      // separatori
        notte: '#0C0709',      // il nero della tessera
        magenta: {
          chiaro: '#F48FC0',
          DEFAULT: '#E0559B',
          scuro: '#A32E6B',
        },
        oro: {
          chiaro: '#F0DCAE',
          DEFAULT: '#C9A54E',
          scuro: '#8C6E27',
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
        card: '0 1px 2px rgba(26,14,19,.04), 0 8px 24px -12px rgba(26,14,19,.10)',
        rilievo: '0 2px 6px rgba(26,14,19,.06), 0 20px 50px -20px rgba(26,14,19,.22)',
        moneta: '0 10px 30px -8px rgba(140,110,39,.45), inset 0 0 0 1px rgba(255,255,255,.5)',
      },
      spacing: { safe: 'env(safe-area-inset-bottom)' },
    },
  },
  plugins: [],
} satisfies Config;
