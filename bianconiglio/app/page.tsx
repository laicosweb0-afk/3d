import { Esperienza } from '@/components/Esperienza';

// La pagina non fa niente: tutta la demo vive nel browser, e quello che deve
// restare sul server (le chiavi) vive nelle API routes. Qui c'è solo il punto
// di innesto.

export default function Pagina() {
  return <Esperienza />;
}
