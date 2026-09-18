import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import App from './App';
import './index.css';

/**
 * `reducedMotion="user"` vale per tutti i componenti animati in un colpo
 * solo: a chi ha chiesto meno movimento, framer-motion smette di animare
 * trasformazioni e posizioni e lascia passare solo le dissolvenze.
 *
 * Senza questa riga le singole schermate se lo ricordano una per una — la
 * ruota, i coriandoli e il conteggio hanno il loro controllo — ma le molle
 * minori (la tessera che sale, la moneta che si gira, le scritte che
 * scivolano) restano, e sono proprio quelle che in tanti non vogliono.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
);
