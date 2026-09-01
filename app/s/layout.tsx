import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { copy } from '@/content/quiz/copy';
import './colors.css';
import './quiz.css';

const serif = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--fx-font-serif',
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
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
  themeColor: '#0F0E12',
};

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return <div className={`fx-stage ${serif.variable} ${sans.variable}`}>{children}</div>;
}
