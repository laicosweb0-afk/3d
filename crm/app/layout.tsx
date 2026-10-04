import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navigazione } from './navigazione';
import { OsservaScorrimento, ZonaAnnulla } from './interattivi';
import { deposito, modoDati } from '@/lib/dati';
import { attenzioni as calcolaAttenzioni, daFare } from '@/lib/dati/istantanea';

// Il font è quello del telefono di chi lo usa: su iPhone SF Pro, su Android
// Roboto. Non si scarica niente prima di vedere la prima riga, e il CRM si
// legge come si legge il resto del sistema. Lo stack sta in globals.css
// dentro --font-sistema.

export const metadata: Metadata = {
  title: 'CRM Rama Ceramiche',
  description: 'Cabina di regia commerciale dello showroom di Lugo.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#070a14',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Il numero sulle voci di menu non è un vezzo: è la ragione per cui uno
  // apre il CRM. Si calcola qui una volta per tutte le pagine.
  let urgenti = 0;
  let quanteAttenzioni = 0;
  try {
    const dati = await (await deposito()).istantanea();
    urgenti = daFare(dati, 0).length;
    quanteAttenzioni = calcolaAttenzioni(dati).reduce((s, a) => s + a.conteggio, 0);
  } catch {
    // Senza configurazione le pagine lo dicono da sé: la barra resta muta.
  }

  return (
    <html lang="it">
      <body>
        <OsservaScorrimento />
        <Navigazione
          urgenti={urgenti}
          attenzioni={quanteAttenzioni}
          demo={modoDati() === 'demo'}
          demoOnline={Boolean(process.env.VERCEL)}
        />
        <div className="guscio">{children}</div>
        {/* «Fatto ✓ — Annulla»: sta qui e non dentro le liste, perché una
            card dopo un «Fatto» sparisce e porterebbe via il messaggio. */}
        <ZonaAnnulla />
      </body>
    </html>
  );
}
