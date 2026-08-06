'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ANATOMIA,
  COLORI_OCCHIO,
  COLORE_BOCCA,
  POSA_BASE,
  POSA_BOCCA_APERTA,
} from '@/lib/anatomia';

// Il coniglio.
//
// L'immagine è un PNG fermo: quello che lo rende vivo sta tutto qui sopra —
// due pupille che seguono il dito o il mouse, e una bocca che si apre sul
// volume della voce. Sono elementi posizionati in percentuale sul riquadro
// dell'immagine, quindi restano al loro posto a qualsiasi dimensione.
//
// Tutte le coordinate vengono da `lib/anatomia.ts`: qui non c'è un numero da
// ritoccare quando arriva l'immagine definitiva.

type Proprieta = {
  /** Vero quando il coniglio è sbucato: fa partire l'animazione d'ingresso. */
  arrivato: boolean;
  /** Volume della voce, da 0 a 1. Apre la bocca. */
  livello: number;
  /** Con `?calibra=1` mostra la griglia e i mirini per allineare occhi e bocca. */
  calibra: boolean;
};

/** Quanto lontano deve andare il puntatore perché l'occhio sia a fine corsa. */
const PORTATA = 420;

export function Bianconiglio({ arrivato, livello, calibra }: Proprieta) {
  const riquadroRef = useRef<HTMLDivElement>(null);
  const immagineRef = useRef<HTMLImageElement>(null);
  const [misure, setMisure] = useState({ larghezza: 0, altezza: 0 });
  const [sguardo, setSguardo] = useState({ sx: 0, sy: 0, dx: 0, dy: 0 });
  const [immagineMancante, setImmagineMancante] = useState(false);

  // Se il PNG non c'è, il riquadro resta alto zero e la scena si accartoccia:
  // niente coniglio, niente occhi, niente bocca, e nemmeno il segnaposto che
  // spiega cosa manca. Il solo `onError` di React non basta a intercettarlo,
  // perché il browser comincia a scaricare l'immagine leggendo l'HTML e
  // l'errore può essere già scattato prima che React agganci il gestore: un
  // evento perso non si ripete. Quindi lo stato dell'immagine si controlla
  // anche a mano dopo il montaggio — `complete` con `naturalWidth` a zero è un
  // caricamento finito male.
  useEffect(() => {
    const immagine = immagineRef.current;
    if (!immagine) return;
    const fallita = () => setImmagineMancante(true);
    const verifica = () => {
      if (immagine.complete && immagine.naturalWidth === 0) fallita();
    };
    verifica();
    immagine.addEventListener('error', fallita);
    immagine.addEventListener('load', verifica);
    return () => {
      immagine.removeEventListener('error', fallita);
      immagine.removeEventListener('load', verifica);
    };
  }, []);

  // Le misure reali del riquadro: da qui in poi si ragiona in pixel, così i
  // cerchi restano cerchi anche se l'immagine non è quadrata.
  useEffect(() => {
    const nodo = riquadroRef.current;
    if (!nodo) return;
    const osservatore = new ResizeObserver(([voce]) => {
      const { width, height } = voce.contentRect;
      setMisure({ larghezza: width, altezza: height });
    });
    osservatore.observe(nodo);
    return () => osservatore.disconnect();
  }, []);

  // Lo sguardo. `pointermove` copre sia il mouse sul desktop sia il dito che
  // striscia sul telefono; `pointerdown` fa scattare gli occhi anche su un
  // tocco secco, che altrimenti non genererebbe movimento.
  useEffect(() => {
    if (!arrivato) return;

    function segui(evento: PointerEvent) {
      const nodo = riquadroRef.current;
      if (!nodo) return;
      const riquadro = nodo.getBoundingClientRect();
      if (!riquadro.width) return;

      const corsa = (riquadro.width * ANATOMIA.corsaPupilla) / 100;

      const versoOcchio = (percentualeX: number, percentualeY: number) => {
        const centroX = riquadro.left + (riquadro.width * percentualeX) / 100;
        const centroY = riquadro.top + (riquadro.height * percentualeY) / 100;
        const scartoX = evento.clientX - centroX;
        const scartoY = evento.clientY - centroY;
        const distanza = Math.hypot(scartoX, scartoY) || 1;
        // Oltre la portata l'occhio è già a fine corsa: continuare a muoverlo
        // lo farebbe uscire dall'iride.
        const quanto = Math.min(1, distanza / PORTATA);
        return {
          x: (scartoX / distanza) * quanto * corsa,
          y: (scartoY / distanza) * quanto * corsa,
        };
      };

      const sinistro = versoOcchio(ANATOMIA.occhioSinistro.x, ANATOMIA.occhioSinistro.y);
      const destro = versoOcchio(ANATOMIA.occhioDestro.x, ANATOMIA.occhioDestro.y);
      setSguardo({ sx: sinistro.x, sy: sinistro.y, dx: destro.x, dy: destro.y });
    }

    window.addEventListener('pointermove', segui, { passive: true });
    window.addEventListener('pointerdown', segui, { passive: true });
    return () => {
      window.removeEventListener('pointermove', segui);
      window.removeEventListener('pointerdown', segui);
    };
  }, [arrivato]);

  const larghezza = misure.larghezza;
  const inPixel = (percentuale: number) => (larghezza * percentuale) / 100;

  const diametroIride = inPixel(ANATOMIA.raggioIride * 2);
  const diametroPupilla = inPixel(ANATOMIA.raggioPupilla * 2);

  const bocca = ANATOMIA.bocca;
  const aperturaBocca =
    bocca.altezzaChiusa + (bocca.altezzaAperta - bocca.altezzaChiusa) * Math.min(1, Math.max(0, livello));

  const occhi = [
    { chiave: 'sinistro', punto: ANATOMIA.occhioSinistro, x: sguardo.sx, y: sguardo.sy },
    { chiave: 'destro', punto: ANATOMIA.occhioDestro, x: sguardo.dx, y: sguardo.dy },
  ];

  return (
    <div
      ref={riquadroRef}
      className={`coniglio${arrivato ? ' arrivato' : ''}`}
      style={{ ['--luce-occhio' as string]: COLORI_OCCHIO.luce }}
    >
      {immagineMancante ? (
        <div className="segnaposto">
          <strong>Manca il Bianconiglio.</strong>
          <span>
            Metti il PNG 4K scontornato in
            <br />
            <code>public/bianconiglio.png</code>
          </span>
        </div>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- il PNG è già
              ottimizzato a monte e serve a dimensione piena per lo scontorno. */}
          <img
            ref={immagineRef}
            src={POSA_BASE}
            alt=""
            onError={() => setImmagineMancante(true)}
            draggable={false}
          />

          {/* La seconda posa, se un giorno esiste: la dissolvenza sul volume è
              più bella della bocca disegnata, e la sostituisce del tutto. */}
          {POSA_BOCCA_APERTA && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={POSA_BOCCA_APERTA}
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                inset: 0,
                opacity: Math.min(1, livello * 1.4),
                transition: 'opacity 60ms linear',
              }}
            />
          )}
        </>
      )}

      {/* Occhi e bocca solo quando l'immagine c'è davvero: sul segnaposto
          galleggerebbero nel vuoto. */}
      {!immagineMancante && larghezza > 0 && (
        <>
          {occhi.map((occhio) => (
            <div key={occhio.chiave}>
              <div
                className="occhio"
                style={{
                  left: `${occhio.punto.x}%`,
                  top: `${occhio.punto.y}%`,
                  width: diametroIride,
                  height: diametroIride,
                  background: COLORI_OCCHIO.iride,
                }}
              />
              <div
                className="pupilla"
                style={{
                  left: `${occhio.punto.x}%`,
                  top: `${occhio.punto.y}%`,
                  width: diametroPupilla,
                  height: diametroPupilla,
                  background: COLORI_OCCHIO.pupilla,
                  transform: `translate(calc(-50% + ${occhio.x}px), calc(-50% + ${occhio.y}px))`,
                }}
              />
            </div>
          ))}

          {!POSA_BOCCA_APERTA && (
            <div
              className="bocca"
              style={{
                left: `${bocca.x}%`,
                top: `${bocca.y}%`,
                width: inPixel(bocca.larghezza),
                height: inPixel(aperturaBocca),
                background: COLORE_BOCCA,
              }}
            />
          )}
        </>
      )}

      {calibra && larghezza > 0 && (
        <>
          <div className="griglia" />
          {occhi.map((occhio) => (
            <div
              key={`mirino-${occhio.chiave}`}
              className="mirino"
              style={{
                left: `${occhio.punto.x}%`,
                top: `${occhio.punto.y}%`,
                width: diametroIride,
                height: diametroIride,
              }}
            />
          ))}
          <div
            className="mirino rettangolo"
            style={{
              left: `${bocca.x}%`,
              top: `${bocca.y}%`,
              width: inPixel(bocca.larghezza),
              height: inPixel(bocca.altezzaAperta),
            }}
          />
        </>
      )}
    </div>
  );
}
