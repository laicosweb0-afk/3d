/**
 * Il marchio, com'è sul biglietto da visita: BAZAR in crema, molto spaziato;
 * sotto, il filo d'oro che sfuma ai due capi; poi MARRAKECH in oro. Con
 * `esteso` aggiunge la riga del fronte del biglietto, SHOWROOM ARREDAMENTO ·
 * LUGO.
 *
 * È ricostruito in tipografia con lo stesso carattere (Poppins) e i colori
 * campionati dal biglietto, così resta nitido a ogni misura. Se arriva il
 * file vettoriale, si sostituisce questo componente e nient'altro.
 */
export function BazarLogo({
  size = 17, esteso = false, composto = false, title,
}: {
  size?: number;
  esteso?: boolean;
  /** Si compone pezzo per pezzo, come nell'apertura. */
  composto?: boolean;
  title?: string;
}) {
  return (
    <span
      className={composto ? 'marchio marchio-composto' : 'marchio'}
      style={{ fontSize: size }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <span className="marchio-bazar">BAZAR</span>
      <span className="filo" />
      <span className="marchio-sotto">MARRAKECH</span>
      {esteso && <span className="marchio-riga">SHOWROOM ARREDAMENTO · LUGO</span>}
    </span>
  );
}
