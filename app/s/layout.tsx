import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { copy } from '@/content/quiz/copy';
import './colors.css';
import './quiz.css';

// Solo Inter: niente serif da nessuna parte.
const sans = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--fx-font-sans',
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
  themeColor: '#0B0A0E',
};

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return <div className={`fx-stage ${sans.variable}`}>{children}</div>;
}
