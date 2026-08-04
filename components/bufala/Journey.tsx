'use client';

// Il viaggio: un palco fisso più uno spacer che genera lo scroll.
// Tutto è funzione pura del progresso `p` — nessuna scena ha stato proprio,
// così il viaggio è reversibile per costruzione (stesso principio di
// Mondial Service, TECH_ARCHITECTURE.md §1).

import { useEffect, useRef } from 'react';
import { SCENES, TOTAL_VH, sceneWeight, localT, span, smooth, pAt } from '@/lib/bufala/scenes';
import { sceneCopy } from '@/content/bufala/copy';
import { initScroll } from '@/lib/bufala/scroll';
import { Stage } from './Stage';
import { Progresso } from './Progresso';

export function Journey() {
  const spacerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const veloRef = useRef<HTMLDivElement>(null);
  /** Progresso master, fuori da React: si aggiorna a ogni frame senza
   *  rerender (un setState per frame ucciderebbe il frame budget). */
  const p = useRef(0);

  useEffect(() => {
    const spacer = spacerRef.current;
    const overlay = overlayRef.current;
    if (!spacer || !overlay) return;

    const ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (ridotto) return; // il CSS mostra già tutto, senza animazione

    // Lo scroll morbido è parte della regia, non un effetto: senza, il
    // ritmo cerimonioso di DIRECTION_BUFALA.md §6 non esiste.
    const fermaScroll = initScroll();

    const scene = Array.from(
      overlay.querySelectorAll<HTMLElement>('[data-scena]'),
    );

    let raf = 0;
    /** Progresso inseguito con smorzamento: lo scroll non strappa mai
     *  (Direzione §6 — ritmo cerimonioso). */
    let smoothed = 0;
    let ultimo = performance.now();
    /** L'ultimo valore effettivamente disegnato. Serve a non riscrivere gli
     *  stessi stili quando la pagina è ferma: il loop continua a girare
     *  (deve, per riprendere subito allo scroll successivo) ma smette di
     *  toccare il DOM. Su un telefono di fascia media questo è la
     *  differenza fra un viaggio fluido e uno che scalda. */
    let disegnato = -1;

    const leggiScroll = () => {
      const alt = spacer.offsetHeight - window.innerHeight;
      const y = -spacer.getBoundingClientRect().top;
      p.current = alt > 0 ? Math.min(Math.max(y / alt, 0), 1) : 0;
    };

    const frame = (ora: number) => {
      const dt = Math.min((ora - ultimo) / 1000, 0.1);
      ultimo = ora;

      // Smorzamento esponenziale, indipendente dal frame rate.
      smoothed += (p.current - smoothed) * (1 - Math.exp(-9 * dt));

      // Se il valore non è cambiato abbastanza da spostare un pixel, non c'è
      // niente da riscrivere. La soglia è un decimillesimo del viaggio: su
      // diciotto viewport di scroll è meno di un pixel.
      if (Math.abs(smoothed - disegnato) < 0.00005) {
        raf = requestAnimationFrame(frame);
        return;
      }
      disegnato = smoothed;

      const velo = veloRef.current;
      const overlay = overlayRef.current;
      for (const el of scene) {
        const id = el.dataset.scena as (typeof SCENES)[number]['id'];
        const peso = sceneWeight(smoothed, id);
        el.style.opacity = String(peso);
        // Deriva verticale minima: il testo respira, non "entra".
        const t = localT(smoothed, id);
        el.style.transform = `translate3d(0, ${(0.5 - t) * 2.5}rem, 0)`;
        el.style.visibility = peso < 0.01 ? 'hidden' : 'visible';
      }

      // Il velo: fermo a zero per tutto il viaggio, si allarga nell'ultima
      // scena. Il raggio arriva oltre il 100% perché un cerchio deve coprire
      // anche gli angoli, che stanno più lontani del bordo.
      // Il velo: fermo per tutto il viaggio, si allarga nell'ultima scena.
      // Il testo del viaggio si ritira mentre il latte avanza — senza,
      // l'ultimo titolo resterebbe tagliato a metà dal bordo del velo, e
      // sopra il latte sarebbe comunque illeggibile (è latte su latte).
      // Il velo raccoglie il bianco del filmato e lo porta al latte della
      // pagina. Parte a metà dell'ultima scena, quando il latte sta già
      // invadendo il fotogramma: non è lui a fare la transizione, la
      // continua — e serve solo perché il bianco della ripresa e il latte
      // del documento non sono lo stesso bianco, e il salto si vedrebbe.
      const q = smooth(span(smoothed, pAt('s06', 0.5), 1));
      if (velo) {
        velo.style.transform = `scale(${q.toFixed(4)})`;
        velo.style.visibility = q < 0.002 ? 'hidden' : 'visible';
      }
      if (overlay) overlay.style.opacity = (1 - smooth(span(smoothed, pAt('s05', 0.9), pAt('s06', 0.35)))).toFixed(3);

      Stage.render(smoothed);
      Progresso.render(smoothed);
      raf = requestAnimationFrame(frame);
    };

    leggiScroll();
    window.addEventListener('scroll', leggiScroll, { passive: true });
    window.addEventListener('resize', leggiScroll);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', leggiScroll);
      window.removeEventListener('resize', leggiScroll);
      fermaScroll();
    };
  }, []);

  return (
    <>
      <Stage />
      <Progresso />

      {/* Il velo di latte.

          La ripresa finisce con il latte che cola dal taglio. Invece di
          spegnere la scena sul verde e ricominciare da capo con il
          documento, è il latte stesso ad aprirlo: una goccia si allarga dal
          punto in cui cadeva finché non riempie lo schermo, e quello che
          resta è la pagina chiara. Il distacco fra le due metà del sito non
          è uno stacco, è una conseguenza.

          Cresce come cerchio e non come dissolvenza perché una dissolvenza
          si legge come "cambio pagina", mentre un cerchio che si allarga da
          un punto preciso si legge come una cosa che è appena successa. */}
      <div ref={veloRef} className="velo-latte" aria-hidden="true" />

      <div ref={overlayRef} className="bufala-overlay" aria-hidden="true">
        {SCENES.map((s) => {
          const c = sceneCopy[s.id];
          // La hero ha una composizione propria: headline in alto, payoff
          // in fondo al campo. Tutte le altre scene condividono lo stesso
          // impaginato, perché la ripetizione è ciò che tiene il ritmo.
          const hero = Boolean(c.payoff);
          return (
            <div
              key={s.id}
              className={hero ? 'scena scena--hero' : 'scena'}
              data-scena={s.id}
              // La hero parte visibile, tutte le altre scene no.
              //
              // Sembra un dettaglio e non lo è: finché anche la hero partiva
              // da zero, l'HTML servito conteneva *dodici* elementi tutti a
              // opacità zero, e bastava che il JavaScript non partisse —
              // un chunk non trovato perché il browser teneva in cache una
              // pagina di un deploy precedente, una connessione che cade, un
              // errore qualsiasi — perché il sito fosse una schermata verde
              // vuota. Nessun messaggio, nessun contenuto: niente.
              //
              // Il movimento è un miglioramento progressivo; la prima
              // schermata no, quella deve esserci comunque.
              style={{ opacity: hero ? 1 : 0 }}
            >
              {c.marchio && <p className="marchio-testo">{c.marchio}</p>}
              <h1>{c.titolo}</h1>
              {c.sottotitolo && <p className="sottotitolo">{c.sottotitolo}</p>}
              {hero && <span aria-hidden="true" />}
              {c.payoff && <p className="payoff">{c.payoff}</p>}
              {c.nota && !hero && <p className="micro nota">{c.nota}</p>}
              {c.nota && hero && <p className="micro invito">{c.nota}</p>}
            </div>
          );
        })}
      </div>

      {/* Lo spacer genera lo scroll del viaggio: la sua altezza è la somma
          delle durate dichiarate nella scaletta. */}
      <div
        ref={spacerRef}
        className="bufala-spacer"
        style={{ height: `${TOTAL_VH * 100}svh` }}
      />

      {/* Il documento leggibile senza JavaScript e senza movimento: le stesse
          parole del viaggio, in ordine. Il 3D è progressive enhancement. */}
      <noscript>
        <div className="bufala-sezioni">
          {SCENES.map((s) => (
            <section key={s.id} className="bufala-sezione">
              <h2>{sceneCopy[s.id].titolo}</h2>
              {sceneCopy[s.id].nota && <p>{sceneCopy[s.id].nota}</p>}
            </section>
          ))}
        </div>
      </noscript>
    </>
  );
}
