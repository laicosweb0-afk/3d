import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Schibsted_Grotesk } from 'next/font/google';
import './globals.css';
import { Navigazione } from './navigazione';
import { deposito, modoDati } from '@/lib/dati';
import { attenzioni as calcolaAttenzioni, daFare } from '@/lib/dati/istantanea';

const ui = Schibsted_Grotesk({ subsets: ['latin'], display: 'swap', variable: '--font-ui' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], display: 'swap', variable: '--font-mono' });

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
    <html lang="it" className={`${ui.variable} ${mono.variable}`}>
      <body>
        {modoDati() === 'demo' && (
          <div className="striscia-demo">
            <strong>Modalità dimostrativa</strong> — dati di esempio, tutto funziona davvero ma niente è reale.
            Con le chiavi di Supabase il CRM passa ai dati veri da solo.
            {/* Online la memoria è quella del server, e il server va a dormire:
                dirlo è l'unico modo perché una modifica che sparisce sembri
                quello che è — la demo, non un difetto del CRM. */}
            {process.env.VERCEL && (
              <> <strong>Qui online</strong> le modifiche restano finché il server è sveglio: dopo qualche
                minuto di inattività i dati di esempio tornano come erano. Con Supabase collegato non succede.</>
            )}
          </div>
        )}
        <Navigazione urgenti={urgenti} attenzioni={quanteAttenzioni} />
        <div className="guscio">{children}</div>
      </body>
    </html>
  );
}
