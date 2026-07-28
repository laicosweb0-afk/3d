'use client';

// IL VIAGGIO IN VIDEO. Dieci clip a schermo intero, scrubbate dallo scroll:
// il fotogramma è funzione di p, come tutto il resto del sito. Non c'è
// nessun "play" — è l'utente che muove il tempo.
//
// Le giunzioni non possono mostrare stacchi per costruzione: l'ultimo
// fotogramma di una clip e il primo della successiva sono lo stesso file
// (vedi GIRATO.md), e ai confini restano montate entrambe le clip, una
// sopra l'altra, agganciate a quel fotogramma condiviso.
//
// Gestione memoria: solo la clip attiva e le sue vicine immediate tengono
// il video caricato; le altre restano scariche (preload="none"). Su mobile
// dieci video montati insieme ucciderebbero la pagina.

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { progress } from '@/lib/progress';
import { CLIPS, clipAt, clipRange, estremi, progressoVideo } from '@/content/viaggio';
import { asset } from '@/lib/asset';

export function VideoJourney() {
  const vids = useRef<(HTMLVideoElement | null)[]>([]);
  const loaded = useRef<boolean[]>([]);

  useEffect(() => {
    const update = () => {
      // Il girato ragiona sul progresso dell'intero viaggio, non su quello
      // rimappato per il 3D: nel tratto iniziale sta fermo sul suo primo
      // fotogramma, pronto sotto, mentre sopra il modello costruisce la casa.
      const p = progressoVideo(progress.viaggio);
      const { i, t } = clipAt(p);

      CLIPS.forEach((c, k) => {
        const v = vids.current[k];
        if (!v) return;
        const near = Math.abs(k - i) <= 1;

        // caricamento pigro: la clip parte a scaricare solo quando diventa
        // vicina; una volta caricata resta (il browser gestisce la cache)
        if (near && !loaded.current[k]) {
          loaded.current[k] = true;
          v.preload = 'auto';
          v.load();
        }

        // visibile solo l'attiva; le vicine restano montate e pre-posizionate
        // sul fotogramma di confine, così al passaggio non c'è nulla da
        // cercare: il fotogramma condiviso è già pronto sotto.
        v.style.opacity = k === i ? '1' : '0';
        if (!near) return;

        const { da, a } = estremi(k);
        let target: number;
        if (k === i) target = t;
        else if (k < i) target = a;  // vicina precedente: ferma sul suo ultimo
        else target = da;            // vicina successiva: ferma sul suo primo
        const dur = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : a;
        const clamped = Math.min(target, Math.max(dur - 0.001, 0));
        if (Math.abs(v.currentTime - clamped) > 0.016) {
          v.currentTime = clamped;
        }
      });
    };
    gsap.ticker.add(update);
    return () => gsap.ticker.remove(update);
  }, []);

  return (
    <div className="vj" aria-hidden="true">
      {CLIPS.map((c, k) => (
        // Due codifiche come per gli altri video del sito: webm dove c'è
        // (Chromium, Firefox), mp4 altrove (Safari). Entrambe hanno i
        // fotogrammi-chiave fitti, che è ciò che rende lo scrubbing fluido:
        // con GOP lungo il browser deve decodificare da lontano a ogni salto
        // e lo scroll singhiozza.
        <video
          key={c.id}
          ref={(el) => { vids.current[k] = el; }}
          className="vj-clip"
          muted
          playsInline
          preload="none"
        >
          <source src={asset(`/assets/video/viaggio/${c.file}.webm`)} type="video/webm" />
          <source src={asset(`/assets/video/viaggio/${c.file}.mp4`)} type="video/mp4" />
        </video>
      ))}
    </div>
  );
}

export { clipRange };
