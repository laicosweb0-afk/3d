import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { SPICCHI, OUTCOME, GIRO, QUASI } from '../config/game';
import { tick as tickAptico } from '../lib/haptics';
import { tick as tickSuono, fruscioRuota, sblocca } from '../lib/suono';
import { TESSERE, INCLINAZIONE } from './RamaLogo';

const N = SPICCHI.length;
const PASSO = 360 / N;

/** Colori degli spicchi, in ciclo. */
const TINTE = ['#1D1D1F', '#E8CD86', '#C9A54E', '#FBFAF7'];
/** Nella metà bassa della ruota la scritta arriverebbe a testa in giù. */
const capovolto = (i: number) => {
  const a = ((i * PASSO) % 360 + 360) % 360;
  return a > 90 && a < 270;
};
/** Il premio grosso non si veste d'oro come gli altri: rubino profondo. */
const RUBINO = '#8A2B2E';
const tintaDi = (i: number) => (SPICCHI[i].speciale ? RUBINO : TINTE[i % TINTE.length]);
const SCURE = new Set(['#1D1D1F', RUBINO]);
const testoSu = (i: number) => (SCURE.has(tintaDi(i)) ? '#FBFAF7' : '#1D1D1F');

/**
 * Profilo di velocità: rampa breve in accelerazione, poi frenata lunga che
 * arriva a zero. Integrato a mano perché velocità e posizione restino
 * continue nel punto di raccordo — è quello che fa sembrare la ruota pesante
 * invece che tirata da un'animazione.
 */
const A = 0.12;
const TOT = A / 2 + (1 - A) / 4;
function percorso(t: number): number {
  if (t <= A) return t * t / (2 * A) / TOT;
  const u = (t - A) / (1 - A);
  return (A / 2 + ((1 - A) / 4) * (1 - Math.pow(1 - u, 4))) / TOT;
}

/**
 * L'angolo nei tre tempi della frenata: corsa fino a un soffio dal bersaglio,
 * respiro fermo, scatto finale. Lo scivolo usa un'accelerazione dolce e una
 * frenata dolce, così l'ultimo scatto sembra la ruota che cede di un dente,
 * non un salto.
 */
function angoloConSuspense(trascorso: number, quasi: number, finale: number): number {
  if (trascorso <= GIRO.durata) return quasi * percorso(trascorso / GIRO.durata);
  const dopo = trascorso - GIRO.durata;
  if (dopo <= GIRO.pausa) return quasi;
  const u = Math.min(1, (dopo - GIRO.pausa) / GIRO.scivolo);
  const dolce = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  return quasi + (finale - quasi) * dolce;
}

/** Indice dello spicchio fermo sotto la lancetta per una data rotazione. */
function spicchioSotto(rotazione: number): number {
  const a = ((-rotazione % 360) + 360) % 360;
  return Math.round(a / PASSO) % N;
}

type Props = { onRisultato: (valore: number) => void; disabilitata?: boolean };

/** La ruota decide da sé la propria fisica; da fuori si può solo lanciarla. */
export type WheelHandle = { gira: () => void };

export const Wheel = forwardRef<WheelHandle, Props>(function Wheel(
  { onRisultato, disabilitata }, ref,
) {
  const ruotaRef = useRef<SVGGElement>(null);
  const lancettaRef = useRef<SVGGElement>(null);
  const [girando, setGirando] = useState(false);
  const [vinto, setVinto] = useState<number | null>(null);
  const [indiceVinto, setIndiceVinto] = useState<number | null>(null);
  const giroFatto = useRef(false);

  const gira = useCallback(() => {
    if (giroFatto.current || disabilitata) return;
    giroFatto.current = true;
    setGirando(true);
    // Siamo dentro un gesto dell'utente: è l'unico momento in cui iOS lascia
    // svegliare l'audio.
    sblocca();

    // Lo spicchio d'arrivo: quello imposto, o uno a caso.
    const candidati = OUTCOME === null
      ? SPICCHI.map((_, i) => i)
      : SPICCHI.map((s, i) => (s.valore === OUTCOME ? i : -1)).filter((i) => i >= 0);
    const bersaglio = candidati[Math.floor(Math.random() * candidati.length)];

    // Non al centro esatto dello spicchio: un po' fuori asse sembra naturale.
    const sbavatura = (Math.random() - 0.5) * PASSO * 0.62;
    const giri = GIRO.giriMin + Math.floor(Math.random() * (GIRO.giriMax - GIRO.giriMin + 1));
    const finale = giri * 360 + (360 - bersaglio * PASSO) + sbavatura;

    // Lo spicchio che sfila un attimo prima del bersaglio: se è quello grosso,
    // la ruota ci si ferma quasi sopra prima di scoprire il premio vero.
    const precedente = (bersaglio + 1) % N;
    const conSuspense = QUASI && OUTCOME !== null && !!SPICCHI[precedente].speciale;
    const quasi = finale - PASSO;
    const durataTotale = conSuspense
      ? GIRO.durata + GIRO.pausa + GIRO.scivolo
      : GIRO.durata;

    const ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (ridotto) {
      if (ruotaRef.current) ruotaRef.current.style.transform = `rotate(${finale}deg)`;
      setGirando(false);
      setVinto(SPICCHI[bersaglio].valore);
      setIndiceVinto(bersaglio);
      onRisultato(SPICCHI[bersaglio].valore);
      return;
    }

    let ultimo = spicchioSotto(0);
    let angoloPrec = 0;
    let deltaMax = 0;
    const fruscio = fruscioRuota();
    const t0 = performance.now();
    const passo = (ora: number) => {
      const trascorso = ora - t0;
      const t = Math.min(1, trascorso / durataTotale);
      const angolo = conSuspense ? angoloConSuspense(trascorso, quasi, finale) : finale * percorso(t);
      if (ruotaRef.current) ruotaRef.current.style.transform = `rotate(${angolo}deg)`;

      // Il fruscio segue la velocità vera, fotogramma per fotogramma: è questo
      // a far sentire il peso della ruota, più dei singoli scatti.
      const delta = angolo - angoloPrec;
      angoloPrec = angolo;
      if (delta > deltaMax) deltaMax = delta;
      fruscio.aggiorna(deltaMax > 0 ? delta / deltaMax : 0);

      const corrente = spicchioSotto(angolo);
      if (corrente !== ultimo) {
        ultimo = corrente;
        tickAptico();
        tickSuono();
        // La lancetta scatta all'indietro e rientra: la muovo fuori da React,
        // altrimenti sarebbero decine di render durante il giro.
        lancettaRef.current?.animate(
          [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-13deg)' }, { transform: 'rotate(0deg)' }],
          { duration: 170, easing: 'cubic-bezier(.2,.9,.25,1)' },
        );
      }

      if (t < 1) requestAnimationFrame(passo);
      else {
        fruscio.ferma();
        setGirando(false);
        setVinto(SPICCHI[bersaglio].valore);
        setIndiceVinto(bersaglio);
        onRisultato(SPICCHI[bersaglio].valore);
      }
    };
    requestAnimationFrame(passo);
  }, [disabilitata, onRisultato]);

  useImperativeHandle(ref, () => ({ gira }), [gira]);

  // Anche con uno strappo del dito sulla ruota, non solo col bottone.
  const partenza = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const el = ruotaRef.current?.ownerSVGElement;
    if (!el) return;
    const giu = (e: PointerEvent) => { partenza.current = { x: e.clientX, y: e.clientY }; };
    const su = (e: PointerEvent) => {
      const p = partenza.current;
      partenza.current = null;
      if (!p) return;
      const d = Math.hypot(e.clientX - p.x, e.clientY - p.y);
      if (d > 34) gira();
    };
    el.addEventListener('pointerdown', giu);
    el.addEventListener('pointerup', su);
    el.addEventListener('pointercancel', () => { partenza.current = null; });
    return () => {
      el.removeEventListener('pointerdown', giu);
      el.removeEventListener('pointerup', su);
    };
  }, [gira]);

  const R = 100;
  const settore = (i: number) => {
    const da = (i * PASSO - PASSO / 2 - 90) * (Math.PI / 180);
    const a = (i * PASSO + PASSO / 2 - 90) * (Math.PI / 180);
    const p = (ang: number) => `${R + R * 0.86 * Math.cos(ang)} ${R + R * 0.86 * Math.sin(ang)}`;
    return `M ${R} ${R} L ${p(da)} A ${R * 0.86} ${R * 0.86} 0 0 1 ${p(a)} Z`;
  };

  return (
    <div className="relative w-full select-none" style={{ touchAction: 'pan-y' }}>
      <svg
        viewBox="0 0 200 200"
        className="w-full drop-shadow-[0_24px_50px_rgba(29,29,31,.22)]"
        role="img"
        aria-label={
          vinto !== null
            ? `Ruota ferma sul premio da ${vinto} euro`
            : 'Ruota dei premi. Premi il bottone Gira, oppure trascina la ruota.'
        }
      >
        <defs>
          <linearGradient id="bordo-oro" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E8CD86" />
            <stop offset="50%" stopColor="#C9A54E" />
            <stop offset="100%" stopColor="#8C6E27" />
          </linearGradient>
          <radialGradient id="perno" cx="35%" cy="28%">
            <stop offset="0%" stopColor="#F6E4B4" />
            <stop offset="55%" stopColor="#C9A54E" />
            <stop offset="100%" stopColor="#8C6E27" />
          </radialGradient>
          <radialGradient id="luce" cx="32%" cy="18%" r="62%">
            <stop offset="0%" stopColor="#fff" stopOpacity=".38" />
            <stop offset="70%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <filter id="alone" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.2" />
          </filter>
        </defs>

        <circle cx={R} cy={R} r={R - 2} fill="url(#bordo-oro)" />
        <circle cx={R} cy={R} r={R - 7} fill="#FBFAF7" />

        <g ref={ruotaRef} style={{ transformOrigin: '100px 100px', willChange: 'transform' }}>
          {SPICCHI.map((s, i) => {
            const vincente = !girando && indiceVinto === i;
            return (
              <g key={i}>
                <path d={settore(i)} fill={tintaDi(i)} stroke="#FBFAF7" strokeWidth=".6" />
                {vincente && <path d={settore(i)} fill="#E8CD86" opacity=".4" filter="url(#alone)" />}
                <text
                  x={R} y={R - R * 0.585}
                  transform={
                    `rotate(${i * PASSO} ${R} ${R})` +
                    (capovolto(i) ? ` rotate(180 ${R} ${R - R * 0.585})` : '')
                  }
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize="14" fontWeight="700" letterSpacing="-0.4"
                  fill={testoSu(i)}
                >
                  {s.valore}€
                </text>
              </g>
            );
          })}
          {SPICCHI.map((_, i) => {
            const ang = (i * PASSO + PASSO / 2 - 90) * (Math.PI / 180);
            return (
              <circle key={`p${i}`} r="1.7" fill="#F6E4B4"
                cx={R + R * 0.915 * Math.cos(ang)} cy={R + R * 0.915 * Math.sin(ang)} />
            );
          })}
        </g>

        {/* Riflesso fisso: la luce non gira con la ruota. */}
        <circle cx={R} cy={R} r={R - 7} fill="url(#luce)" pointerEvents="none" />

        <circle cx={R} cy={R} r="23" fill="#FBFAF7" opacity=".9" />
        <circle cx={R} cy={R} r="21" fill="url(#perno)" />
        <circle cx={R} cy={R} r="21" fill="none" stroke="#8C6E27" strokeWidth=".7" opacity=".45" />
        <g transform={`translate(${R - 12.5} ${R - 12.5}) scale(0.78)`} fill="#1D1D1F">
          <g transform={INCLINAZIONE}>
            {TESSERE.map((t, i) => (
              <rect key={i} x={t.x} y={t.y} width={t.l} height={t.l} rx={t.r} />
            ))}
          </g>
        </g>

        <g ref={lancettaRef} style={{ transformOrigin: '100px 12px' }}>
          {/* Un cuneo e basta: appoggiato sul bordo, la punta dentro la ruota.
              Il filo di crema lo stacca anche dagli spicchi neri. */}
          <path d="M100 30 L91 7 H109 Z" fill="#1D1D1F"
            stroke="#FBFAF7" strokeWidth="2" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
});
