import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { SPICCHI, GIRO, type Spicchio } from '../config/gioco';
import { tick as tickAptico } from '../lib/haptics';
import { tick as tickSuono, fruscioRuota, sblocca } from '../lib/suono';
import { Perla } from './Perla';

const N = SPICCHI.length;
const PASSO = 360 / N;

/** Colori degli spicchi, in ciclo: inchiostro, rosa, magenta, crema. */
const TINTE = ['#1A171C', '#D5799A', '#BD3A66', '#FFFCF7'];
/** Nella metà bassa della ruota la scritta arriverebbe a testa in giù. */
const capovolto = (i: number) => {
  const a = ((i * PASSO) % 360 + 360) % 360;
  return a > 90 && a < 270;
};
const tintaDi = (i: number) => TINTE[i % TINTE.length];
/** Solo sull'inchiostro e sul magenta pieno la scritta va chiara. */
const SCURE = new Set(['#1A171C', '#BD3A66']);
const testoSu = (i: number) => (SCURE.has(tintaDi(i)) ? '#FFFCF7' : '#1A171C');

/**
 * Profilo di velocità: rampa breve in accelerazione, poi frenata lunga che
 * arriva a zero. Integrato a mano perché velocità e posizione restino
 * continue nel punto di raccordo — è quello che fa sembrare la ruota pesante
 * invece che tirata da un'animazione.
 */
const A = 0.09;
const E = 3.4; // più alto, più lunga la coda: gli ultimi gradi durano
const TOT = A / 2 + (1 - A) / (E + 1);
function percorso(t: number): number {
  if (t <= A) return t * t / (2 * A) / TOT;
  const u = (t - A) / (1 - A);
  return (A / 2 + ((1 - A) / (E + 1)) * (1 - Math.pow(1 - u, E + 1))) / TOT;
}

/** Indice dello spicchio fermo sotto la lancetta per una data rotazione. */
function spicchioSotto(rotazione: number): number {
  const a = ((-rotazione % 360) + 360) % 360;
  return Math.round(a / PASSO) % N;
}

type Props = { onRisultato: (s: Spicchio) => void; disabilitata?: boolean };

/** La ruota decide da sé la propria fisica; da fuori si può solo lanciarla. */
export type WheelHandle = { gira: () => void };

/**
 * La ruota.
 *
 * **Ogni spicchio vale 15 €**: il premio è uno solo e uguale per tutti, come
 * dice il documento. Non c'è un premio grosso che nessuno può vincere, e per
 * questo non c'è nemmeno il trucco della frenata a un soffio dal bordo che
 * serviva sull'altra card: quando tutti i premi sono veri, la ruota può
 * fermarsi dove capita — e infatti si ferma dove capita.
 *
 * Quello che cambia da spicchio a spicchio è l'omaggio in più, che si legge
 * nella schermata dopo.
 */
export const Wheel = forwardRef<WheelHandle, Props>(function Wheel(
  { onRisultato, disabilitata }, ref,
) {
  const ruotaRef = useRef<SVGGElement>(null);
  const lancettaRef = useRef<SVGGElement>(null);
  const [girando, setGirando] = useState(false);
  const [indiceVinto, setIndiceVinto] = useState<number | null>(null);
  const giroFatto = useRef(false);

  const gira = useCallback(() => {
    if (giroFatto.current || disabilitata) return;
    giroFatto.current = true;
    setGirando(true);
    // Siamo dentro un gesto dell'utente: è l'unico momento in cui iOS lascia
    // svegliare l'audio.
    sblocca();

    const bersaglio = Math.floor(Math.random() * N);
    const giri = GIRO.giriMin + Math.floor(Math.random() * (GIRO.giriMax - GIRO.giriMin + 1));
    // Dove si posa dentro lo spicchio: dove capita, appunto.
    const scostamento = (Math.random() - 0.5) * PASSO * 0.72;
    const finale = giri * 360 + (360 - bersaglio * PASSO) + scostamento;

    const chiudi = () => {
      setGirando(false);
      setIndiceVinto(bersaglio);
      onRisultato(SPICCHI[bersaglio]);
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (ruotaRef.current) ruotaRef.current.style.transform = `rotate(${finale}deg)`;
      chiudi();
      return;
    }

    let ultimo = spicchioSotto(0);
    let scatti = 0;
    let angoloPrec = 0;
    let deltaMax = 0;
    const fruscio = fruscioRuota();
    const t0 = performance.now();
    const passo = (ora: number) => {
      const t = Math.min(1, (ora - t0) / GIRO.durata);
      const angolo = finale * percorso(t);
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
        tickSuono(scatti++);
        // La lancetta scatta all'indietro e rientra: la muovo fuori da React,
        // altrimenti sarebbero decine di render durante il giro.
        lancettaRef.current?.animate(
          [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-13deg)' }, { transform: 'rotate(0deg)' }],
          { duration: 170, easing: 'cubic-bezier(.2,.9,.25,1)' },
        );
      }

      if (t < 1) requestAnimationFrame(passo);
      else { fruscio.ferma(); chiudi(); }
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
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 34) gira();
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
        className="w-full drop-shadow-[0_24px_50px_rgba(26,23,28,.22)]"
        role="img"
        aria-label={
          indiceVinto !== null
            ? `Ruota ferma. ${SPICCHI[indiceVinto].valore} euro in fialette.`
            : 'Ruota dei premi: ogni spicchio vale 15 euro. Premi il bottone Gira, oppure trascina la ruota.'
        }
      >
        <defs>
          <linearGradient id="w-bordo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#D5799A" />
            <stop offset="50%" stopColor="#BD3A66" />
            <stop offset="100%" stopColor="#8E2649" />
          </linearGradient>
          <radialGradient id="w-luce" cx="32%" cy="18%" r="62%">
            <stop offset="0%" stopColor="#fff" stopOpacity=".38" />
            <stop offset="70%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <filter id="w-alone" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.2" />
          </filter>
        </defs>

        <circle cx={R} cy={R} r={R - 2} fill="url(#w-bordo)" />
        <circle cx={R} cy={R} r={R - 7} fill="#FFFCF7" />

        <g ref={ruotaRef} style={{ transformOrigin: '100px 100px', willChange: 'transform' }}>
          {SPICCHI.map((s, i) => {
            const vincente = !girando && indiceVinto === i;
            return (
              <g key={i}>
                <path d={settore(i)} fill={tintaDi(i)} stroke="#FFFCF7" strokeWidth=".6" />
                {vincente && <path d={settore(i)} fill="#D5799A" opacity=".45" filter="url(#w-alone)" />}
                <text
                  x={R} y={R - R * 0.585}
                  transform={
                    `rotate(${i * PASSO} ${R} ${R})` +
                    (capovolto(i) ? ` rotate(180 ${R} ${R - R * 0.585})` : '')
                  }
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize="15" fontWeight="700" letterSpacing="-0.4"
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
              <circle key={`p${i}`} r="1.7" fill="#F4B9CE"
                cx={R + R * 0.915 * Math.cos(ang)} cy={R + R * 0.915 * Math.sin(ang)} />
            );
          })}
        </g>

        {/* Riflesso fisso: la luce non gira con la ruota. */}
        <circle cx={R} cy={R} r={R - 7} fill="url(#w-luce)" pointerEvents="none" />

        {/* Il perno: la perla del marchio. */}
        <circle cx={R} cy={R} r="23" fill="#FFFCF7" opacity=".92" />
        <g transform={`translate(${R - 20} ${R - 20})`}>
          <Perla size={40} />
        </g>

        <g ref={lancettaRef} style={{ transformOrigin: '100px 12px' }}>
          {/* Un cuneo e basta: appoggiato sul bordo, la punta dentro la ruota. */}
          <path d="M100 30 L91 7 H109 Z" fill="#1A171C"
            stroke="#FFFCF7" strokeWidth="2" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
});
