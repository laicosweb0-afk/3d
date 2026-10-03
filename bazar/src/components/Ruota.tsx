import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { GIRO, SPICCHI, estraiSpicchio } from '../config/gioco';
import { tick as tickAptico } from '../lib/haptics';
import { tick as tickSuono, fruscioRuota, sblocca } from '../lib/suono';

const N = SPICCHI.length;
const PASSO = 360 / N;

/**
 * Il colore dice l'importo, non la posizione: oro il 70, inchiostro il 50,
 * crema il 30. Si capisce a colpo d'occhio dove sta il premio grosso e
 * quanta ruota occupa — cioè quanto spesso esce.
 */
const TINTE: Record<number, { fondo: string; testo: string }> = {
  70: { fondo: 'url(#r-oro)', testo: '#16120F' },
  50: { fondo: '#2a231d', testo: '#D8BC86' },
  30: { fondo: '#EDE7DD', testo: '#16120F' },
};
const ALTRO = { fondo: '#8a6a3c', testo: '#EDE7DD' };
const tintaDi = (i: number) => TINTE[SPICCHI[i]] ?? ALTRO;

/** Nella metà bassa della ruota la scritta arriverebbe a testa in giù. */
const capovolto = (i: number) => {
  const a = ((i * PASSO) % 360 + 360) % 360;
  return a > 90 && a < 270;
};

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

export type RuotaHandle = { gira: () => void };

/**
 * La ruota.
 *
 * Ogni spicchio è un premio vero, e tutti gli spicchi sono grandi uguale:
 * l'estrazione sceglie uno spicchio a caso, e le probabilità sono quelle che
 * si vedono. Si vince sempre.
 */
export const Ruota = forwardRef<RuotaHandle, {
  onFermata: (valore: number) => void;
  disabilitata?: boolean;
}>(function Ruota({ onFermata, disabilitata }, ref) {
  const ruotaRef = useRef<SVGGElement>(null);
  const lancettaRef = useRef<SVGGElement>(null);
  const [girando, setGirando] = useState(false);
  const [vinto, setVinto] = useState<number | null>(null);
  /** Lo spicchio fermo: gli importi si ripetono, si accende solo quello. */
  const [fermo, setFermo] = useState<number | null>(null);
  const giroFatto = useRef(false);

  const gira = useCallback(() => {
    if (giroFatto.current || disabilitata) return;
    giroFatto.current = true;
    setGirando(true);
    // Siamo dentro un gesto dell'utente: è l'unico momento in cui iOS lascia
    // svegliare l'audio.
    sblocca();

    /*
     * Si estrae uno spicchio, a caso e senza pesi: la ruota si ferma lì, e il
     * premio è quello scritto sopra. Nessun bersaglio imposto, nessun
     * importo che compare ma non può uscire.
     */
    const bersaglio = estraiSpicchio();
    const valore = SPICCHI[bersaglio];
    const giri = GIRO.giriMin + Math.floor(Math.random() * (GIRO.giriMax - GIRO.giriMin + 1));
    const dentro = (Math.random() - 0.5) * PASSO * 0.7;
    const finale = giri * 360 + (360 - bersaglio * PASSO) + dentro;

    const chiudi = () => {
      setGirando(false);
      setVinto(valore);
      setFermo(bersaglio);
      onFermata(SPICCHI[bersaglio]);
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (ruotaRef.current) ruotaRef.current.style.transform = `rotate(${finale}deg)`;
      chiudi();
      return;
    }

    let ultimo = spicchioSotto(0);
    let scatti = 0, angoloPrec = 0, deltaMax = 0;
    const fruscio = fruscioRuota();
    const t0 = performance.now();
    const passo = (ora: number) => {
      const t = Math.min(1, (ora - t0) / GIRO.durata);
      const angolo = finale * percorso(t);
      if (ruotaRef.current) ruotaRef.current.style.transform = `rotate(${angolo}deg)`;

      const delta = angolo - angoloPrec;
      angoloPrec = angolo;
      if (delta > deltaMax) deltaMax = delta;
      fruscio.aggiorna(deltaMax > 0 ? delta / deltaMax : 0);

      const corrente = spicchioSotto(angolo);
      if (corrente !== ultimo) {
        ultimo = corrente;
        tickAptico();
        tickSuono(scatti++);
        lancettaRef.current?.animate(
          [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-11deg)' }, { transform: 'rotate(0deg)' }],
          { duration: 170, easing: 'cubic-bezier(.2,.9,.25,1)' },
        );
      }

      if (t < 1) requestAnimationFrame(passo);
      else { fruscio.ferma(); chiudi(); }
    };
    requestAnimationFrame(passo);
  }, [disabilitata, onFermata]);

  useImperativeHandle(ref, () => ({ gira }), [gira]);

  const R = 100;
  const settore = (i: number) => {
    const da = (i * PASSO - PASSO / 2 - 90) * (Math.PI / 180);
    const a = (i * PASSO + PASSO / 2 - 90) * (Math.PI / 180);
    const p = (ang: number) => `${R + R * 0.88 * Math.cos(ang)} ${R + R * 0.88 * Math.sin(ang)}`;
    return `M ${R} ${R} L ${p(da)} A ${R * 0.88} ${R * 0.88} 0 0 1 ${p(a)} Z`;
  };

  return (
    <div className="relative w-full select-none" style={{ touchAction: 'pan-y' }}>
      <svg
        viewBox="0 0 200 200"
        className="w-full"
        style={{ filter: 'drop-shadow(0 24px 60px rgba(216,188,134,.22))' }}
        role="img"
        aria-label={
          vinto !== null
            ? `Ruota ferma su ${vinto} euro di credito.`
            : 'Ruota del credito. Premi il bottone per girarla.'
        }
      >
        <defs>
          <radialGradient id="r-luce" cx="32%" cy="16%" r="64%">
            <stop offset="0%" stopColor="#fff" stopOpacity=".30" />
            <stop offset="72%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="r-oro" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8E7751" />
            <stop offset="45%" stopColor="#E6CD9A" />
            <stop offset="60%" stopColor="#D8BC86" />
            <stop offset="100%" stopColor="#8E7751" />
          </linearGradient>
          <filter id="r-alone" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Il cerchio esterno è un filo d'oro, come il profilo dei divani:
            una cornice piena farebbe fiera di paese. */}
        <circle cx={R} cy={R} r={R - 3} fill="none"
          stroke="rgba(216,188,134,.55)" strokeWidth="1.2" />

        <g ref={ruotaRef} style={{ transformOrigin: '100px 100px', willChange: 'transform' }}>
          {SPICCHI.map((valore, i) => {
            const t = tintaDi(i);
            const vincente = !girando && fermo === i;
            return (
              <g key={i}>
                <path d={settore(i)} fill={t.fondo} stroke="#16120F" strokeWidth=".5" />
                {vincente && (
                  <path d={settore(i)} fill="#fff" opacity=".35" filter="url(#r-alone)" />
                )}
                <text
                  x={R} y={R - R * 0.6}
                  transform={
                    `rotate(${i * PASSO} ${R} ${R})` +
                    (capovolto(i) ? ` rotate(180 ${R} ${R - R * 0.6})` : '')
                  }
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize="13" fontWeight="500" letterSpacing="0.2"
                  fontFamily="Poppins, sans-serif"
                  fill={t.testo}
                >
                  {valore}€
                </text>
              </g>
            );
          })}
        </g>

        {/* Riflesso fisso: la luce non gira con la ruota. */}
        <circle cx={R} cy={R} r={R - 3} fill="url(#r-luce)" pointerEvents="none" />

        {/* Il perno: una borchia d'ottone. */}
        <circle cx={R} cy={R} r="15" fill="#16120F" />
        <circle cx={R} cy={R} r="15" fill="none" stroke="rgba(216,188,134,.5)" strokeWidth="1" />
        <circle cx={R} cy={R} r="5" fill="url(#r-oro)" />

        {/* La lancetta: un cuneo sottile, appoggiato sul bordo. */}
        <g ref={lancettaRef} style={{ transformOrigin: '100px 8px' }}>
          <path d="M100 24 L94.5 4 H105.5 Z" fill="#EDE7DD" />
        </g>
      </svg>
    </div>
  );
});
