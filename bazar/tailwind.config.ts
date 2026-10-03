import type { Config } from 'tailwindcss';

/**
 * Il sistema vero sta in `src/index.css`, con i colori campionati dalle
 * locandine del negozio. Tailwind serve solo per le poche utilità di
 * impaginazione usate nelle schermate.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
