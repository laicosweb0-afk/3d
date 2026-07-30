'use client';

// Le finestre di realtà — con PORTALI ARCHITETTONICI.
//
// Nessuna dissolvenza, nessun fade, nessun taglio visibile. Lo scambio
// 3D→reale avviene *dentro* la materia: una superficie della casa (l'anta in
// rovere, la stratigrafia, la parete in marmo) riempie completamente il
// frame seguendo il movimento di camera di quel momento, e quando si scopre
// siamo già nel reale. È il taglio nascosto del piano sequenza: l'occhio
// legge un unico movimento continuo in avanti.
//
// Tutto resta funzione pura dello scroll: reversibile, senza eventi.

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { progress } from '@/lib/progress';
import { localT, span, smooth, clamp01, sceneRange } from '@/lib/scenes';
import { REALITY_WINDOWS } from '@/content/reality';
import { asset } from '@/lib/asset';
import { afterJourney } from './Overlays';

const GRADE = 'contrast(1.045) saturate(0.96) brightness(1.005)';
// quanto presto, in progresso locale di scena, iniziare a scaricare il
// video: abbastanza in anticipo da essere pronto, non così tanto da
// competere con gli asset critici (Hero, maquette) al primo carico.
const PRELOAD_LEAD = 0.35;
// mezza ampiezza della spazzata del portale, in progresso locale di scena.
// Ampia: il legno deve attraversare il frame con peso, occupando quasi una
// schermata di scroll. Stretta com'era, passava via in un lampo e lo scambio
// si intravedeva lo stesso.
const HW = 0.30;
// quanto lontano viaggia la superficie fuori dal frame (in % di viewport)
const TRAVEL = 132;

/**
 * Posizione nella spazzata del portale, centrata su `center`:
 *  -1 = la superficie non è ancora entrata nel frame
 *   0 = copertura totale (qui avviene lo scambio, invisibile)
 *  +1 = la superficie è uscita dal frame
 */
function sweepAt(t: number, center: number): number {
  return clamp01((t - (center - HW)) / (2 * HW)) * 2 - 1;
}

export function RealityWindows() {
  const figs = useRef<(HTMLElement | null)[]>([]);
  const imgs = useRef<(HTMLImageElement | null)[]>([]);
  const vids = useRef<(HTMLVideoElement | null)[]>([]);
  const caps = useRef<(HTMLElement | null)[]>([]);
  const ports = useRef<(HTMLElement | null)[]>([]);
  const loaded = useRef<boolean[]>([]);

  useEffect(() => {
    // Il canvas 3D non si dissolve mai: viene semplicemente scambiato
    // mentre il portale copre il frame. Risoluzione pigra perché il
    // wrapper del canvas può montare dopo questo effetto.
    let canvas: HTMLElement | null = null;
    const update = () => {
      if (!canvas) canvas = document.querySelector<HTMLElement>('.world-canvas');
      const p = progress.smoothed;
      const journey = 1 - afterJourney() > 0.5; // dentro il viaggio
      let realAny = false;

      REALITY_WINDOWS.forEach((w, i) => {
        const fig = figs.current[i];
        if (!fig) return;
        const t = localT(p, w.scene);
        // localT è clampato: fuori dalla scena vale 0 o 1, quindi una
        // finestra che parte da 0 risulterebbe "accesa" anche prima della
        // sua scena. Serve sapere se ci siamo davvero dentro — è questo che
        // permette finestre contigue (0→1) senza buchi tra un anello e l'altro.
        const { p0, p1 } = sceneRange(w.scene);
        const inScene = p >= p0 && p < p1;

        // caricamento pigro: il video parte a scaricare solo quando la
        // finestra si avvicina, non al mount della pagina
        const vidEl = vids.current[i];
        if (vidEl && w.video && !loaded.current[i] && t > w.from - PRELOAD_LEAD) {
          loaded.current[i] = true;
          vidEl.preload = 'auto';
          vidEl.load();
        }

        // --- il portale: SOLO in entrata ---
        // La catena è contigua e i fotogrammi di giunzione coincidono, quindi
        // un portale in uscita sarebbe una spazzata di troppo in mezzo al
        // reale. In più, con la finestra che arriva a 1.0 la spazzata d'uscita
        // non si completerebbe mai (il progresso locale si ferma a 1) e la
        // materia resterebbe incollata a schermo pieno.
        // La spazzata è calcolata sul progresso GLOBALE, non su quello locale
        // della scena: così può stare a cavallo del confine tra due scene —
        // metà sul 3D che lasciamo, metà sul reale in cui entriamo. Calcolata
        // in locale verrebbe tagliata al bordo e non arriverebbe mai a coprire.
        const spanP = p1 - p0;
        const centerP = p0 + w.from * spanP;
        const hwP = HW * spanP;
        const sIn = clamp01((p - (centerP - hwP)) / (2 * hwP)) * 2 - 1;
        const inFlight = Math.abs(sIn) < 0.999 ? sIn : null;

        const port = ports.current[i];
        if (port && w.portal) {
          // niente vincolo di scena: il portale DEVE poter comparire prima che
          // la scena reale cominci, è lì che nasconde lo scambio
          if (inFlight === null || !journey) {
            port.style.visibility = 'hidden';
          } else {
            const axis = w.portal.axis ?? 'x';
            const dir = w.portal.dir ?? -1;
            // viaggio continuo in una sola direzione: entra, copre, esce.
            // Mai indietro, mai in dissolvenza.
            const off = (dir === -1 ? -inFlight : inFlight) * TRAVEL;
            // spinta: la superficie si avvicina mentre passa (dolly)
            const sc = 1.05 + (inFlight + 1) * 0.055;
            port.style.visibility = 'visible';
            port.style.transform =
              axis === 'x'
                ? `translate3d(${off.toFixed(2)}%,0,0) scale(${sc.toFixed(3)})`
                : `translate3d(0,${off.toFixed(2)}%,0) scale(${sc.toFixed(3)})`;
          }
        }

        // --- lo scambio: istantaneo, nascosto dalla copertura del portale ---
        const realOn = journey && inScene && t >= w.from && t < w.to;
        if (realOn) realAny = true;
        fig.style.opacity = realOn ? '1' : '0';
        fig.style.visibility = realOn ? 'visible' : 'hidden';

        // --- il reale: nessun blur, solo una lenta spinta premium ---
        // (la sensazione di dolly professionale, senza toccare lo scroll)
        const inside = clamp01((t - w.from) / Math.max(w.to - w.from, 0.001));
        const push = 1.055 - smooth(inside) * 0.055;

        const vid = vids.current[i];
        if (vid && w.video) {
          // La trasformazione si completa al 74% della finestra: l'ultimo
          // quarto è una PAUSA sulla stanza finita. Serve a far respirare il
          // gesto e a dare tempo di leggere il testo prima di ripartire.
          const morph = clamp01(inside / 0.74);
          const dur = (w.videoDuration ?? vid.duration) || 2;
          const target = smooth(morph) * Math.max(dur - 0.05, 0.05);
          if (Number.isFinite(target) && Math.abs(vid.currentTime - target) > 0.016) {
            vid.currentTime = target;
          }
          vid.style.filter = GRADE;
          vid.style.transform = `scale(${push.toFixed(4)})`;
        }
        const img = imgs.current[i];
        if (img && !w.video) {
          img.style.filter = GRADE;
          img.style.transform = `scale(${push.toFixed(4)})`;
        }

        // il testo entra dopo che siamo nel reale, e si congeda prima
        // dell'uscita: leggibile, mai a cavallo di un portale
        const cap = caps.current[i];
        if (cap) {
          // Il testo vive nella pausa: entra quando la stanza è quasi fatta e
          // resta fino a ridosso dell'uscita, così c'è davvero il tempo di leggerlo.
          const ca = realOn
            ? smooth(span(inside, 0.30, 0.46)) * (1 - smooth(span(inside, 0.88, 0.98)))
            : 0;
          cap.style.opacity = String(ca);
          cap.style.transform = `translateY(${((1 - ca) * 0.7).toFixed(2)}rem)`;
        }
      });

      // il 3D esiste o non esiste: il passaggio è coperto dalla materia
      if (canvas) canvas.style.opacity = realAny ? '0' : '1';
    };
    gsap.ticker.add(update);
    return () => gsap.ticker.remove(update);
  }, []);

  return (
    <>
      {REALITY_WINDOWS.map((w, i) => (
        <figure
          key={w.id}
          className="rw"
          ref={(el) => { figs.current[i] = el; }}
          aria-hidden="true"
        >
          {w.video ? (
            <video
              className="rw-img"
              ref={(el) => { vids.current[i] = el; }}
              muted
              playsInline
              preload="none"
              // Poster = il VERO primo fotogramma del video (grezzo), non la
              // foto finita. Con l'errore precedente, se il video non aveva
              // ancora fatto in tempo a caricare si vedeva per un attimo la
              // stanza FINITA (poster sbagliato) e subito dopo il video
              // scrubato già al grezzo: un doppio salto che sembrava un
              // pasticcio. Il download vero parte lazy (vedi PRELOAD_LEAD).
              poster={asset(`${w.video}-poster.jpg`)}
            >
              <source src={asset(`${w.video}.webm`)} type="video/webm" />
              <source src={asset(`${w.video}.mp4`)} type="video/mp4" />
            </video>
          ) : (
            <img
              className="rw-img"
              ref={(el) => { imgs.current[i] = el; }}
              src={asset(w.src)}
              alt=""
              draggable={false}
            />
          )}
          <figcaption
            className="rw-caption"
            ref={(el) => { caps.current[i] = el; }}
          >
            <span className="rw-kicker">{w.kicker}</span>
            <span className="rw-text">{w.caption}</span>
          </figcaption>
        </figure>
      ))}

      {/* I portali: la materia della casa che nasconde lo scambio */}
      {REALITY_WINDOWS.map((w, i) =>
        w.portal ? (
          <div
            key={`portal-${w.id}`}
            className="rw-portal"
            ref={(el) => { ports.current[i] = el; }}
            aria-hidden="true"
            style={{ backgroundImage: `url(${asset(w.portal.texture)})` }}
          />
        ) : null
      )}
    </>
  );
}
