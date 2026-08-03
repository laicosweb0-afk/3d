import type { Metadata } from 'next';
import './bufala-font.css';
import './bufala.css';
import { company, indirizzoPuntoVendita } from '@/content/bufala/company';

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
  email: company.email,
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
    <div className="bufala">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </div>
  );
}
