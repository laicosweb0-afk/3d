import type { Metadata } from 'next';
import './lugo.css';

const TITLE = 'LUGO — un open world romagnolo';
const DESCRIPTION =
  'Guida e cammina per la vera Lugo di Ravenna: il Pavaglione, la Rocca Estense, le vie del centro. Un mini open world nel browser.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: false, follow: false },
  openGraph: { title: TITLE, description: DESCRIPTION, locale: 'it_IT', type: 'website' },
};

export default function LugoLayout({ children }: { children: React.ReactNode }) {
  return <div className="lugo-pagina">{children}</div>;
}
