import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

/**
 * Niente framer-motion: qui non lo usa più nessuno.
 *
 * Su Woman serviva un `MotionConfig reducedMotion="user"` che spegneva in un
 * colpo solo le molle della libreria. In questa card tutto il movimento è
 * CSS, e `prefers-reduced-motion` lo gestiscono la regola globale in fondo a
 * `index.css` e i tre componenti che hanno un comportamento proprio —
 * l'apertura, la ruota e il conteggio del credito. Tenere la libreria solo
 * per un contenitore che non configura più niente voleva dire spedire un
 * pacchetto a ogni cliente per nulla.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
