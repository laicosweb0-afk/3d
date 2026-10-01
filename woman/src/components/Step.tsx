import type { ReactNode } from 'react';
import { WomanLogo } from './WomanLogo';

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
  scuro = false, children, bottom, className,
}: {
  scuro?: boolean;
  children: ReactNode;
  bottom?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`step ${className ?? ''}`} data-bg={scuro ? 'dark' : undefined}>
      <div className="step-top">
        <WomanLogo size={17} variante={scuro ? 'chiaro' : 'scuro'} title="Woman Parfume Store" />
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
