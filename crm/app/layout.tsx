import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Barra } from './barra';

export const metadata: Metadata = {
  title: 'CRM Rama Ceramiche',
  description: 'Contatti, credito Club Rama e promemoria dello showroom.',
  // Gestionale interno: fuori dai motori di ricerca.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#F5F5F3',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <Barra />
        <div className="guscio">{children}</div>
      </body>
    </html>
  );
}
