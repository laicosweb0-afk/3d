import type { Metadata } from 'next';
import './brand-font.css';
import './globals.css';

const TITLE = 'Mondial Service — Ristrutturazioni, Impianti, Servizi | Mordano (BO)';
const DESCRIPTION =
  'Trasformiamo spazi in case da vivere. Ristrutturazioni complete, impianti e bagni chiavi in mano a Mordano (BO) e dintorni. Garanzia, affidabilità, disponibili 24/7.';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.mondialservicesrl.it'),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/',
    siteName: 'Mondial Service',
    locale: 'it_IT',
    type: 'website',
    images: [{ url: '/assets/foto/soggiorno-1.jpg', width: 1264, height: 848 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/assets/foto/soggiorno-1.jpg'],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Mondial Service Srl',
  telephone: '+393297003558',
  email: 'mmondial.servicee@gmail.com',
  url: 'https://www.mondialservicesrl.it',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Via Giacomo Matteotti, 10',
    postalCode: '40027',
    addressLocality: 'Mordano',
    addressRegion: 'BO',
    addressCountry: 'IT',
  },
  openingHours: 'Mo-Su 00:00-24:00',
  vatID: 'IT03999921208',
  makesOffer: ['Ristrutturazioni', 'Impianti', 'Servizi'].map((s) => ({
    '@type': 'Offer',
    itemOffered: { '@type': 'Service', name: s },
  })),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
