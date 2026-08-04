import type { Metadata } from 'next';
import { Playfair_Display, Hanken_Grotesk } from 'next/font/google';
import './bufala.css';
import { company, indirizzoPuntoVendita } from '@/content/bufala/company';

// I caratteri scelti sul provino (04/08): Playfair Display per i titoli —
// scelta dell'utente — e Hanken Grotesk per il testo, abbinata qui.
//
// next/font li scarica al build e li serve da noi come file variabili: un
// file per famiglia, precaricato, con il fallback a metrica compensata
// generato in automatico. È ciò che chiede il budget (B7/B8) — prima erano
// incorporati in base64 dentro un CSS da 302 kB che teneva la pagina bianca
// per 2,8 secondi, con ogni peso duplicato per intero.
const carattereTitoli = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--carattere-titoli',
});

const carattereTesto = Hanken_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--carattere-testo',
});

const TITLE = `${company.brand} — Mozzarella di bufala | ${company.puntoVendita.comune}`;
const DESCRIPTION =
  'Mozzarella di bufala e formaggi al banco del Centro Agro Alimentare Riminese. Vendita ingrosso e dettaglio, ingresso libero per grossisti e privati.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // Il sito è in costruzione e il copy non è ancora approvato dal cliente:
  // una pagina finisce in cache sui motori molto prima di quanto ne esca.
  // È una riga sola da togliere al lancio.
  robots: { index: false, follow: false },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    locale: 'it_IT',
    siteName: company.brand,
  },
};

/** Dati strutturati: solo informazioni reali e verificate. */
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Store',
  name: company.brand,
  legalName: company.ragioneSociale,
  telephone: company.telefono,
  address: {
    '@type': 'PostalAddress',
    streetAddress: company.puntoVendita.via,
    postalCode: company.puntoVendita.cap,
    addressLocality: company.puntoVendita.comune,
    addressRegion: company.puntoVendita.provincia,
    addressCountry: 'IT',
  },
  description: `Punto vendita presso ${company.puntoVendita.presso}, ${indirizzoPuntoVendita}.`,
};

export default function BufalaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`bufala ${carattereTitoli.variable} ${carattereTesto.variable}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </div>
  );
}
