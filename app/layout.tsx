import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mondial Service — Ristrutturazioni, Impianti, Servizi',
  description:
    'Trasformiamo spazi in case da vivere. Ristrutturazioni complete, impianti e bagni chiavi in mano: assisti alla trasformazione di uno spazio reale, in un unico piano sequenza.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
