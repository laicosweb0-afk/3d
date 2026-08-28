'use client';

// Il joystick virtuale: la "palla" a destra dello schermo si trascina col
// mouse o col dito e comanda come le frecce, con accanto i pulsanti E e
// FRENO. Robustezza prima di tutto: pointer capture sul pad, un solo
// puntatore ascoltato per controllo, reset totale al rilascio, alla
// perdita della capture, al blur della finestra e al cambio di scheda.

import { useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { stick, resetStick } from '@/lib/lugo/stick';
import { useLugo } from '@/lib/lugo/store';

const CORSA = 46; // px di corsa massima della palla dal centro

export function Joystick() {
  const fase = useLugo((s) => s.fase);
  const mode = useLugo((s) => s.mode);
  const base = useRef<HTMLDivElement>(null);
  const palla = useRef<HTMLDivElement>(null);
  const puntatore = useRef<number | null>(null);

  // salendo o scendendo dall'auto il pulsante cambia (FRENO ↔ CORRI): se
  // era premuto, il tasto vecchio resterebbe incollato
  useEffect(() => {
    stick.freno = false;
    stick.corriBtn = false;
    stick.pugnoBtn = false;
  }, [mode]);

  // qualunque uscita dalla finestra molla tutto: mai comandi "incollati"
  useEffect(() => {
    const molla = () => {
      puntatore.current = null;
      resetStick();
      stick.freno = false;
      stick.corriBtn = false;
      stick.pugnoBtn = false;
      stick.interagisci = false;
      if (palla.current) palla.current.style.transform = 'translate(0px, 0px)';
    };
    window.addEventListener('blur', molla);
    document.addEventListener('visibilitychange', molla);
    return () => {
      window.removeEventListener('blur', molla);
      document.removeEventListener('visibilitychange', molla);
      molla();
    };
  }, []);

  if (fase !== 'gioco') return null;

  const aggiorna = (e: ReactPointerEvent) => {
    const el = base.current;
    const k = palla.current;
    if (!el || !k) return;
    const r = el.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > CORSA) {
      dx = (dx / d) * CORSA;
      dy = (dy / d) * CORSA;
    }
    k.style.transform = `translate(${dx}px, ${dy}px)`;
    stick.attivo = true;
    stick.x = dx / CORSA;
    stick.y = dy / CORSA;
  };

  const molla = () => {
    puntatore.current = null;
    resetStick();
    if (palla.current) palla.current.style.transform = 'translate(0px, 0px)';
  };

  const giu = (e: ReactPointerEvent) => {
    if (puntatore.current !== null) return; // un solo puntatore comanda
    puntatore.current = e.pointerId;
    try {
      base.current?.setPointerCapture(e.pointerId);
    } catch {
      // capture non disponibile: si va avanti lo stesso coi move sul pad
    }
    aggiorna(e);
  };

  const premi =
    (campo: 'freno' | 'corriBtn' | 'pugnoBtn' | 'interagisci', valore: boolean) => (e: ReactPointerEvent) => {
      if (valore) {
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          // senza capture il rilascio arriva comunque da pointerleave
        }
      }
      stick[campo] = valore;
    };

  return (
    <div className="lugo-comandi" data-hud="joystick" onContextMenu={(e) => e.preventDefault()}>
      <div className="lugo-pulsanti">
        <button
          type="button"
          className="lugo-pulsante"
          aria-label="Sali o scendi dall'auto"
          onPointerDown={premi('interagisci', true)}
          onPointerUp={premi('interagisci', false)}
          onPointerCancel={premi('interagisci', false)}
          onLostPointerCapture={() => (stick.interagisci = false)}
        >
          E
        </button>
        {mode === 'auto' ? (
          <button
            type="button"
            className="lugo-pulsante"
            aria-label="Freno a mano"
            onPointerDown={premi('freno', true)}
            onPointerUp={premi('freno', false)}
            onPointerCancel={premi('freno', false)}
            onLostPointerCapture={() => (stick.freno = false)}
          >
            FRENO
          </button>
        ) : (
          <>
            <button
              type="button"
              className="lugo-pulsante"
              aria-label="Corri"
              onPointerDown={premi('corriBtn', true)}
              onPointerUp={premi('corriBtn', false)}
              onPointerCancel={premi('corriBtn', false)}
              onLostPointerCapture={() => (stick.corriBtn = false)}
            >
              CORRI
            </button>
            <button
              type="button"
              className="lugo-pulsante lugo-pulsante-pugno"
              aria-label="Colpisci"
              onPointerDown={premi('pugnoBtn', true)}
              onPointerUp={premi('pugnoBtn', false)}
              onPointerCancel={premi('pugnoBtn', false)}
              onLostPointerCapture={() => (stick.pugnoBtn = false)}
            >
              ✊
            </button>
          </>
        )}
      </div>
      <div
        ref={base}
        className="lugo-joystick"
        data-hud="joystick-pad"
        onPointerDown={giu}
        onPointerMove={(e) => {
          if (e.pointerId === puntatore.current) aggiorna(e);
        }}
        onPointerUp={(e) => {
          if (e.pointerId === puntatore.current) molla();
        }}
        onPointerCancel={(e) => {
          if (e.pointerId === puntatore.current) molla();
        }}
        onLostPointerCapture={molla}
      >
        <span className="lugo-freccia fu">▲</span>
        <span className="lugo-freccia fg">▲</span>
        <span className="lugo-freccia fs">▲</span>
        <span className="lugo-freccia fd">▲</span>
        <div ref={palla} className="lugo-joystick-palla" data-hud="joystick-palla" />
      </div>
    </div>
  );
}
