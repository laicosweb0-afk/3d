'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ANATOMIA,
  COLORI_OCCHIO,
  GRADIENTE_BOCCA,
  POSA_BASE,
  POSA_BOCCA_APERTA,
} from '@/lib/anatomia';
import { creaPittore, RITAGLIO_FILMATO, type Pittore } from '@/lib/filmato';

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
  /** Vero mentre il coniglio parla: si torna allo sprite con la bocca viva. */
  parla: boolean;
  /** Con `?calibra=1` mostra la griglia e i mirini per allineare occhi e bocca. */
  calibra: boolean;
};

/** Quanto lontano deve andare il puntatore perché l'occhio sia a fine corsa. */
const PORTATA = 420;

/** Quanto dura l'animazione d'ingresso: il filmato parte quando è atterrato. */
const DURATA_INGRESSO = 1700;

export function Bianconiglio({ arrivato, livello, parla, calibra }: Proprieta) {
  const riquadroRef = useRef<HTMLDivElement>(null);
  const immagineRef = useRef<HTMLImageElement>(null);
  const [misure, setMisure] = useState({ larghezza: 0, altezza: 0 });
  const [sguardo, setSguardo] = useState({ sx: 0, sy: 0, dx: 0, dy: 0 });
  const [immagineMancante, setImmagineMancante] = useState(false);
  const [palpebre, setPalpebre] = useState(false);

  // Il filmato d'attesa (vedi lib/filmato.ts). Quando il coniglio non parla,
  // al posto dello sprite c'è il girato vero — orecchie, zampe, peso — dipinto
  // senza fondo da un canvas WebGL. Quando parla si torna allo sprite, che ha
  // occhi e bocca comandabili, con una dissolvenza breve.
  const telaRef = useRef<HTMLCanvasElement>(null);
  const filmatoRef = useRef<HTMLVideoElement>(null);
  const pittoreRef = useRef<Pittore | null>(null);
  const [pronto, setPronto] = useState(false);
  const [dalvivo, setDalvivo] = useState(false);

  useEffect(() => {
    if (!arrivato) return;
    const attesa = setTimeout(() => setPronto(true), DURATA_INGRESSO);
    return () => clearTimeout(attesa);
  }, [arrivato]);

  useEffect(() => {
    if (!pronto || parla || immagineMancante) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const video = filmatoRef.current;
    const tela = telaRef.current;
    if (!video || !tela) return;
    pittoreRef.current ??= creaPittore(tela, video);
    const pittore = pittoreRef.current;
    if (!pittore) return; // niente WebGL: resta lo sprite, la demo di prima

    let quadro = 0;
    let acceso = false;
    void video.play().catch(() => {});
    const giro = () => {
      // La tela si mostra solo quando un fotogramma è stato davvero dipinto:
      // mai una dissolvenza verso un canvas vuoto.
      if (pittore.dipingi() && !acceso) {
        acceso = true;
        setDalvivo(true);
      }
      quadro = requestAnimationFrame(giro);
    };
    quadro = requestAnimationFrame(giro);

    return () => {
      cancelAnimationFrame(quadro);
      setDalvivo(false);
      video.pause();
      // Il nastro torna all'inizio: il fotogramma 0 ha la posa dello sprite,
      // così la prossima dissolvenza riparte da due immagini che coincidono.
      video.addEventListener('seeked', () => pittore.dipingi(), { once: true });
      try {
        video.currentTime = 0;
      } catch {
        // un video mai partito può non essere ancora riavvolgibile: pazienza
      }
    };
  }, [pronto, parla, immagineMancante]);

  // Il battito di palpebre: ogni 3-6 secondi, per 140 millisecondi, due
  // "palpebre" color pelo coprono gli occhi. È il dettaglio che fa scattare
  // il «è vivo»: un viso che non sbatte mai le palpebre è un poster.
  useEffect(() => {
    if (!arrivato) return;
    let apri: ReturnType<typeof setTimeout>;
    let prossimo: ReturnType<typeof setTimeout>;
    const batti = () => {
      setPalpebre(true);
      apri = setTimeout(() => setPalpebre(false), 140);
      prossimo = setTimeout(batti, 3000 + Math.random() * 3000);
    };
    prossimo = setTimeout(batti, 1800);
    return () => {
      clearTimeout(apri);
      clearTimeout(prossimo);
    };
  }, [arrivato]);

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
  // La radice del livello: le aperture medie contano più dei picchi, e la
  // bocca articola sulle sillabe invece di alternare chiuso/spalancato.
  const aperturaBocca =
    bocca.altezzaChiusa +
    (bocca.altezzaAperta - bocca.altezzaChiusa) * Math.pow(Math.min(1, Math.max(0, livello)), 0.7);

  const occhi = [
    { chiave: 'sinistro', punto: ANATOMIA.occhioSinistro, x: sguardo.sx, y: sguardo.sy },
    { chiave: 'destro', punto: ANATOMIA.occhioDestro, x: sguardo.dx, y: sguardo.dy },
  ];

  return (
    <div
      ref={riquadroRef}
      className={`coniglio${arrivato ? ' arrivato' : ''}${dalvivo ? ' dalvivo' : ''}`}
      style={{ ['--luce-occhio' as string]: COLORI_OCCHIO.luce }}
    >
      {/* Due strati di vita sopra lo sprite fermo: il respiro (sempre, via
          CSS) e il molleggio da cartone che accompagna la voce (qui, dal
          volume). Sono separati perché una transform inline schiaccerebbe
          l'animazione CSS del respiro. */}
      <div className="respiro">
        <div
          className="vita"
          style={{
            transform: `translateY(${(-livello * 0.9).toFixed(3)}%) rotate(${(livello * 0.5).toFixed(3)}deg) scale(${(1 + livello * 0.012).toFixed(4)}, ${(1 - livello * 0.006).toFixed(4)})`,
          }}
        >
      {immagineMancante ? (
        <div className="segnaposto">
          <strong>Manca il Bianconiglio.</strong>
          <span>
            Metti l&rsquo;immagine scontornata in
            <br />
            <code>public/bianconiglio.webp</code>
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
            // È l'elemento più grande della pagina e sta per entrare in scena:
            // il browser deve scaricarlo per primo, non per ultimo.
            fetchPriority="high"
            onError={() => setImmagineMancante(true)}
            draggable={false}
          />

          {/* La tela del filmato d'attesa, sopra lo sprite e ritagliata perché
              i due conigli coincidano. Il video che la nutre è invisibile. */}
          <canvas
            ref={telaRef}
            className="tela"
            width={540}
            height={960}
            style={RITAGLIO_FILMATO}
            aria-hidden="true"
          />
          <video
            ref={filmatoRef}
            muted
            playsInline
            loop
            preload="auto"
            aria-hidden="true"
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              opacity: 0,
              pointerEvents: 'none',
            }}
          >
            <source src="/idle-stack.mp4" type='video/mp4; codecs="avc1.4d401f"' />
            <source src="/idle-stack.webm" type='video/webm; codecs="vp9"' />
          </video>

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
              <div
                className="palpebra"
                style={{
                  left: `${occhio.punto.x}%`,
                  top: `${occhio.punto.y}%`,
                  width: diametroIride * 1.18,
                  height: diametroIride * 1.18,
                  transform: `translate(-50%, -50%) scaleY(${palpebre ? 1 : 0.02})`,
                  opacity: palpebre ? 1 : 0,
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
                background: GRADIENTE_BOCCA,
                // Sfocatura e trasparenza sul contorno: il bordo netto di un
                // div leggeva come «un buco», non come una bocca.
                filter: 'blur(1.1px)',
                opacity: 0.92,
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
      </div>
    </div>
  );
}
