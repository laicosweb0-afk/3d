import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { GIRO, SPICCHI } from '../config/gioco';
import { tick as tickAptico } from '../lib/haptics';
import { tick as tickSuono, fruscioRuota, sblocca } from '../lib/suono';

const N = SPICCHI.length;
const PASSO = 360 / N;

/**
 * Il colore dice il valore.
 *
 * Magenta il 15, viola il 10, crema il 5: guardando la ruota si capisce
 * subito quale premio occupa più spazio, e siccome l'estrazione è uniforme
 * quello spazio **è** la probabilità. Non c'è niente da spiegare e niente da
 * nascondere: la ruota è onesta per costruzione.
 */
const TINTE: Record<number, { fondo: string; testo: string }> = {
  15: { fondo: '#e966b5', testo: '#0f0e12' },
  10: { fondo: '#966edc', testo: '#f7f3ee' },
  5: { fondo: '#f7f3ee', testo: '#0f0e12' },
};
const tintaDi = (v: number) => TINTE[v] ?? { fondo: '#f7f3ee', testo: '#0f0e12' };

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
 * **L'estrazione è casuale e uniforme**: `Math.floor(Math.random() * N)`, una
 * riga sola, senza pesi e senza bersagli imposti. Le percentuali chieste —
 * 55 per il 15 €, 27 per il 10 €, 18 per il 5 € — vengono dalla composizione
 * degli spicchi in `gioco.ts`, non da un trucco qui dentro. È la differenza
 * fra una ruota che sembra giusta e una che lo è.
 */
export const Ruota = forwardRef<RuotaHandle, {
  onFermata: (valore: number) => void;
  disabilitata?: boolean;
}>(function Ruota({ onFermata, disabilitata }, ref) {
  const ruotaRef = useRef<SVGGElement>(null);
  const lancettaRef = useRef<SVGGElement>(null);
  const [girando, setGirando] = useState(false);
  const [vinto, setVinto] = useState<number | null>(null);
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
    const dentro = (Math.random() - 0.5) * PASSO * 0.7;
    const finale = giri * 360 + (360 - bersaglio * PASSO) + dentro;

    const chiudi = () => {
      setGirando(false);
      setVinto(SPICCHI[bersaglio]);
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
        style={{ filter: 'drop-shadow(0 24px 60px rgba(233,102,181,.22))' }}
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
          <filter id="r-alone" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Il cerchio esterno è un filo, non una cornice dorata: qui dentro
            non siamo a una fiera di paese. */}
        <circle cx={R} cy={R} r={R - 3} fill="none"
          stroke="rgba(247,243,238,.24)" strokeWidth="1.5" />

        <g ref={ruotaRef} style={{ transformOrigin: '100px 100px', willChange: 'transform' }}>
          {SPICCHI.map((valore, i) => {
            const t = tintaDi(valore);
            const vincente = !girando && vinto !== null && spicchioSotto(0) === i;
            return (
              <g key={i}>
                <path d={settore(i)} fill={t.fondo} stroke="#0b0a0e" strokeWidth=".5" />
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
                  fontSize="13" fontWeight="600" letterSpacing="-0.3"
                  fontFamily="Inter, sans-serif"
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

        {/* Il perno: il punto del marchio. */}
        <circle cx={R} cy={R} r="15" fill="#0b0a0e" />
        <circle cx={R} cy={R} r="15" fill="none" stroke="rgba(247,243,238,.2)" strokeWidth="1" />
        <circle cx={R} cy={R} r="5" fill="#e966b5" />

        {/* La lancetta: un cuneo sottile, appoggiato sul bordo. */}
        <g ref={lancettaRef} style={{ transformOrigin: '100px 8px' }}>
          <path d="M100 24 L94.5 4 H105.5 Z" fill="#f7f3ee" />
        </g>
      </svg>
    </div>
  );
});
