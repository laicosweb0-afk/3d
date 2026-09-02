import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { copy } from '@/content/quiz/copy';
import './colors.css';
import './quiz.css';

// Sans dominante: tutta la UI è Inter. Il serif esiste solo come
// dettaglio editoriale (il «?» della fialetta, i nomi delle fragranze).
const sans = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--fx-font-sans',
  display: 'swap',
});

const serif = Playfair_Display({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--fx-font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: copy.meta.title,
  description: copy.meta.description,
  robots: { index: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F3ECE0',
};

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return <div className={`fx-stage ${sans.variable} ${serif.variable}`}>{children}</div>;
}
