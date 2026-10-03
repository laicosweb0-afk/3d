import type { Config } from 'tailwindcss';

/**
 * I token del sistema, campionati dal documento strategico «The Fragrance
 * Experience» — non scelti a occhio: crema, magenta e inchiostro sono i
 * valori letti dal PDF, e i grigi sono i tre che il documento usa per i testi
 * secondari.
 *
 * L'impianto — scala tipografica di iOS, raggi, ombre — resta quello di
 * `club-rama/`, che è già stato approvato su un'altra card e funziona sul
 * telefono. Quello che cambia è il colore: dove là c'era l'oro, qui c'è il
 * magenta di Woman.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Il crema del documento è più caldo di quello di Rama: tira alla
        // sabbia, non al grigio.
        crema: '#FAF3E9',      // sfondo
        superficie: '#FFFCF7', // card e campi
        sabbia: '#E9DDCD',     // il fondo più profondo della copertina
        ink: '#1A171C',        // inchiostro: nero appena virato al viola
        'ink-soft': '#6B635C', // testo secondario
        'ink-tenue': '#8D857E',
        linea: '#E3D9CC',      // separatori
        magenta: {
          chiaro: '#D5799A',
          DEFAULT: '#BD3A66',
          scuro: '#8E2649',
          pieno: '#B94276',    // il rosa della busta
        },
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"',
          'Inter', 'system-ui', 'sans-serif',
        ],
        // I titoli del documento sono in serif: qui si prende quello di
        // sistema, che su iPhone è New York e su Android Noto Serif. Nessun
        // font da scaricare — la pagina si apre in negozio, con una riga di
        // rete, e un carattere che tarda è un titolo che balla.
        serif: ['"New York"', 'Charter', '"Bitstream Charter"', 'Georgia', 'Cambria', 'serif'],
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
        // Il kicker del documento: minuscolo, maiuscolo, spaziatissimo.
        kicker: ['11px', { lineHeight: '14px', letterSpacing: '0.18em', fontWeight: '600' }],
      },
      borderRadius: {
        campo: '14px',
        card: '18px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(26,23,28,.04), 0 8px 24px -12px rgba(26,23,28,.10)',
        rilievo: '0 2px 6px rgba(26,23,28,.06), 0 20px 50px -20px rgba(26,23,28,.22)',
        moneta: '0 10px 30px -8px rgba(189,58,102,.42), inset 0 0 0 1px rgba(255,255,255,.5)',
      },
      spacing: { safe: 'env(safe-area-inset-bottom)' },
    },
  },
  plugins: [],
} satisfies Config;
