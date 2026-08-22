'use client';

import { useEffect, useState } from 'react';
import { Corto } from './Corto';

/**
 * Decide in che modo montare il corto, e lo fa solo nel browser.
 *
 * Serve una cosa sola: sapere se siamo in rendering *prima* che il canvas
 * esista, perché `preserveDrawingBuffer` si può scegliere soltanto alla
 * creazione del contesto WebGL. Leggere la query durante il rendering
 * statico non è possibile, e leggerla dopo l'idratazione produrrebbe due
 * alberi diversi fra server e client — quindi non si monta niente finché
 * non siamo nel browser.
 */
export function Palco() {
  const [modo, setModo] = useState<'attesa' | 'anteprima' | 'rendering'>('attesa');

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setModo(q.get('render') === '1' ? 'rendering' : 'anteprima');
  }, []);

  if (modo === 'attesa') return <main className="ct" />;
  return <Corto perRendering={modo === 'rendering'} />;
}
