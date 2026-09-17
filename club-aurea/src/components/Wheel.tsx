import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { SPICCHI, ESITO, GIRO, ARRESTO } from '../config/gioco';
import { tick as tickAptico } from '../lib/haptics';
import { tick as tickSuono, fruscioRuota, sblocca } from '../lib/suono';
import { FLACONE } from './AureaLogo';

const N = SPICCHI.length;
const PASSO = 360 / N;

/** Colori degli spicchi, in ciclo. */
const TINTE = ['#1A0E13', '#F9B7D6', '#E0559B', '#FFFBFC'];
/** Nella metà bassa della ruota la scritta arriverebbe a testa in giù. */
const capovolto = (i: number) => {
  const a = ((i * PASSO) % 360 + 360) % 360;
  return a > 90 && a < 270;
};
/** Il premio grosso non si veste di magenta come gli altri: oro pieno. */
const ORO = '#C9A54E';
const tintaDi = (i: number) => (SPICCHI[i].speciale ? ORO : TINTE[i % TINTE.length]);
/**
 * Solo il quasi nero vuole la scritta chiara. Sul magenta e sull'oro la crema
 * sta sotto il 3:1 e a 14px in movimento sparisce: l'inchiostro scuro su
 * quelle due tinte arriva a 7:1 abbondanti, ed è l'unica ragione della scelta.
 */
const SCURE = new Set(['#1A0E13']);
const testoSu = (i: number) => (SCURE.has(tintaDi(i)) ? '#FFFBFC' : '#1A0E13');

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
    const candidati = ESITO === null
      ? SPICCHI.map((_, i) => i)
      : SPICCHI.map((s, i) => (s.valore === ESITO ? i : -1)).filter((i) => i >= 0);
    const bersaglio = candidati[Math.floor(Math.random() * candidati.length)];

    const giri = GIRO.giriMin + Math.floor(Math.random() * (GIRO.giriMax - GIRO.giriMin + 1));

    /*
     * Dove si posa la lancetta dentro lo spicchio. Gli spicchi arrivano in
     * ordine decrescente di indice, quindi il bordo appena superato è quello
     * verso lo spicchio precedente: uno scostamento negativo lascia la
     * lancetta lì accanto, appena dentro. È tutto qui l'effetto — nessuna
     * pausa, nessuno scatto, solo un punto d'arresto scelto bene.
     */
    const dentro = ARRESTO
      ? ARRESTO.da + Math.random() * (ARRESTO.a - ARRESTO.da)
      : Math.random();
    const scostamento = (0.5 - dentro) * PASSO * -1;
    const finale = giri * 360 + (360 - bersaglio * PASSO) + scostamento;
    const durataTotale = GIRO.durata;

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
    let scatti = 0;
    let angoloPrec = 0;
    let deltaMax = 0;
    const fruscio = fruscioRuota();
    const t0 = performance.now();
    const passo = (ora: number) => {
      const trascorso = ora - t0;
      const t = Math.min(1, trascorso / durataTotale);
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
        className="w-full drop-shadow-[0_24px_50px_rgba(26,14,19,.22)]"
        role="img"
        aria-label={
          vinto !== null
            ? `Ruota ferma sul premio da ${vinto} euro`
            : 'Ruota dei premi. Premi il bottone Gira, oppure trascina la ruota.'
        }
      >
        <defs>
          <linearGradient id="bordo-aurea" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F0DCAE" />
            <stop offset="50%" stopColor="#C9A54E" />
            <stop offset="100%" stopColor="#8C6E27" />
          </linearGradient>
          <radialGradient id="perno-aurea" cx="35%" cy="28%">
            <stop offset="0%" stopColor="#F6E4B4" />
            <stop offset="55%" stopColor="#C9A54E" />
            <stop offset="100%" stopColor="#8C6E27" />
          </radialGradient>
          <radialGradient id="luce-aurea" cx="32%" cy="18%" r="62%">
            <stop offset="0%" stopColor="#fff" stopOpacity=".38" />
            <stop offset="70%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <filter id="alone-aurea" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.2" />
          </filter>
        </defs>

        <circle cx={R} cy={R} r={R - 2} fill="url(#bordo-aurea)" />
        <circle cx={R} cy={R} r={R - 7} fill="#FFFBFC" />

        <g ref={ruotaRef} style={{ transformOrigin: '100px 100px', willChange: 'transform' }}>
          {SPICCHI.map((s, i) => {
            const vincente = !girando && indiceVinto === i;
            return (
              <g key={i}>
                <path d={settore(i)} fill={tintaDi(i)} stroke="#FFFBFC" strokeWidth=".6" />
                {vincente && <path d={settore(i)} fill="#F9B7D6" opacity=".45" filter="url(#alone-aurea)" />}
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
        <circle cx={R} cy={R} r={R - 7} fill="url(#luce-aurea)" pointerEvents="none" />

        <circle cx={R} cy={R} r="23" fill="#FFFBFC" opacity=".9" />
        <circle cx={R} cy={R} r="21" fill="url(#perno-aurea)" />
        <circle cx={R} cy={R} r="21" fill="none" stroke="#8C6E27" strokeWidth=".7" opacity=".45" />
        {/* Il flacone al centro, senza gocce: a questa scala lo spruzzo
            diventerebbe sporco sul metallo. */}
        <g transform={`translate(${R - 13} ${R - 13}) scale(0.81)`} fill="#1A0E13">
          {[FLACONE.tappo, FLACONE.collo, FLACONE.corpo].map((p, i) => (
            <rect key={i} x={p.x} y={p.y} width={p.l} height={p.h} rx={p.r} />
          ))}
        </g>

        <g ref={lancettaRef} style={{ transformOrigin: '100px 12px' }}>
          {/* Un cuneo e basta: appoggiato sul bordo, la punta dentro la ruota.
              Il filo chiaro lo stacca anche dagli spicchi neri. */}
          <path d="M100 30 L91 7 H109 Z" fill="#1A0E13"
            stroke="#FFFBFC" strokeWidth="2" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
});
