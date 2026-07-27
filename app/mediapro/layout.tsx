import type { Metadata } from 'next';
import './mediapro.css';

const TITLE = 'MediaPro — Creiamo contenuti che trasformano i brand in esperienze';
const DESCRIPTION =
  'Studio creativo indipendente: content creation, video production, social media, web design e advertising per brand che vogliono farsi ricordare.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // Sul sito non c'è più niente di inventato: progetti reali, nessuna
  // statistica gonfiata, e il numero business al posto dei recapiti segnaposto.
  // Il noindex resta per scelta, non per difetto — i lavori veri non sono
  // ancora dentro, e una pagina finisce in cache sui motori molto prima di
  // quanto ne esca. È una riga sola da togliere quando si vuole essere trovati.
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
