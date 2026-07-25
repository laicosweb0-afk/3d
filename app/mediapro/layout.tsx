import type { Metadata } from 'next';
import './mediapro.css';

const TITLE = 'MediaPro — Creiamo contenuti che trasformano i brand in esperienze';
const DESCRIPTION =
  'Studio creativo indipendente: content creation, video production, social media, web design e advertising per brand che vogliono farsi ricordare.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // Finché i progetti in vetrina sono segnaposto, la pagina non va indicizzata.
  // Da togliere quando entrano i lavori veri.
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
