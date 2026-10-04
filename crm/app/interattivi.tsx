'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { annullaCompletamento, completaAzione, posticipaAzione, ripristinaScadenza } from './azioni';

// I pezzi che hanno bisogno del dito: lo swipe, il foglio che sale da sotto,
// l'«Annulla» in basso. Tutto il resto del CRM resta renderizzato dal
// server — qui dentro ci sta solo quello che senza JavaScript non esisterebbe.
//
// Regola di casa: nessuna azione è nuova. Sono le stesse di prima, messe
// dove il pollice le trova. Niente è stato tolto: quello che prima era un
// bottone in fila ora sta nel menu «•••», e ci sta per intero.

// ---------------------------------------------------------------------------
// Icone — sempre accanto a una parola, mai da sole
// ---------------------------------------------------------------------------
const Spunta = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4.5 4.5L19 7" /></svg>
);
const Telefono = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6.2 3.5h3l1.3 3.4-2 1.4a11.5 11.5 0 0 0 5.2 5.2l1.4-2 3.4 1.3v3c0 .9-.7 1.7-1.7 1.7A14.7 14.7 0 0 1 4.5 5.2c0-1 .8-1.7 1.7-1.7Z" /></svg>
);
const Orologio = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.6" /><path d="M12 7.6V12l3 2" /></svg>
);
export const FrecciaDestra = () => (
  <span className="freccia" aria-hidden="true">
    <svg viewBox="0 0 8 13"><path d="m1 1 5.5 5.5L1 12" /></svg>
  </span>
);

// ---------------------------------------------------------------------------
// Il titolo grande che si riduce, e il "+" che si fa piccolo
// ---------------------------------------------------------------------------
export function OsservaScorrimento() {
  useEffect(() => {
    const guarda = () => {
      const giu = window.scrollY > 28;
      if ((document.body.dataset.scorso === 'si') !== giu) {
        document.body.dataset.scorso = giu ? 'si' : 'no';
      }
    };
    guarda();
    window.addEventListener('scroll', guarda, { passive: true });
    return () => window.removeEventListener('scroll', guarda);
  }, []);
  return null;
}

// ---------------------------------------------------------------------------
// Il foglio che sale da sotto. Ci sta dentro tutto quello che prima stava
// sparso in pagina: si chiude col tocco fuori, con Esc e con la maniglia.
// ---------------------------------------------------------------------------
export function Foglio({
  aperto, chiudi, titolo, children,
}: {
  aperto: boolean;
  chiudi: () => void;
  titolo: string;
  children: React.ReactNode;
}) {
  const [montato, setMontato] = useState(false);
  useEffect(() => setMontato(true), []);

  useEffect(() => {
    if (!aperto) return;
    const tasto = (e: KeyboardEvent) => { if (e.key === 'Escape') chiudi(); };
    window.addEventListener('keydown', tasto);
    const prima = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', tasto);
      document.body.style.overflow = prima;
    };
  }, [aperto, chiudi]);

  if (!aperto || !montato) return null;

  return createPortal(
    <div className="foglio-fondale" onClick={chiudi} role="presentation">
      <div
        className="foglio"
        role="dialog"
        aria-modal="true"
        aria-label={titolo}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="maniglia" aria-hidden="true" />
        <h2 className="titolo-foglio">{titolo}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}

// Un pulsante che apre un foglio: la forma più corta della stessa cosa.
export function TastoFoglio({
  etichetta, titolo, classe = 'bottone-fantasma', children, ariaLabel,
}: {
  etichetta: React.ReactNode;
  titolo: string;
  classe?: string;
  children: React.ReactNode | ((chiudi: () => void) => React.ReactNode);
  ariaLabel?: string;
}) {
  const [aperto, setAperto] = useState(false);
  const chiudi = () => setAperto(false);
  return (
    <>
      <button type="button" className={classe} aria-label={ariaLabel} onClick={() => setAperto(true)}>
        {etichetta}
      </button>
      <Foglio aperto={aperto} chiudi={chiudi} titolo={titolo}>
        {typeof children === 'function' ? children(chiudi) : children}
      </Foglio>
    </>
  );
}

// ---------------------------------------------------------------------------
// «Fatto ✓ — Annulla»: cinque secondi per cambiare idea.
//
// Il messaggio non può stare dentro la card, perché la card dopo un «Fatto»
// sparisce dalla lista. Sta nel guscio della pagina, e le card gli parlano
// da qui.
// ---------------------------------------------------------------------------
type Pendente = {
  genere: 'completata' | 'rimandata';
  testo: string;
  azioneId: string;
  contattoId: string;
  scadenzaPrima?: string;
};

let inSospeso: Pendente | null = null;
const inAscolto = new Set<() => void>();

function avvisaTutti() { inAscolto.forEach((f) => f()); }

export function segnalaFatto(p: Pendente) {
  inSospeso = p;
  avvisaTutti();
}

function scorda() {
  inSospeso = null;
  avvisaTutti();
}

export function ZonaAnnulla() {
  const [p, setP] = useState<Pendente | null>(null);

  useEffect(() => {
    const aggiorna = () => setP(inSospeso);
    inAscolto.add(aggiorna);
    aggiorna();
    return () => { inAscolto.delete(aggiorna); };
  }, []);

  useEffect(() => {
    if (!p) return;
    const orologio = setTimeout(scorda, 5000);
    return () => clearTimeout(orologio);
  }, [p]);

  if (!p) return null;

  return (
    <div className="annulla-barra" role="status" aria-live="polite">
      <span className="detto">{p.testo}</span>
      <form
        action={p.genere === 'completata' ? annullaCompletamento : ripristinaScadenza}
        onSubmit={scorda}
      >
        <input type="hidden" name="id" value={p.azioneId} />
        <input type="hidden" name="contatto_id" value={p.contattoId} />
        {p.scadenzaPrima && <input type="hidden" name="scadenza" value={p.scadenzaPrima} />}
        <button type="submit">Annulla</button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// La card di un'azione: un solo pulsante, lo swipe e il menu «•••»
// ---------------------------------------------------------------------------
const RIMANDI = [1, 3, 7];

export function CartaAzione({
  azioneId, contattoId, cosa, chi, scadenza, scaduto, scadutoDa, compatta = false,
  principale = 'Fatto', apriTelefono,
}: {
  azioneId: string;
  contattoId: string;
  cosa: string;
  /** La riga sotto: nome · importo · quando. Arriva già composta dal server. */
  chi: React.ReactNode;
  scadenza: string;
  /** Vero solo se la scadenza è passata davvero: il rosso vive qui e solo qui. */
  scaduto: boolean;
  /** Giorni interi di ritardo. Zero con scaduto vero vuol dire «scaduto oggi». */
  scadutoDa: number;
  compatta?: boolean;
  /** Se l'azione è una telefonata il gesto principale diventa «Chiama ora». */
  principale?: string;
  apriTelefono?: string | null;
}) {
  const [dx, setDx] = useState(0);
  const [trascina, setTrascina] = useState(false);
  const [foglioRimanda, setFoglioRimanda] = useState(false);
  const [foglioTutto, setFoglioTutto] = useState(false);
  const partenza = useRef(0);
  const formFatto = useRef<HTMLFormElement>(null);

  const diFatto = () => segnalaFatto({
    genere: 'completata', testo: 'Fatto ✓', azioneId, contattoId,
  });
  const diRimandato = (giorni: number) => segnalaFatto({
    genere: 'rimandata',
    testo: `Rimandato di ${giorni === 1 ? 'un giorno' : `${giorni} giorni`} ✓`,
    azioneId, contattoId, scadenzaPrima: scadenza,
  });

  return (
    <div className={`scorri${trascina ? ' trascina' : ''}`}>
      {/* Sotto la card c'è scritto cosa fa il gesto: lo swipe non è un
          indovinello, e chi non lo usa ha gli stessi comandi nel menu. */}
      <div className="scorri-sotto" aria-hidden="true">
        <span className="lato fatto"><Spunta /> Fatto</span>
        <span className="lato rimanda">Rimanda <Orologio /></span>
      </div>

      <div
        className="scorri-sopra"
        style={{ transform: `translateX(${dx}px)` }}
        onTouchStart={(e) => { partenza.current = e.touches[0].clientX; setTrascina(true); }}
        onTouchMove={(e) => {
          const d = e.touches[0].clientX - partenza.current;
          setDx(Math.max(-150, Math.min(150, d)));
        }}
        onTouchEnd={() => {
          setTrascina(false);
          if (dx > 92) { diFatto(); formFatto.current?.requestSubmit(); }
          else if (dx < -92) setFoglioRimanda(true);
          setDx(0);
        }}
        onTouchCancel={() => { setTrascina(false); setDx(0); }}
      >
        <article className={`carta-azione${compatta ? ' compatta' : ''}`}>
          {/* Il tocco sulla card apre il contatto: è la cosa che si vuole
              fare più spesso dopo aver letto di chi si tratta. */}
          <Link href={`/contatti/${contattoId}`} style={{ display: 'block' }}>
            <h3 className="cosa">{cosa}</h3>
            <p className="chi">
              {chi}
              {scaduto && (
                <span className="scaduto">
                  <span className="pallino-rosso" aria-hidden="true" />
                  {scadutoDa === 0 ? 'Scaduto oggi'
                    : scadutoDa === 1 ? 'Scaduto da 1 giorno'
                      : `Scaduto da ${scadutoDa} giorni`}
                </span>
              )}
            </p>
          </Link>

          <div className="fondo">
            {/* Il gesto principale. Se l'azione è una telefonata diventa
                «Chiama ora»: apre il telefono e non segna niente da sé —
                una chiamata che non risponde non è una cosa fatta. Il
                «Fatto» resta nello swipe a destra e nel menu «•••». */}
            <form action={completaAzione} ref={formFatto} style={apriTelefono ? { display: 'none' } : undefined}>
              <input type="hidden" name="id" value={azioneId} />
              <input type="hidden" name="contatto_id" value={contattoId} />
              <button type="submit" className="bottone-oro bottone-grande" onClick={diFatto}>
                <Spunta /> Fatto
              </button>
            </form>
            {apriTelefono && (
              <a href={`tel:${apriTelefono}`} className="bottone bottone-oro bottone-grande" style={{ flex: 1 }}>
                <Telefono /> {principale}
              </a>
            )}
            <button
              type="button"
              className="piu-azioni"
              aria-label="Altre azioni"
              onClick={() => setFoglioTutto(true)}
            >
              •••
            </button>
          </div>
        </article>
      </div>

      {/* Rimanda: le tre scelte dello swipe a sinistra. */}
      <Foglio aperto={foglioRimanda} chiudi={() => setFoglioRimanda(false)} titolo="Rimanda a quando?">
        <ChipRimanda
          azioneId={azioneId}
          contattoId={contattoId}
          giorni={RIMANDI}
          avvisa={diRimandato}
          dopo={() => setFoglioRimanda(false)}
        />
      </Foglio>

      {/* Il menu «•••»: tutte le azioni che c'erano prima, per intero. */}
      <Foglio aperto={foglioTutto} chiudi={() => setFoglioTutto(false)} titolo={cosa}>
        <form action={completaAzione} onSubmit={() => { diFatto(); setFoglioTutto(false); }}>
          <input type="hidden" name="id" value={azioneId} />
          <input type="hidden" name="contatto_id" value={contattoId} />
          <button type="submit" className="bottone-oro bottone-grande"><Spunta /> Fatto</button>
        </form>

        <p style={{ margin: '18px 0 8px', fontSize: 13, color: 'var(--ink-2)' }}>Rimanda</p>
        <ChipRimanda
          azioneId={azioneId}
          contattoId={contattoId}
          giorni={[1, 2, 3, 7]}
          avvisa={diRimandato}
          dopo={() => setFoglioTutto(false)}
        />

        <div className="coda-foglio">
          <Link
            href={`/contatti/${contattoId}`}
            className="bottone bottone-fantasma bottone-grande"
            onClick={() => setFoglioTutto(false)}
          >
            Apri contatto
          </Link>
        </div>
      </Foglio>
    </div>
  );
}

function ChipRimanda({
  azioneId, contattoId, giorni, avvisa, dopo,
}: {
  azioneId: string;
  contattoId: string;
  giorni: number[];
  avvisa: (g: number) => void;
  dopo: () => void;
}) {
  return (
    <div className="azioni-riga">
      {giorni.map((g) => (
        <form key={g} action={posticipaAzione} onSubmit={() => { avvisa(g); dopo(); }}>
          <input type="hidden" name="id" value={azioneId} />
          <input type="hidden" name="contatto_id" value={contattoId} />
          <input type="hidden" name="giorni" value={g} />
          <button type="submit" className="bottone-fantasma" style={{ minHeight: 44, borderRadius: 999 }}>
            +{g} {g === 1 ? 'giorno' : 'giorni'}
          </button>
        </form>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// La "i": la spiegazione non sparisce, si toglie di mezzo. Chi la vuole la
// tocca, chi la sa già legge i numeri senza un paragrafo davanti.
// ---------------------------------------------------------------------------
export function TastoInfo({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  const [aperto, setAperto] = useState(false);
  return (
    <>
      <button
        type="button"
        className="tasto-info"
        aria-label={`Com'è fatto: ${titolo}`}
        onClick={() => setAperto(true)}
      >
        i
      </button>
      <Foglio aperto={aperto} chiudi={() => setAperto(false)} titolo={titolo}>
        <div className="testo-demo">{children}</div>
      </Foglio>
    </>
  );
}

// ---------------------------------------------------------------------------
// Il pulsante «Filtri» e il foglio che contiene tutti i menu a tendina.
// Nessun filtro è stato tolto: sono gli stessi di prima, tutti insieme, con
// in fondo «Mostra risultati» e «Azzera».
// ---------------------------------------------------------------------------
export function TastoFiltri({ quanti, children }: { quanti: number; children: React.ReactNode }) {
  const [aperto, setAperto] = useState(false);
  return (
    <>
      <button type="button" className="tasto-filtri" onClick={() => setAperto(true)}>
        <svg viewBox="0 0 24 24" aria-hidden="true" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M4 7h10M18 7h2M4 12h3M11 12h9M4 17h8M16 17h4" /><circle cx="16" cy="7" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="14" cy="17" r="2" /></svg>
        Filtri
        {quanti > 0 && <span className="quanti">{quanti}</span>}
      </button>
      <Foglio aperto={aperto} chiudi={() => setAperto(false)} titolo="Filtri">
        {children}
      </Foglio>
    </>
  );
}

// ---------------------------------------------------------------------------
// La card di un contatto con lo swipe: destra Chiama, sinistra WhatsApp.
// Se il numero non c'è, lo swipe non fa niente e non promette niente.
// ---------------------------------------------------------------------------
export function ContattoScorribile({
  telefono, nome, children,
}: {
  telefono: string | null;
  nome: string;
  children: React.ReactNode;
}) {
  const [dx, setDx] = useState(0);
  const [trascina, setTrascina] = useState(false);
  const partenza = useRef(0);
  const numero = telefono?.replace(/[^\d+]/g, '') ?? '';

  return (
    <div className={`scorri${trascina ? ' trascina' : ''}`}>
      <div className="scorri-sotto" aria-hidden="true">
        <span className="lato fatto">Chiama</span>
        <span className="lato rimanda">WhatsApp</span>
      </div>
      <div
        className="scorri-sopra"
        style={{ transform: `translateX(${dx}px)` }}
        onTouchStart={(e) => { partenza.current = e.touches[0].clientX; setTrascina(true); }}
        onTouchMove={(e) => {
          if (!numero) return;
          const d = e.touches[0].clientX - partenza.current;
          setDx(Math.max(-150, Math.min(150, d)));
        }}
        onTouchEnd={() => {
          setTrascina(false);
          if (numero && dx > 92) window.location.href = `tel:${numero}`;
          else if (numero && dx < -92) {
            window.open(`https://wa.me/${numero.replace(/^\+/, '')}`, '_blank', 'noopener');
          }
          setDx(0);
        }}
        onTouchCancel={() => { setTrascina(false); setDx(0); }}
        aria-label={numero ? `${nome}: scorri per chiamare o scrivere su WhatsApp` : undefined}
      >
        {children}
      </div>
    </div>
  );
}
