import type { Metadata } from 'next';
import './lugo.css';
import './marchio.css';

const TITLE = 'LUGO CITY — la tua città, il tuo gioco';
const DESCRIPTION =
  'Guida e cammina per la vera Lugo di Ravenna: il Pavaglione, la Rocca Estense, le vie del centro. Missioni, botteghe vere e reputazione, in un open world nel browser.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: false, follow: false },
  openGraph: { title: TITLE, description: DESCRIPTION, locale: 'it_IT', type: 'website' },
};

export default function LugoLayout({ children }: { children: React.ReactNode }) {
  return <div className="lugo-pagina">{children}</div>;
}
