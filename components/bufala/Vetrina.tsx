'use client';

// La vetrina dei prodotti: il viaggio ruotato di novanta gradi.
//
// Il palco resta fermo mentre la sezione scorre, e lo scorrimento comanda il
// fotogramma del filmato invece di spostare la pagina. Avanti la processione
// avanza, indietro si riavvolge. Non c'è nessuna animazione in corso da
// interrompere, quindi cambiare direzione a metà di un'uscita non rompe
// niente: il prodotto che stava uscendo rientra, ed è corretto così.
//
// Il trascinamento laterale col dito non è un secondo meccanismo: sposta lo
// scorrimento della pagina. Una manopola sola, due modi di girarla — se ce
// ne fossero due davvero, prima o poi si contraddirebbero.
//
// Il filmato è un pannello, non uno schermo pieno. Il motivo è misurato: un
// video 16:9 in `cover` su un telefono mostra solo la fascia centrale del 26%
// della larghezza, e una processione che entra ed esce lateralmente andrebbe
// quasi tutta perduta. In un pannello si vede tutto su ogni schermo, e la
// forma incorniciata è anche quello che la sezione è: una vetrina.

import { useEffect, useRef } from 'react';
import { vetrina, tappe } from '@/content/bufala/vetrina';
import { prodotti } from '@/content/bufala/assets';

/** Quanto scorrimento occupa la vetrina, in altezze di viewport. Quindici
 *  secondi su dieci viewport: circa due per prodotto, più svelto del viaggio
 *  perché qui si consulta, non si contempla. */
export const VETRINA_VH = 10;

/** Quanti pixel di trascinamento valgono un pixel di scorrimento. Sopra 1 il
 *  gesto corre più del dito e sembra scivoloso. */
const TRASCINAMENTO = 1.15;

export function Vetrina() {
  const sezione = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const nomi = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sez = sezione.current;
    const v = video.current;
    if (!sez || !v) return;

    const fermo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (fermo) return;

    // Il filmato non si scarica all'apertura della pagina: sono megabyte che
    // chi non arriva fin qui non deve pagare. Le sorgenti si montano solo
    // quando la sezione si avvicina.
    let montato = false;
    const monta = () => {
      if (montato) return;
      montato = true;
      for (const s of Array.from(v.querySelectorAll('source'))) {
        const url = s.dataset.src;
        if (url) s.src = url;
      }
      v.load();
    };
    const osservatore = new IntersectionObserver(
      (voci) => {
        if (voci.some((x) => x.isIntersecting)) {
          monta();
          osservatore.disconnect();
        }
      },
      { rootMargin: '150% 0px' },
    );
    osservatore.observe(sez);

    // iOS non scarica un video finché non c'è stata un'interazione, e su rete
    // cellulare ignora preload: un play seguito subito da un pause al primo
    // gesto autorizza l'elemento a spostarsi nel tempo. Stessa medicina già
    // necessaria per il filmato del viaggio.
    const sblocca = () => {
      monta();
      const avvio = v.play();
      if (avvio && typeof avvio.then === 'function') avvio.then(() => v.pause()).catch(() => {});
      else v.pause();
    };
    const unaVolta = { once: true, passive: true } as const;
    window.addEventListener('touchstart', sblocca, unaVolta);
    window.addEventListener('pointerdown', sblocca, unaVolta);
    window.addEventListener('scroll', sblocca, unaVolta);

    let raf = 0;
    let ultimo = -1;

    const disegna = () => {
      const r = sez.getBoundingClientRect();
      const corsa = r.height - window.innerHeight;
      const q = corsa > 0 ? Math.min(Math.max(-r.top / corsa, 0), 1) : 0;

      if (Number.isFinite(v.duration) && v.duration > 0) {
        const t = q * (v.duration - 0.05);
        if (Math.abs(v.currentTime - t) > 1 / 60) v.currentTime = t;
      }

      // Il nome del prodotto più vicino al centro in questo istante. Compare
      // e sparisce con la distanza dal proprio momento, così le schede non si
      // accavallano mai e non c'è un istante senza nessun nome.
      const durata = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 15;
      const adesso = q * durata;
      const elenco = nomi.current;
      if (elenco) {
        const passo = durata / Math.max(tappe.length, 1);
        for (const [i, el] of Array.from(elenco.children).entries()) {
          const d = Math.abs(adesso - tappe[i].secondo) / passo;
          const peso = Math.max(0, 1 - d * 1.6);
          (el as HTMLElement).style.opacity = peso.toFixed(3);
          (el as HTMLElement).style.transform = `translate3d(0, ${((1 - peso) * 0.6).toFixed(2)}rem, 0)`;
        }
      }

      ultimo = q;
      raf = 0;
    };

    const chiedi = () => {
      if (raf) return;
      raf = requestAnimationFrame(disegna);
    };

    // Il trascinamento laterale sposta lo scorrimento della pagina: una
    // manopola sola, due modi di girarla.
    let giu = false;
    let partenza = 0;
    const premuto = (e: PointerEvent) => {
      giu = true;
      partenza = e.clientX;
    };
    const mosso = (e: PointerEvent) => {
      if (!giu) return;
      const dx = e.clientX - partenza;
      partenza = e.clientX;
      window.scrollBy({ top: -dx * TRASCINAMENTO, behavior: 'instant' as ScrollBehavior });
    };
    const alzato = () => {
      giu = false;
    };

    sez.addEventListener('pointerdown', premuto);
    window.addEventListener('pointermove', mosso, { passive: true });
    window.addEventListener('pointerup', alzato, { passive: true });
    window.addEventListener('pointercancel', alzato, { passive: true });

    window.addEventListener('scroll', chiedi, { passive: true });
    window.addEventListener('resize', chiedi);
    v.addEventListener('loadedmetadata', chiedi);
    chiedi();

    return () => {
      osservatore.disconnect();
      cancelAnimationFrame(raf);
      sez.removeEventListener('pointerdown', premuto);
      window.removeEventListener('pointermove', mosso);
      window.removeEventListener('pointerup', alzato);
      window.removeEventListener('pointercancel', alzato);
      window.removeEventListener('scroll', chiedi);
      window.removeEventListener('resize', chiedi);
      window.removeEventListener('touchstart', sblocca);
      window.removeEventListener('pointerdown', sblocca);
      window.removeEventListener('scroll', sblocca);
      v.removeEventListener('loadedmetadata', chiedi);
      void ultimo;
    };
  }, []);

  return (
    <section
      ref={sezione}
      className="bufala-vetrina"
      id="prodotti"
      style={{ height: `${VETRINA_VH * 100}svh` }}
    >
      <div className="vetrina-palco">
        <div className="vetrina-pannello">
          <video
            ref={video}
            className="vetrina-video"
            poster={vetrina.poster}
            muted
            playsInline
            preload="none"
            aria-hidden="true"
          >
            {/* `data-src` e non `src`: il filmato pesa, e chi non arriva fin
                qui non deve scaricarlo. Le sorgenti si montano quando la
                sezione si avvicina. */}
            <source data-src={vetrina.webm} type="video/webm" />
            <source data-src={vetrina.mp4} type="video/mp4" />
          </video>
        </div>

        {/* I nomi: testo vivo sopra il pannello, mai dentro il filmato. Un
            nome scritto in HTML è sempre corretto e sempre leggibile; una
            scritta stampata dentro un video generato non lo è. */}
        <div className="vetrina-nomi" ref={nomi}>
          {tappe.map((t) => (
            <p className="vetrina-nome" key={t.nome} style={{ opacity: 0 }}>
              <span className="nome">{t.nome}</span>
              {t.produttore && <span className="micro">{t.produttore}</span>}
            </p>
          ))}
        </div>
      </div>

      {/* Senza JavaScript, senza filmato o con il movimento ridotto restano le
          fotografie vere, in fila e con i loro nomi. La vetrina è un
          miglioramento; i prodotti no, quelli devono esserci sempre. */}
      <noscript>
        <div className="bufala-fila">
          {prodotti.map((p) => (
            <img key={p.src} src={p.src} alt={p.alt} width={824} height={900} />
          ))}
        </div>
      </noscript>
    </section>
  );
}
