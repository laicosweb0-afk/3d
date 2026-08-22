import { Palco } from '@/components/cartone/Palco';

/**
 * La pagina che *è* il video.
 *
 * `?render=1` non cambia l'immagine: cambia solo chi tiene il tempo. In
 * anteprima lo tiene la pagina, in rendering lo tiene
 * `tools/cartone-render.mjs`.
 *
 * Il parametro si legge nel browser e non qui, perché il sito è un export
 * statico (`output: 'export'` in next.config.mjs): non c'è un server che
 * possa leggere la query al momento della richiesta. Il montaggio è quindi
 * rimandato di un fotogramma — vedi `Palco` — che è il prezzo per far
 * nascere il canvas già con le opzioni giuste invece di ricrearlo dopo.
 */
export default function CartonePage() {
  return <Palco />;
}
