import type { ReactNode } from 'react';
import { BazarLogo } from './BazarLogo';

/**
 * Il contenitore di ogni schermata: marchio in alto, contenuto al centro,
 * azione in fondo, alta quanto lo schermo.
 *
 * Non c'è un'intestazione fissa e non c'è la barra dei passi. È una scelta:
 * l'esperienza dura novanta secondi e si guarda una schermata alla volta —
 * un contatore «2 di 5» darebbe la sensazione di un modulo da compilare, che
 * è esattamente il contrario di quello che stiamo facendo.
 */
export function Step({
  scuro = false, children, bottom, className, sfondo,
}: {
  scuro?: boolean;
  children: ReactNode;
  bottom?: ReactNode;
  className?: string;
  /** Una foto a tutto schermo dietro il testo, velata di nero. */
  sfondo?: string;
}) {
  return (
    // Il fondo è sempre scuro, come il biglietto da visita. `scuro` resta per
    // le schermate che devono pesare di più: lì la luce d'oro sale di più.
    <div className={`step ${className ?? ''}`} data-bg="dark" data-forte={scuro ? 'true' : undefined}>
      {sfondo && <img className="step-sfondo" src={sfondo} alt="" aria-hidden />}
      <div className="step-top">
        <BazarLogo size={11} title="Bazar Marrakech" />
      </div>
      <div className="step-main">{children}</div>
      <div className="step-bottom">{bottom}</div>
    </div>
  );
}

/** La pill di navigazione: contorno, maiuscola, con la freccia. */
export function Cta({
  children, onClick, disabled, piena, type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  piena?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button type={type} className={`cta${piena ? ' cta-fill' : ''}`}
      onClick={onClick} disabled={disabled}>
      {children}
      {!piena && <span aria-hidden>→</span>}
    </button>
  );
}
