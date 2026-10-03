/**
 * Il marchio: il tondo di Car.G, ritagliato dal file che ci hanno passato.
 *
 * È un badge circolare, quindi un ritaglio tondo con lo sfondo trasparente è
 * esattamente la forma giusta — sta pulito sia sul chiaro che sullo scuro, e
 * non serve una seconda versione come su Woman.
 *
 * Due file per non far scaricare 113 KB quando ne bastano 27: il piccolo
 * sopra le schermate, il grande quando il marchio è il soggetto.
 *
 * ⚠️ Sono ritagliati da una foto del logo, non dall'originale. Quando arriva
 * il file vero (PNG trasparente o, meglio, vettoriale) si sostituiscono
 * questi due e non si tocca nient'altro.
 */
export function CargLogo({
  size = 30, title, grande = false,
}: {
  size?: number;
  title?: string;
  grande?: boolean;
}) {
  const file = grande ? 'logo.png' : 'logo-piccolo.png';
  return (
    <img
      src={import.meta.env.BASE_URL + file}
      alt={title ?? ''}
      aria-hidden={title ? undefined : true}
      style={{ height: size, width: size, display: 'block' }}
    />
  );
}
