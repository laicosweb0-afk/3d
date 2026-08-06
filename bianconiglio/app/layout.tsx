import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Jost } from 'next/font/google';
import './globals.css';

// Le due famiglie del biglietto (§2.2): un serif ad alto contrasto per i titoli,
// un sans leggero per tutto il resto. `next/font` le scarica in fase di build e
// le serve dal nostro dominio: nessuna chiamata a Google dal browser del
// cliente, e nessun salto di font al primo caricamento.
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const jost = Jost({
  subsets: ['latin'],
  weight: ['300', '400'],
  variable: '--font-jost',
  display: 'swap',
});

export const metadata: Metadata = {
  // Neutro di proposito: il titolo compare nella linguetta del browser e nelle
  // anteprime dei link, e non deve raccontare niente in anticipo.
  title: 'Continua.',
  description: 'Il prossimo passo è una tua scelta.',
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  themeColor: '#0E0B0D',
  // Nessun ridimensionamento imposto: chi ha bisogno di ingrandire deve poterlo
  // fare. Il layout regge lo zoom perché è tutto in unità relative.
  width: 'device-width',
  initialScale: 1,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${cormorant.variable} ${jost.variable}`}>
      <body>{children}</body>
    </html>
  );
}
