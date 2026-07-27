'use client';

import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '../gsap';
import { scroll } from '../three/scrollState';
import { PROJECTS } from '../content';

/**
 * Il portfolio non è una griglia di card: è una sequenza di scene.
 *
 * Una sola sezione alta cinque viewport, con un pannello di testo fisso
 * sopra la scena 3D. Lo scroll non fa scorrere delle schede — muove
 * `scroll.world`, cioè l'indice frazionario del mondo, e la scena 3D si
 * trasforma di conseguenza: la materia del progetto precedente diventa
 * quella del successivo senza che ci sia mai uno stacco.
 *
 * Il testo di ogni progetto entra e esce in dissolvenza incrociata sulla base
 * dello stesso indice, così non esiste un momento di "cambio pagina".
 */
/**
 * Il velo di attraversamento.
 *
 * Prima era un lampo bianco pieno, uno per mondo di destinazione. Funzionava
 * come stacco, ma rompeva la scena: per mezzo secondo il sito smetteva di
 * essere nero e oro e diventava un altro sito. Un attraversamento non deve
 * accendere la luce, deve toglierla — nel buio si passa, dal bianco si esce.
 *
 * Restano sei toni perché ogni soglia conservi il suo carattere, ma sono tutti
 * dentro la stessa palette: antracite, nero caldo, nero bluastro. La differenza
 * fra uno e l'altro si sente senza vedersi.
 */
const VEIL = [
  'rgba(10,9,8,1)',
  'rgba(8,10,8,1)',
  'rgba(6,7,10,1)',
  'rgba(10,8,7,1)',
  'rgba(7,8,11,1)',
  'rgba(10,7,9,1)',
];

export function Cases({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const marksRef = useRef<(HTMLDivElement | null)[]>([]);
  const flashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;
    const section = sectionRef.current!;
    const n = PROJECTS.length;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          const prog = self.progress;
          // Margini in testa e in coda: senza, il primo e l'ultimo progetto
          // cadono esattamente sulle dissolvenze di entrata e uscita, e la
          // loro stanza non si vede mai per intero.
          const PAD = 0.09;
          const inner = Math.max(0, Math.min(1, (prog - PAD) / (1 - PAD * 2)));
          const w = inner * (n - 1);
          scroll.world = w;
          // Un'unica fonte di verità anche per `cases`: con due trigger
          // separati che scrivevano sulla stessa variabile, nelle zone di
          // sovrapposizione vinceva l'ultimo che aggiornava e la scena
          // restava a metà strada.
          scroll.cases = Math.min(1, prog / PAD, (1 - prog) / PAD);

          // Portale: quanto siamo vicini alla soglia fra due mondi.
          //
          // La soglia comincia prima e sale più piano di quanto facesse: la
          // vecchia curva partiva a un quarto di strada e arrivava a fondo
          // scala in un soffio, così tutto — camera, materia, velo — scattava
          // insieme. Distribuito su quasi metà del tragitto, lo stesso
          // passaggio si sente come un respiro invece che come uno stacco.
          const edge = Math.abs(w - Math.round(w));
          const portal = Math.max(0, (edge - 0.12) / 0.38);
          // curva morbida in entrata e in uscita: niente spigoli sul confine
          scroll.portal = portal * portal * (3 - 2 * portal) * scroll.cases;
          if (flashRef.current) {
            // Il velo scurisce, non illumina, e non arriva mai a coprire del
            // tutto: dietro si continua a intravedere lo spazio, che è ciò che
            // tiene insieme le due stanze invece di separarle.
            flashRef.current.style.opacity = String(scroll.portal * 0.8);
            const to = w > Math.round(w) ? Math.ceil(w) : Math.floor(w);
            flashRef.current.style.setProperty(
              '--veil',
              VEIL[Math.max(0, Math.min(VEIL.length - 1, to))]
            );
          }

          // La firma tipografica del progetto, dove c'è: entra più tardi delle
          // schede e resta appena percettibile, perché è una filigrana sulla
          // scena e non un titolo che compete con quello a sinistra.
          marksRef.current.forEach((el, i) => {
            if (!el) return;
            const a = Math.max(0, 1 - Math.abs(w - i) * 2.4);
            el.style.opacity = String(a * 0.16);
            el.style.transform = `translateY(${(w - i) * 26}px)`;
          });

          // ogni scheda è piena vicino al proprio indice e sfuma allontanandosi
          cardsRef.current.forEach((el, i) => {
            if (!el) return;
            const d = Math.abs(w - i);
            // Il testo esce del tutto prima che entri il successivo. Con una
            // dissolvenza incrociata larga, a metà strada si vedevano due
            // titoli sovrapposti e nessuno dei due si leggeva: sembrava un
            // errore, non una transizione. Meglio un istante senza testo.
            const a = Math.max(0, 1 - d * 2.1);
            el.style.opacity = String(a * a);
            el.style.transform = `translateY(${(w - i) * 22}px)`;
            el.style.pointerEvents = a > 0.5 ? 'auto' : 'none';
          });
        },
      });

      // Uscita dal portfolio. Superata l'ultima stanza, `scroll.cases` torna a
      // zero e senza questo il cubo dell'hero tornerebbe grande al centro,
      // attraversando il testo delle sezioni successive. Qui si misura quanto
      // ci siamo allontanati, e il cubo si richiude e va in fondo.
      ScrollTrigger.create({
        trigger: section,
        start: 'bottom bottom',
        end: 'bottom top',
        onUpdate: (self) => {
          scroll.after = self.progress;
        },
        onLeave: () => {
          scroll.after = 1;
        },
        onLeaveBack: () => {
          scroll.after = 0;
        },
      });
    }, section);

    return () => ctx.revert();
  }, [reduced]);

  // Una viewport e mezza per stanza invece di una: con una scrollata veloce le
  // stanze passavano prima di essersi mostrate. Non è lo scroll a rallentare —
  // è ogni progetto ad avere il tempo di esistere.
  return (
    <section
      ref={sectionRef}
      className="mp-cases"
      id="portfolio"
      style={{ height: `${PROJECTS.length * 148 + 70}vh` }}
    >
      <div ref={flashRef} className="mp-cases-flash" aria-hidden />
      <div className="mp-cases-pin">
        <p className="mp-kicker mp-cases-kicker">02 — Portfolio</p>

        <div className="mp-cases-stack">
          {PROJECTS.map((p, i) => (
            <div
              key={p.id}
              className="mp-case"
              ref={(el) => {
                cardsRef.current[i] = el;
              }}
              style={reduced ? undefined : { opacity: i === 0 ? 1 : 0 }}
            >
              <p className="mp-case-num">{String(i + 1).padStart(2, '0')}</p>
              <h3 className="mp-case-client">{p.client}</h3>
              <p className="mp-case-type">{p.type}</p>
              <p className="mp-case-line">{p.line}</p>
              <p className="mp-case-matter">
                <span>Materia</span> {p.matter}
              </p>
            </div>
          ))}
        </div>

        {PROJECTS.map((p, i) =>
          p.wordmark ? (
            <div
              key={`m-${p.id}`}
              className="mp-cases-mark"
              aria-hidden
              ref={(el) => {
                marksRef.current[i] = el;
              }}
              style={reduced ? undefined : { opacity: 0 }}
            >
              {p.wordmark}
            </div>
          ) : null
        )}

        <div className="mp-cases-index" aria-hidden>
          {PROJECTS.map((p, i) => (
            <span key={p.id} className="mp-cases-tick" data-i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
