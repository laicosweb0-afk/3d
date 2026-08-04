'use client';

// La vetrina dei prodotti: si scorre di lato, non in verticale.
//
// La prima versione era una sezione alta dieci schermate che bloccava il
// palco e usava lo scorrimento della pagina. Funzionava, ma allungava il
// sito di dieci schermate per cinque prodotti, e ogni trascinamento
// spostava lo scorrimento vero della pagina — che con lo scorrimento
// smorzato attivo si accavallava e faceva scattare tutto.
//
// Ora la sezione è alta una schermata sola e il filmato ha una sua
// posizione interna, comandata dal gesto laterale: trascinamento col dito,
// trascinamento col mouse, rotellina orizzontale del trackpad. La pagina
// non viene toccata, quindi lo scorrimento verticale resta libero e non c'è
// niente che possa entrare in conflitto.
//
// Lo smorzamento è lo stesso del viaggio: la posizione insegue il bersaglio
// in modo esponenziale e indipendente dal frame rate. È questo a togliere
// gli scatti — senza, ogni evento del dito diventa un salto del fotogramma.

import { useEffect, useRef } from 'react';
import { vetrina, tappe } from '@/content/bufala/vetrina';
import { prodotti } from '@/content/bufala/assets';
import { sezioni } from '@/content/bufala/copy';

/** Quanto bisogna trascinare per attraversare tutta la vetrina, in larghezze
 *  di schermo. Sotto 2 la processione vola via con un gesto solo; sopra 3
 *  diventa faticosa. */
const CORSA = 2.4;

/** Semiampiezza della dissolvenza fra un nome e il successivo, in secondi di
 *  filmato. Stretta: l'incrocio deve essere un cambio, non una doppia
 *  esposizione. */
const MEZZA = 0.35;

/** Smoothstep: la curva di dissolvenza usata in tutto il sito. */
function lisci(x: number): number {
  const t = x < 0 ? 0 : x > 1 ? 1 : x;
  return t * t * (3 - 2 * t);
}

export function Vetrina() {
  const sezione = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const nomi = useRef<HTMLDivElement>(null);
  const barra = useRef<HTMLDivElement>(null);
  const guida = useRef<HTMLDivElement>(null);
  const cursore = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const sez = sezione.current;
    const v = video.current;
    if (!sez || !v) return;

    const fermo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (fermo) return;

    // Il filmato non si scarica all'apertura della pagina: sono megabyte che
    // chi non arriva fin qui non deve pagare.
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

    // Il ciclo gira solo quando la vetrina è in vista: fuori non c'è niente
    // da disegnare, e tenerlo acceso costerebbe batteria per nulla.
    let inVista = false;
    const osservatore = new IntersectionObserver(
      (voci) => {
        for (const x of voci) {
          inVista = x.isIntersecting;
          if (inVista) {
            monta();
            avvia();
          }
        }
      },
      { rootMargin: '80% 0px' },
    );
    osservatore.observe(sez);

    // iOS non scarica un video finché non c'è stata un'interazione, e su rete
    // cellulare ignora `preload`: un play seguito subito da un pause al primo
    // gesto autorizza l'elemento a spostarsi nel tempo.
    const sblocca = () => {
      monta();
      const avvio = v.play();
      if (avvio && typeof avvio.then === 'function') avvio.then(() => v.pause()).catch(() => {});
      else v.pause();
    };
    const unaVolta = { once: true, passive: true } as const;
    window.addEventListener('touchstart', sblocca, unaVolta);
    window.addEventListener('pointerdown', sblocca, unaVolta);

    let bersaglio = 0; // dove il gesto ha portato la vetrina, 0..1
    let posizione = 0; // dove si trova adesso: insegue il bersaglio
    let raf = 0;
    let ultimo = 0;

    const disegna = (ora: number) => {
      const dt = Math.min((ora - ultimo) / 1000, 0.1);
      ultimo = ora;

      // Smorzamento esponenziale, indipendente dal frame rate: è quello che
      // toglie gli scatti. Senza, ogni evento del dito è un salto.
      posizione += (bersaglio - posizione) * (1 - Math.exp(-11 * dt));

      const durata = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 15;
      if (Number.isFinite(v.duration) && v.duration > 0) {
        const t = posizione * (v.duration - 0.05);
        if (Math.abs(v.currentTime - t) > 1 / 60) v.currentTime = t;
      }

      // Il nome del prodotto in campo. Ogni tappa possiede una regione che
      // arriva a metà strada dalle vicine ed è piena per tutta la regione: si
      // dissolve solo ai confini, dove la vicina sta già salendo. Le due
      // rampe usano la stessa curva e la stessa finestra, quindi sommano
      // sempre a uno.
      const adesso = posizione * durata;
      const elenco = nomi.current;
      if (elenco) {
        for (const [i, el] of Array.from(elenco.children).entries()) {
          const prima = i > 0 ? (tappe[i - 1].secondo + tappe[i].secondo) / 2 : -Infinity;
          const dopo = i < tappe.length - 1 ? (tappe[i].secondo + tappe[i + 1].secondo) / 2 : Infinity;
          const entrata = prima === -Infinity ? 1 : lisci((adesso - (prima - MEZZA)) / (2 * MEZZA));
          const uscita = dopo === Infinity ? 1 : lisci(((dopo + MEZZA) - adesso) / (2 * MEZZA));
          const peso = Math.max(0, Math.min(1, entrata)) * Math.max(0, Math.min(1, uscita));
          (el as HTMLElement).style.opacity = peso.toFixed(3);
        }
      }

      // Il cursore segue la posizione reale dei prodotti: non è una
      // decorazione che si muove, è dove sei dentro la selezione.
      if (cursore.current) cursore.current.style.setProperty('--pos', posizione.toFixed(4));

      // Il suggerimento ha già svolto il proprio compito appena la vetrina si
      // muove: si spegne l'animazione e il testo si ritira, ma la barra resta
      // — quella non era un suggerimento, è uno strumento.
      if (guida.current && posizione > 0.005 && guida.current.dataset.usato !== 'si') {
        guida.current.dataset.usato = 'si';
      }

      // Ci si ferma quando la posizione ha raggiunto il bersaglio: un ciclo
      // acceso su una vetrina immobile è batteria buttata.
      if (inVista && Math.abs(bersaglio - posizione) > 0.0002) {
        raf = requestAnimationFrame(disegna);
      } else {
        raf = 0;
      }
    };

    const avvia = () => {
      if (raf) return;
      ultimo = performance.now();
      raf = requestAnimationFrame(disegna);
    };

    const sposta = (dx: number) => {
      const corsa = window.innerWidth * CORSA;
      bersaglio = Math.min(Math.max(bersaglio - dx / corsa, 0), 1);
      avvia();
    };

    // Il trascinamento. `setPointerCapture` fa sì che il gesto continui a
    // essere seguito anche se il dito esce dal pannello.
    let giu = false;
    let precedente = 0;
    const premuto = (e: PointerEvent) => {
      giu = true;
      precedente = e.clientX;
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    };
    const mosso = (e: PointerEvent) => {
      if (!giu) return;
      const dx = e.clientX - precedente;
      precedente = e.clientX;
      sposta(dx);
    };
    const alzato = () => {
      giu = false;
    };

    // La rotellina orizzontale del trackpad. Solo quella: se si intercettasse
    // anche quella verticale la pagina non scorrerebbe più, ed è il difetto
    // classico delle gallerie che "catturano" lo scroll.
    const rotella = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      sposta(-e.deltaX);
    };

    sez.addEventListener('pointerdown', premuto);
    sez.addEventListener('pointermove', mosso);
    sez.addEventListener('pointerup', alzato);
    sez.addEventListener('pointercancel', alzato);
    sez.addEventListener('wheel', rotella, { passive: false });
    v.addEventListener('loadedmetadata', avvia);

    return () => {
      osservatore.disconnect();
      cancelAnimationFrame(raf);
      sez.removeEventListener('pointerdown', premuto);
      sez.removeEventListener('pointermove', mosso);
      sez.removeEventListener('pointerup', alzato);
      sez.removeEventListener('pointercancel', alzato);
      sez.removeEventListener('wheel', rotella);
      v.removeEventListener('loadedmetadata', avvia);
      window.removeEventListener('touchstart', sblocca);
      window.removeEventListener('pointerdown', sblocca);
    };
  }, []);

  return (
    <section ref={sezione} className="bufala-vetrina" id="prodotti">
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
          {/* `data-src` e non `src`: il filmato pesa, e chi non arriva fin qui
              non deve scaricarlo. */}
          <source data-src={vetrina.webm} type="video/webm" />
          <source data-src={vetrina.mp4} type="video/mp4" />
        </video>
      </div>

      {/* I nomi: testo vivo sopra il pannello, mai dentro il filmato. Un nome
          scritto in HTML è sempre corretto e sempre leggibile; una scritta
          stampata dentro un video generato non lo è. */}
      <div className="vetrina-nomi" ref={nomi}>
        {tappe.map((t) => (
          <p className="vetrina-nome" key={t.nome} style={{ opacity: 0 }}>
            <span className="nome">{t.nome}</span>
            {t.produttore && <span className="micro">{t.produttore}</span>}
          </p>
        ))}
      </div>

      {/* La guida.

          Un carosello che non dichiara di essere trascinabile viene guardato
          come una fotografia: nessuno prova a spostare un'immagine. Ma un
          cartello che dice "trascinami" è un'istruzione, e le istruzioni
          rompono il tono. Qui il suggerimento e lo strumento sono la stessa
          cosa: una frase, e sotto una barra che è già l'indicatore di dove
          sei nella selezione.

          Il testo è una frase in tondo, non un'etichetta in maiuscoletto
          tracciato: è quello che lo fa leggere come qualcosa da leggere
          invece che come decorazione. */}
      <div className="vetrina-guida" ref={guida}>
        <p className="guida-testo">
          {/* L'icona è una miniatura dell'indicatore stesso: una linea e un
              punto che scivola. Il gesto è disegnato, non spiegato. */}
          <span className="guida-icona" aria-hidden="true" />
          {sezioni.prodotti.invito}
        </p>
        <div className="guida-pista">
          <span className="guida-cursore" ref={cursore} />
        </div>
      </div>

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
