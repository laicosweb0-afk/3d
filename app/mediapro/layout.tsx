import type { Metadata } from 'next';
import './mediapro.css';

const TITLE = 'MediaPro — Creiamo contenuti che trasformano i brand in esperienze';
const DESCRIPTION =
  'Studio creativo indipendente: content creation, video production, social media, web design e advertising per brand che vogliono farsi ricordare.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // I progetti ora sono reali e le statistiche inventate sono state rimosse.
  // Resta un solo motivo per non indicizzare: i recapiti in content.ts sono
  // ancora segnaposto. Appena arrivano quelli veri, questa riga si toglie.
  robots: { index: false, follow: false },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    locale: 'it_IT',
  },
};

export default function MediaProLayout({ children }: { children: React.ReactNode }) {
  return children;
}
