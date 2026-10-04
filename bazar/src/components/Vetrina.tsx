import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Articolo, Collezione } from '../config/catalogo';
import { NEGOZIO } from '../config/gioco';
import { tick as tickAptico, tocco as toccoAptico } from '../lib/haptics';
import { pop } from '../lib/suono';

/** Il percorso di un file in `public/`, servito anche da una sottocartella. */
const url = (f: string) => import.meta.env.BASE_URL + f.replace(/^\/+/, '');

/** I contatori a due cifre: «01 / 04», come nelle schede di prodotto. */
const due = (n: number) => String(n).padStart(2, '0');

const riduci = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------ */
/* Il riquadro di una collezione, con il carosello in 3D               */
/* ------------------------------------------------------------------ */

/**
 * Un riquadro arrotondato, alla maniera di Apple: titolo grande, una riga
 * sotto, e dentro il carosello.
 *
 * Il carosello è uno scorrimento orizzontale vero, con l'aggancio al centro:
 * lo muove il dito, non un'animazione, quindi segue l'inerzia del telefono e
 * non litiga con lo scorrimento della pagina. Il 3D è una funzione pura della
 * posizione: a ogni fotogramma ogni copertina guarda quanto dista dal centro
 * e si gira, si allontana e si scurisce di conseguenza — come i prodotti in
 * processione della vetrina della Bufala, ma con le foto vere e senza un
 * filmato da scaricare.
 */
export function RiquadroCollezione({
  collezione, preferiti, onApri,
}: {
  collezione: Collezione;
  preferiti: Set<string>;
  onApri: (a: Articolo) => void;
}) {
  const binario = useRef<HTMLDivElement>(null);
  const [corrente, setCorrente] = useState(0);
  const ultimo = useRef(0);

  /* Il 3D: per ogni copertina, la distanza dal centro in larghezze di carta.
   * A 0 è dritta e piena; a ±1 è girata di 34°, più piccola e più indietro;
   * oltre resta lì, sfumata. */
  const disegna = useCallback(() => {
    const b = binario.current;
    if (!b) return;
    const centro = b.scrollLeft + b.clientWidth / 2;
    const carte = Array.from(b.children) as HTMLElement[];
    let vicina = 0, minima = Infinity;
    const piatto = riduci();
    // Il passo vero fra due copertine: si sovrappongono un poco, come nel
    // coverflow, e la distanza non è la larghezza.
    const passo = carte.length > 1 ? carte[1].offsetLeft - carte[0].offsetLeft : 1;
    carte.forEach((c, i) => {
      const d = (c.offsetLeft + c.offsetWidth / 2 - centro) / passo;
      // Quella in centro sta sopra le vicine.
      c.style.zIndex = String(100 - Math.round(Math.abs(d) * 10));
      if (Math.abs(d) < minima) { minima = Math.abs(d); vicina = i; }
      const a = Math.max(-1.6, Math.min(1.6, d));
      const dentro = c.firstElementChild as HTMLElement | null;
      if (!dentro) return;
      if (piatto) { dentro.style.transform = ''; dentro.style.opacity = ''; return; }
      const giro = -a * 34;
      const fondo = Math.abs(a) * 90;
      const scala = 1 - Math.min(Math.abs(a), 1) * 0.1;
      dentro.style.transform =
        `perspective(900px) translateZ(${-fondo}px) rotateY(${giro}deg) scale(${scala})`;
      dentro.style.setProperty('--luce', (1 - Math.min(Math.abs(a), 1) * 0.45).toFixed(3));
      // La foto dentro scorre un poco al contrario: è la profondità.
      const img = dentro.querySelector('img');
      if (img) img.style.transform = `translateX(${(a * -6).toFixed(2)}%) scale(1.14)`;
    });
    if (vicina !== ultimo.current) {
      ultimo.current = vicina;
      setCorrente(vicina);
      tickAptico();
    }
  }, []);

  useLayoutEffect(() => { disegna(); }, [disegna]);

  useEffect(() => {
    const b = binario.current;
    if (!b) return;
    let raf = 0;
    const scorre = () => {
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; disegna(); });
    };
    b.addEventListener('scroll', scorre, { passive: true });
    window.addEventListener('resize', scorre);
    return () => {
      b.removeEventListener('scroll', scorre);
      window.removeEventListener('resize', scorre);
      cancelAnimationFrame(raf);
    };
  }, [disegna]);

  /* La rotellina orizzontale del trackpad scorre già da sé; quella
   * verticale no, e va lasciata alla pagina: niente da intercettare. */

  const art = collezione.articoli[corrente];

  return (
    <section className="riquadro" aria-labelledby={`titolo-${collezione.id}`}>
      <header className="riquadro-testa">
        <h2 className="riquadro-titolo" id={`titolo-${collezione.id}`}>{collezione.titolo}</h2>
        <p className="riquadro-sotto">{collezione.sottotitolo}</p>
      </header>

      <div
        ref={binario}
        // I nomi delle classi scritti per intero: Tailwind tiene solo quelle che
        // trova nel codice, e un `binario-${forma}` composto non lo vede.
        className={collezione.forma === 'alta' ? 'binario binario-alta' : 'binario binario-larga'}
        role="list"
        aria-label={`${collezione.titolo}: scorri per vederli tutti`}
      >
        {collezione.articoli.map((a, i) => (
          <div className="binario-posto" role="listitem" key={a.id}>
            <button
              type="button"
              className="carta3d"
              onClick={() => { toccoAptico(); pop(); onApri(a); }}
              aria-label={`${a.nome}: apri le foto`}
            >
              <img src={url(a.foto[0])} alt="" draggable={false}
                loading={i < 2 ? 'eager' : 'lazy'} />
              {a.novita && <span className="carta3d-novita">Novità</span>}
              {preferiti.has(a.id) && <span className="carta3d-cuore" aria-label="Nei preferiti">♥</span>}
              {a.foto.length > 1 && (
                <span className="carta3d-conta" aria-hidden>{a.foto.length} foto</span>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Il prodotto in centro, come in una scheda Apple: il nome, le finiture
          in una riga, e sotto il contatore e una sola azione. Niente altro:
          la foto sopra fa già il lavoro. La chiave fa rientrare il testo
          sfumato quando cambia l'articolo. */}
      <div className="prodotto" aria-live="polite">
        <div key={art.id} className="prodotto-in">
          <p className="prodotto-nome">{art.nome}</p>
          <p className="prodotto-meta">{art.dettagli.join(' · ')}</p>
        </div>
        <div className="prodotto-barra">
          <span className="prodotto-conta" aria-label={`Articolo ${corrente + 1} di ${collezione.articoli.length}`}>
            {due(corrente + 1)} <span className="sep">/</span> {due(collezione.articoli.length)}
          </span>
          <button type="button" className="pill" onClick={() => { toccoAptico(); pop(); onApri(art); }}>
            Scopri <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* La scheda dell'articolo: a tutto schermo, con le foto da scorrere   */
/* ------------------------------------------------------------------ */

/**
 * Sale dal basso come un foglio di iOS. Le foto si scorrono di lato, una per
 * schermata, con i puntini e il contatore; sotto, il nome, i dettagli e il
 * cuore per metterlo fra i preferiti.
 *
 * Si chiude con la crocetta, toccando fuori, o con Esc. Mentre è aperta la
 * pagina sotto non scorre.
 *
 * Si monta sul `body` con un portale: le schermate entrano con una
 * trasformazione, e dentro un antenato trasformato `position: fixed` smette
 * di riferirsi allo schermo.
 */
export function SchedaArticolo({
  articolo, forma, preferito, onPreferito, onChiudi,
}: {
  articolo: Articolo;
  forma: Collezione['forma'];
  preferito: boolean;
  onPreferito: () => void;
  onChiudi: () => void;
}) {
  const galleria = useRef<HTMLDivElement>(null);
  const chiudi = useRef<HTMLButtonElement>(null);
  const [foto, setFoto] = useState(0);
  const [uscita, setUscita] = useState(false);

  const via = useCallback(() => {
    if (riduci()) { onChiudi(); return; }
    setUscita(true);
    setTimeout(onChiudi, 260);
  }, [onChiudi]);

  useEffect(() => {
    const prima = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    chiudi.current?.focus({ preventScroll: true });
    const tasto = (e: KeyboardEvent) => { if (e.key === 'Escape') via(); };
    window.addEventListener('keydown', tasto);
    return () => {
      document.body.style.overflow = prima;
      window.removeEventListener('keydown', tasto);
    };
  }, [via]);

  useEffect(() => {
    const g = galleria.current;
    if (!g) return;
    const scorre = () => {
      const i = Math.round(g.scrollLeft / g.clientWidth);
      setFoto((f) => (f !== i ? (tickAptico(), i) : f));
    };
    g.addEventListener('scroll', scorre, { passive: true });
    return () => g.removeEventListener('scroll', scorre);
  }, []);

  const vai = (i: number) => {
    const g = galleria.current;
    if (g) g.scrollTo({ left: i * g.clientWidth, behavior: riduci() ? 'auto' : 'smooth' });
  };

  return createPortal(
    <div className={`scheda-velo${uscita ? ' via' : ''}`} onClick={via}>
      <div
        className="scheda" role="dialog" aria-modal="true" aria-label={articolo.nome}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="scheda-maniglia" aria-hidden />
        <button ref={chiudi} type="button" className="scheda-chiudi" onClick={via} aria-label="Chiudi">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>

        <div ref={galleria} className={forma === 'alta' ? 'galleria galleria-alta' : 'galleria galleria-larga'}>
          {articolo.foto.map((f, i) => (
            <figure className="galleria-foto" key={f}>
              <img src={url(f)} alt={`${articolo.nome}, foto ${i + 1}`}
                loading={i === 0 ? 'eager' : 'lazy'} draggable={false} />
            </figure>
          ))}
        </div>

        {articolo.foto.length > 1 && (
          <div className="galleria-punti">
            {articolo.foto.map((f, i) => (
              <button
                key={f} type="button" className="punto"
                aria-current={foto === i ? 'true' : undefined}
                aria-label={`Foto ${i + 1} di ${articolo.foto.length}`}
                onClick={() => vai(i)}
              />
            ))}
            <span className="galleria-conta">{due(foto + 1)} / {due(articolo.foto.length)}</span>
          </div>
        )}

        <div className="scheda-testo">
          {articolo.novita && <p className="eyebrow">Nuova collezione</p>}
          <h2 className="scheda-nome">{articolo.nome}</h2>
          <p className="scheda-riga">{articolo.riga}</p>
          <ul className="scheda-dettagli">
            {articolo.dettagli.map((d) => <li key={d}>{d}</li>)}
          </ul>

          <button
            type="button"
            className={`cuore${preferito ? ' pieno' : ''}`}
            aria-pressed={preferito}
            onClick={() => { toccoAptico(); pop(); onPreferito(); }}
          >
            <span aria-hidden>{preferito ? '♥' : '♡'}</span>
            {preferito ? 'Nei tuoi preferiti' : 'Aggiungi ai preferiti'}
          </button>
          <p className="scheda-nota">
            Lo trovi in showroom, {NEGOZIO.indirizzo}, Lugo.
            <br />{NEGOZIO.consegne}.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
