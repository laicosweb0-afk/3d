import type { Metadata } from 'next';
import '../brand-font.css';
import './cartone.css';

export const metadata: Metadata = {
  title: 'MediaPro — il cartone (30" verticale)',
  description:
    'Corto promozionale MediaPro: trenta secondi verticali, generati in tempo reale e renderizzati fotogramma per fotogramma.',
  // Pagina di lavorazione: il prodotto finito è il file video, non questa
  // pagina. Non deve finire nei motori di ricerca.
  robots: { index: false, follow: false },
};

export default function CartoneLayout({ children }: { children: React.ReactNode }) {
  return children;
}
