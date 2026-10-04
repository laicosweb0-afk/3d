import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Step, Cta } from './components/Step';
import { Ruota, type RuotaHandle } from './components/Ruota';
import { RiquadroCollezione, SchedaArticolo } from './components/Vetrina';
import { CATALOGO, type Articolo, type Collezione } from './config/catalogo';
import {
  CONTATTO_RICHIESTO, DOMANDA, NEGOZIO, PEZZI, REPARTI, SPESA_MINIMA, STILI, VALIDITA_GIORNI,
  WHATSAPP_NEGOZIO, dataBreve, messaggioWhatsApp, stileDi, telDi,
} from './config/gioco';
import type { Lead } from './lib/lead';
import { tocco as toccoAptico, vittoria as vittoriaAptica } from './lib/haptics';
import { arresto, conteggio, pop, vittoria as suonoVittoria } from './lib/suono';

/**
 * Il percorso di un file dentro `public/`, servito come si deve anche da una
 * sottocartella: la build gira con `base: './'`, e un `/foto/x.webp` con la
 * barra davanti cercherebbe il file alla radice del dominio.
 */
export function indirizzo(file: string): string {
  return import.meta.env.BASE_URL + file.replace(/^\/+/, '');
}

/* ------------------------------------------------------------------ */
/* 0 — La vetrina: si sfoglia lo showroom                              */
/* ------------------------------------------------------------------ */

/**
 * La prima schermata dopo l'apertura, come la vetrina di Rama: prima di
 * chiedere qualsiasi cosa, si fa vedere cosa c'è in negozio. Un riquadro per
 * collezione, con il carosello 3D; ogni articolo si apre con le sue foto, e
 * col cuore si mette fra i preferiti.
 */
export function Vetrina({
  preferiti, onPreferito, onAvanti,
}: {
  preferiti: Set<string>;
  onPreferito: (id: string) => void;
  onAvanti: () => void;
}) {
  const [aperto, setAperto] = useState<{ a: Articolo; forma: Collezione['forma'] } | null>(null);

  return (
    <Step className="step-con-dock" bottom={
      // La barra in basso, come nelle app: traslucida, galleggia sopra la
      // vetrina mentre si scorre. A sinistra i preferiti, a destra l'unica
      // azione che porta avanti. Sta sul `body`: dentro la schermata, che
      // entra con una trasformazione, `position: fixed` non varrebbe.
      createPortal(<div className="dock" role="toolbar" aria-label="Vetrina">
        <span className="dock-info">
          <span className="dock-cuore" aria-hidden>{preferiti.size ? '♥' : '♡'}</span>
          {preferiti.size
            ? `${preferiti.size} ${preferiti.size === 1 ? 'preferito' : 'preferiti'}`
            : 'Tocca un prodotto'}
        </span>
        <button type="button" className="pill pill-piena" onClick={onAvanti}>
          Il tuo stile <span aria-hidden>→</span>
        </button>
      </div>, document.body)
    }>
      {/* La testata della vetrina, alla maniera delle app: titolo grande a
          sinistra, e sotto una riga che dice qualcosa di nuovo. Il nome del
          negozio sta già nella barra in alto: qui non si ripete. Il titolo
          è la frase delle locandine del negozio. */}
      <header className="vetrina-testa">
        <h1 className="h1">{'Il tuo salotto\nti aspetta.'}</h1>
        <p className="vetrina-info">
          <span>Showroom a Lugo</span>
          <span className="vetrina-punto" aria-hidden />
          <span>{NEGOZIO.consegne}</span>
        </p>
      </header>
      <div className="vetrina">
        {CATALOGO.map((c) => (
          <RiquadroCollezione
            key={c.id} collezione={c} preferiti={preferiti}
            onApri={(a) => setAperto({ a, forma: c.forma })}
          />
        ))}
      </div>
      {aperto && (
        <SchedaArticolo
          articolo={aperto.a} forma={aperto.forma}
          preferito={preferiti.has(aperto.a.id)}
          onPreferito={() => onPreferito(aperto.a.id)}
          onChiudi={() => setAperto(null)}
        />
      )}
    </Step>
  );
}

/* ------------------------------------------------------------------ */
/* 1 — L'ingresso                                                      */
/* ------------------------------------------------------------------ */

/**
 * La prima schermata: il biglietto è appena passato nell'apertura, e qui si
 * dice in una riga cosa succede.
 */
export function Ingresso({ onAvanti }: { onAvanti: () => void }) {
  return (
    // Dietro, il velluto da vicino con il suo profilo d'oro: la prima cosa
    // che si vede dopo l'apertura è la materia, non un'interfaccia.
    <Step scuro sfondo={indirizzo('foto/velluto-dettaglio.webp')}
      bottom={<Cta onClick={onAvanti}>Inizia</Cta>}>
      <p className="eyebrow">Il tuo stile</p>
      <h1 className="h1">{'Che casa\nsei?'}</h1>
      <p className="lede">{'Una domanda sola.\nPoi gira la ruota: si vince sempre.'}</p>
    </Step>
  );
}

/* ------------------------------------------------------------------ */
/* 2 — La domanda, una sola                                            */
/* ------------------------------------------------------------------ */

export function Domanda({ onRisposto }: { onRisposto: (stile: string) => void }) {
  const [scelta, setScelta] = useState<string | null>(null);
  const bloccato = useRef(false);

  /*
   * Il tocco sceglie e avanza da solo, dopo 300ms perché la scheda abbia il
   * tempo di accendersi. Nessun bottone «conferma»: la risposta è di pancia,
   * e un secondo passaggio la farebbe diventare un ragionamento.
   */
  const scegli = (id: string) => {
    if (bloccato.current) return;
    bloccato.current = true;
    setScelta(id);
    // La foto dello stile parte adesso: quando si arriva alla rivelazione è
    // già scaricata, e non compare a metà dell'entrata.
    const foto = stileDi(id)?.foto;
    if (foto) new Image().src = indirizzo(foto);
    toccoAptico();
    pop();
    setTimeout(() => onRisposto(id), 300);
  };

  return (
    <Step>
      <p className="eyebrow">{DOMANDA.kicker}</p>
      <h1 className="h1">{DOMANDA.titolo}</h1>
      <p className="lede lede-stretta">{DOMANDA.sottotitolo}</p>
      <div className="opts" role="radiogroup" aria-label={DOMANDA.titolo.replace('\n', ' ')}>
        {STILI.map((s) => (
          <button
            key={s.id} type="button" className="opt" role="radio"
            aria-checked={scelta === s.id}
            data-active={scelta === s.id ? 'true' : undefined}
            onClick={() => scegli(s.id)}
          >
            {s.etichetta}
            <span className="opt-nota">{s.nota}</span>
          </button>
        ))}
      </div>
    </Step>
  );
}

/* ------------------------------------------------------------------ */
/* 3 — La rivelazione, senza il credito                                */
/* ------------------------------------------------------------------ */

/**
 * Lo stile. **Qui il credito non compare**: sono due momenti diversi, e
 * schiacciarli nella stessa schermata li smorza tutti e due. Prima ci si
 * riconosce, poi si vince.
 */
export function Rivelazione({ scelta, onAvanti }: { scelta: string; onAvanti: () => void }) {
  const stile = stileDi(scelta);
  if (!stile) return null;
  const r = (i: number) => ({ className: 'ra', style: { animationDelay: `${200 + i * 90}ms` } });

  return (
    <Step bottom={<Cta onClick={onAvanti}>Gira la ruota</Cta>}>
      {/* La foto vera del pezzo: vale più di qualunque descrizione. Sta su
          un fondo crema da studio, dentro una cornice col filo d'oro. */}
      {stile.foto && (
        <img
          className={`foto-stile${stile.fotoLarga ? ' foto-stile-larga' : ''} ra`}
          src={indirizzo(stile.foto)} alt=""
          style={{ animationDelay: '120ms' }}
        />
      )}
      <p {...r(0)} className="eyebrow ra">Il tuo stile è</p>
      <h1 {...r(1)} className="h1 h1-oro ra">{stile.nome.replace(' ', '\n')}</h1>
      <p {...r(2)} className="lede ra">{stile.ritratto}</p>
      <p {...r(3)} className="nota ra" style={{ ...r(3).style, marginTop: '1.5rem' }}>
        {stile.materiali.join(' · ')}
      </p>
    </Step>
  );
}

/* ------------------------------------------------------------------ */
/* 4 — La ruota                                                        */
/* ------------------------------------------------------------------ */

export function Giro({ onVinto }: { onVinto: (valore: number) => void }) {
  const ruota = useRef<RuotaHandle>(null);
  const [girata, setGirata] = useState(false);

  return (
    <Step
      scuro
      bottom={
        <Cta disabled={girata} onClick={() => { setGirata(true); ruota.current?.gira(); }}>
          {girata ? 'Sta girando…' : 'Gira la ruota'}
        </Cta>
      }
    >
      <p className="eyebrow">Il tuo credito</p>
      <h1 className="h1">{'Ora\nvincilo.'}</h1>
      <div className="mt-8 w-full max-w-[320px]">
        <Ruota
          ref={ruota}
          disabilitata={girata}
          onFermata={(v) => {
            toccoAptico();
            arresto();
            setTimeout(() => onVinto(v), 800);
          }}
        />
      </div>
      <p className="nota mt-7">Si vince sempre.</p>
    </Step>
  );
}

/* ------------------------------------------------------------------ */
/* 5 — Il credito vinto                                                */
/* ------------------------------------------------------------------ */

export function Credito({ valore, onAvanti }: { valore: number; onAvanti: () => void }) {
  const [mostrato, setMostrato] = useState(0);
  const [ridotto] = useState(
    () => typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  /* La cifra sale da zero in 900ms con una easeOutExpo: è il momento in cui
   * si capisce quanto si è vinto, e va guardato salire. */
  useEffect(() => {
    if (ridotto) { setMostrato(valore); suonoVittoria(); return; }
    let vivo = true;
    let ultima = -1;
    const avvio = setTimeout(() => {
      const t0 = performance.now();
      const passo = (ora: number) => {
        if (!vivo) return;
        const t = Math.min((ora - t0) / 900, 1);
        const v = t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
        const n = Math.round(valore * v);
        setMostrato(n);
        if (n !== ultima) { ultima = n; conteggio(v); }
        if (t < 1) requestAnimationFrame(passo);
        else { suonoVittoria(); vittoriaAptica(); }
      };
      requestAnimationFrame(passo);
    }, 400);
    return () => { vivo = false; clearTimeout(avvio); };
  }, [valore, ridotto]);

  return (
    <Step scuro bottom={<Cta onClick={onAvanti}>Scopri i tuoi pezzi</Cta>}>
      <div className="vetro relative px-6 py-8">
        <p className="premio-cifra"><span className="tabular">{mostrato}</span>€</p>
        <p className="premio-label">di credito</p>
        <p className="premio-sub">Sul tuo prossimo arredo, in showroom.</p>
        <p className="terms">
          Su una spesa da {SPESA_MINIMA} € · valido {VALIDITA_GIORNI} giorni ·
          non cumulabile con altre promozioni
        </p>
        {!ridotto && (
          <>
            <i className="particella" style={{ left: '32%', animationDelay: '1300ms' }} />
            <i className="particella" style={{ left: '52%', animationDelay: '1500ms' }} />
            <i className="particella" style={{ left: '68%', animationDelay: '1700ms' }} />
          </>
        )}
      </div>
    </Step>
  );
}

/* ------------------------------------------------------------------ */
/* 6 — I pezzi consigliati                                             */
/* ------------------------------------------------------------------ */

/**
 * Tre pezzi veri da venire a vedere, scelti sullo stile. È la consulenza: la
 * risposta diventa un motivo preciso per passare in negozio.
 */
export function Pezzi({ scelta, onAvanti }: { scelta: string; onAvanti: () => void }) {
  const stile = stileDi(scelta);
  const pezzi = PEZZI[scelta] ?? [];

  return (
    <Step bottom={<Cta onClick={onAvanti}>Salva il tuo credito</Cta>}>
      <p className="eyebrow">{stile?.nome}</p>
      <h1 className="h1">{'Scelti\nper te.'}</h1>
      <p className="lede">Tre pezzi da vedere dal vivo, in showroom a Lugo.</p>

      <ul className="recs vetro">
        {pezzi.map((c) => (
          <li key={c.nome} className="rec">
            {c.foto
              ? <img className="rec-foto" src={indirizzo(c.foto)} alt="" width={240} height={240} />
              : <span className="rec-foto rec-foto-vuota" aria-hidden>{REPARTI[c.reparto][0]}</span>}
            <div>
              <p className="rec-reparto">
                {REPARTI[c.reparto]}
                {c.novita && <span className="novita">Novità</span>}
              </p>
              <p className="rec-nome">{c.nome}</p>
              <p className="rec-note">{c.riga}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="nota mt-5">Il velluto va toccato, il tappeto calpestato.</p>
    </Step>
  );
}

/* ------------------------------------------------------------------ */
/* 7 — I dati                                                          */
/* ------------------------------------------------------------------ */

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const NOME_OK = /^[\p{L}'’.-]{2,}(\s+[\p{L}'’.-]{2,})+$/u;
const soleCifre = (v: string) => v.replace(/\D/g, '');

export type DatiModulo = { nome: string; email: string; telefono: string; consenso: boolean };

export function Dati({
  onInvia, inCorso, errore,
}: { onInvia: (d: DatiModulo) => void; inCorso: boolean; errore: string | null }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [consenso, setConsenso] = useState(false);

  const cifre = soleCifre(telefono);
  const nomeOk = NOME_OK.test(nome.trim());
  const emailOk = EMAIL_OK.test(email.trim());
  const telOk = cifre.length >= 9 && cifre.length <= 13;
  const unoBasta = CONTATTO_RICHIESTO === 'uno';
  const contattoOk = unoBasta
    ? (email.trim() !== '' && emailOk) || (cifre.length > 0 && telOk)
    : emailOk && telOk;
  const valido = nomeOk && contattoOk && consenso;

  return (
    <Step
      bottom={
        <>
          <input
            className="campo" id="nome" type="text" autoComplete="name"
            placeholder="Nome e cognome" value={nome}
            aria-label="Nome e cognome"
            aria-invalid={nome !== '' && !nomeOk}
            onChange={(e) => setNome(e.target.value)}
          />
          <input
            className="campo" id="email" type="email" inputMode="email" autoComplete="email"
            placeholder="La tua email" value={email}
            aria-label="Email"
            aria-invalid={email !== '' && !emailOk}
            onChange={(e) => setEmail(e.target.value)}
          />
          {unoBasta && <p className="nota">oppure</p>}
          <input
            className="campo" id="telefono" type="tel" inputMode="tel" autoComplete="tel"
            placeholder="Il tuo numero" value={telefono}
            aria-label="Numero di telefono"
            aria-invalid={telefono !== '' && !telOk}
            onChange={(e) => setTelefono(e.target.value)}
          />
          <label className="consenso">
            <input type="checkbox" checked={consenso}
              onChange={(e) => setConsenso(e.target.checked)} />
            <span>
              Acconsento a ricevere il credito e le novità di Bazar Marrakech.{' '}
              <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy policy</a>
            </span>
          </label>
          {errore && <p className="nota" role="alert" style={{ color: '#a8432c' }}>{errore}</p>}
          <Cta piena type="submit" disabled={!valido || inCorso}
            onClick={() => valido && onInvia({
              nome: nome.trim(), email: email.trim(),
              telefono: cifre ? `+39 ${cifre}` : '', consenso,
            })}
          >
            {inCorso ? 'Un attimo…' : 'Salva il mio credito'}
          </Cta>
        </>
      }
    >
      <h1 className="h1">{'Dove ti mandiamo\nil tuo credito?'}</h1>
    </Step>
  );
}

/* ------------------------------------------------------------------ */
/* 8 — La chiusura: la tessera da mostrare in negozio                  */
/* ------------------------------------------------------------------ */

export function Fine({ lead, onRicomincia }: { lead: Lead; onRicomincia: () => void }) {
  const nome = lead.nome.split(/\s+/)[0];
  const wa = WHATSAPP_NEGOZIO
    ? `https://wa.me/${WHATSAPP_NEGOZIO}?text=${encodeURIComponent(messaggioWhatsApp({
      nome: lead.nome, credito: lead.credito, codice: lead.codiceCredito, stile: lead.stile,
    }))}`
    : null;

  return (
    <Step
      scuro
      bottom={
        <>
          {wa && <a className="cta" href={wa} target="_blank" rel="noreferrer">Scrivici su WhatsApp</a>}
          <button className="ghost" onClick={onRicomincia}>Ricomincia la prova</button>
        </>
      }
    >
      <p className="eyebrow">{`Grazie, ${nome}`}</p>
      <h1 className="h1">{'Ci vediamo\nal Bazar.'}</h1>

      <div className="tessera">
        <p className="tessera-cifra">{lead.credito}€</p>
        <span className="filo" />
        <p className="tessera-stile">{lead.stile}</p>
        <p className="codice">{lead.codiceCredito}</p>
        <p className="tessera-scade">
          Da mostrare in negozio · scade il {dataBreve(new Date(lead.scadenza))}
        </p>
        {lead.preferiti.length > 0 && (
          <div className="tessera-preferiti">
            <p className="tessera-stile">I tuoi preferiti</p>
            <p className="tessera-lista">{lead.preferiti.join(' · ')}</p>
          </div>
        )}
      </div>

      {/* I contatti come sul retro del biglietto: due nomi, due numeri,
          l'indirizzo e Instagram. Si toccano e partono. */}
      <ul className="contatti">
        {NEGOZIO.contatti.map((c) => (
          <li key={c.telefono}>
            <a href={telDi(c.telefono)}>
              <span className="contatto-nome">{c.nome}</span> · {c.telefono}
            </a>
          </li>
        ))}
      </ul>
      <p className="indirizzo">
        <a href={NEGOZIO.mappa} target="_blank" rel="noreferrer">
          {NEGOZIO.indirizzo}<br />{NEGOZIO.citta}
        </a>
      </p>
      <p className="indirizzo">{NEGOZIO.consegne}</p>
      <p className="instagram">
        <a href={`https://instagram.com/${NEGOZIO.instagram}`} target="_blank" rel="noreferrer">
          @{NEGOZIO.instagram}
        </a>
        <span className="sep"> · </span>
        <a href={`https://${NEGOZIO.sito}`} target="_blank" rel="noreferrer">{NEGOZIO.sito}</a>
      </p>
    </Step>
  );
}
