import { useEffect, useRef, useState } from 'react';
import { Step, Cta } from './components/Step';
import { CargLogo } from './components/CargLogo';
import { IconaServizio } from './components/IconaServizio';
import { Ruota, type RuotaHandle } from './components/Ruota';
import {
  CHIEDI_AUTO, CONSIGLI, CONTATTO_RICHIESTO, DOMANDA, ESITI, FASCE, OFFICINA,
  PERCENTUALI, VALIDITA_GIORNI, servizioDi,
} from './config/gioco';
import { tocco as toccoAptico, vittoria as vittoriaAptica } from './lib/haptics';
import { arresto, conteggio, pop, vittoria as suonoVittoria } from './lib/suono';

/**
 * Il percorso di un file dentro `public/`, servito come si deve anche da una
 * sottocartella: la build gira con `base: './'`, e un `/servizi/x.webp` con
 * la barra davanti cercherebbe il file alla radice del dominio, dove non c'è.
 */
export function indirizzo(file: string): string {
  if (/^(https?:)?\/\//.test(file) || file.startsWith('data:')) return file;
  return import.meta.env.BASE_URL + file.replace(/^\/+/, '');
}

/* ------------------------------------------------------------------ */
/* 1 — L’ingresso                                                      */
/* ------------------------------------------------------------------ */

/**
 * La prima schermata, scura.
 *
 * I fari passano nell’apertura (`Intro`), non qui: quando si arriva a questa
 * schermata l’auto è già passata.
 */
export function Ingresso({ onAvanti }: { onAvanti: () => void }) {
  return (
    <Step scuro bottom={<Cta onClick={onAvanti}>Inizia</Cta>}>
      <p className="eyebrow">{OFFICINA.nome}</p>
      {/* Le righe si spezzano a mano: «Facciamo due conti» su una riga sola
          sfonda i 390px e lascia «conti» orfano in mezzo. */}
      <h1 className="h1">{'Due conti\nsulla tua auto.'}</h1>
      <p className="lede">{'Una domanda sola.\nPoi il tuo credito.'}</p>
    </Step>
  );
}

/* ------------------------------------------------------------------ */
/* 2 — La domanda, una sola                                            */
/* ------------------------------------------------------------------ */

export function Domanda({ onRisposto }: { onRisposto: (fascia: string) => void }) {
  const [scelta, setScelta] = useState<string | null>(null);
  const bloccato = useRef(false);

  /* Si tocca e si va avanti: nessun bottone «conferma». Il blocco serve
   * perché due tap veloci non facciano partire due volte la schermata dopo. */
  const scegli = (id: string) => {
    if (bloccato.current) return;
    bloccato.current = true;
    setScelta(id);
    toccoAptico();
    pop();
    setTimeout(() => onRisposto(id), 300);
  };

  return (
    <Step>
      <p className="eyebrow">{DOMANDA.kicker}</p>
      <h1 className="h1">{DOMANDA.titolo}</h1>
      <p className="lede">{DOMANDA.sottotitolo}</p>
      <div className="opts" role="radiogroup" aria-label="Quando hai fatto l’ultimo tagliando">
        {FASCE.map((f) => (
          <button
            key={f.id} type="button" className="opt" role="radio"
            aria-checked={scelta === f.id}
            data-active={scelta === f.id ? 'true' : undefined}
            onClick={() => scegli(f.id)}
          >
            {f.etichetta}
            <span className="opt-nota">{f.nota}</span>
          </button>
        ))}
      </div>
    </Step>
  );
}

/* ------------------------------------------------------------------ */
/* 3 — La risposta, senza il credito                                   */
/* ------------------------------------------------------------------ */

/**
 * Cosa vuol dire quella risposta. **Qui il credito non compare**: sono due
 * momenti diversi, e schiacciarli nella stessa scrollata li smorza tutti e
 * due. Prima si impara una cosa, poi si vince.
 *
 * Nessuno dei quattro esiti è una bocciatura e nessuno dice che cos’ha
 * l’auto di chi legge: dicono come funziona la manutenzione, che è vero per
 * tutti. Chi arriva qui ha già il sospetto di essere in ritardo; se la
 * pagina glielo conferma col tono del professore, chiude e basta.
 */
export function Rivelazione({ scelta, onAvanti }: { scelta: string; onAvanti: () => void }) {
  const esito = ESITI[scelta];
  const percentuale = PERCENTUALI?.[scelta];
  const r = (i: number) => ({ className: 'ra', style: { animationDelay: `${300 + i * 80}ms` } });

  return (
    <Step bottom={<Cta onClick={onAvanti}>Vinci il tuo credito</Cta>}>
      <p {...r(0)} className="eyebrow ra">La tua risposta</p>
      <h1 {...r(1)} className="h1 ra">{esito.titolo}</h1>
      <p {...r(2)} className="lede ra">{esito.riga}</p>
      {percentuale !== undefined && (
        <p {...r(3)} className="nota ra" style={{ ...r(3).style, marginTop: '1.25rem' }}>
          Il {percentuale}% ha risposto come te.
        </p>
      )}
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
    <Step scuro bottom={<Cta onClick={onAvanti}>Dove lo usi</Cta>}>
      <div className="vetro relative px-6 py-8">
        <p className="premio-cifra">€<span className="tabular">{mostrato}</span></p>
        <p className="premio-label">di credito</p>
        <p className="premio-sub">Sul prossimo lavoro in officina.</p>
        <p className="premio-sub">Lo scali quando vieni, senza stampare niente.</p>
        <p className="terms">
          Valido {VALIDITA_GIORNI} giorni · non cumulabile con altre promozioni
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
/* 6 — I lavori consigliati                                            */
/* ------------------------------------------------------------------ */

/**
 * Tre lavori in card tonde, scelti sulla risposta.
 *
 * Non si oscura niente: su Woman il credito comprava N fialette su tre, qui
 * vale su qualunque lavoro si scelga, quindi tutte e tre le card restano
 * piene.
 *
 * Ogni card ha il tondo con la foto del lavoro — o il disegno, finché la
 * foto non arriva — il nome, cosa fa, e **quando serve**. È quest'ultima
 * riga che fa il lavoro vero: «parte a fatica la mattina» è la frase in cui
 * qualcuno si riconosce, «prova e sostituzione batterie» no.
 *
 * Il titolo e la riga sopra le card cambiano con la risposta data: a chi ha
 * il tagliando fresco non si dice la stessa cosa di chi non lo fa da tre
 * anni. Se tutti leggessero la stessa frase, si capirebbe in mezzo secondo
 * che la domanda non serviva a niente.
 */
export function Consigli({
  scelta, valore, onAvanti,
}: { scelta: string; valore: number; onAvanti: () => void }) {
  const esito = ESITI[scelta];
  const lavori = (CONSIGLI[scelta] ?? []).map(servizioDi).filter((s) => s !== null);

  return (
    <Step bottom={<Cta onClick={onAvanti}>Salva il tuo credito</Cta>}>
      <p className="eyebrow">{OFFICINA.insegna}</p>
      <h1 className="h1">{esito.titoloLavori}</h1>
      <p className="lede">{esito.rotta}</p>

      <ul className="servizi">
        {lavori.map((s, i) => (
          <li
            key={s.id}
            className="servizio ra"
            style={{ animationDelay: `${260 + i * 90}ms` }}
          >
            <span className="servizio-tondo">
              {s.foto
                ? <img src={indirizzo(`servizi/${s.foto}`)} alt="" />
                : <IconaServizio id={s.id} />}
            </span>
            <span className="servizio-testo">
              <span className="servizio-nome">{s.nome}</span>
              <span className="servizio-claim">{s.claim}</span>
              <span className="servizio-quando">{s.quando}</span>
            </span>
          </li>
        ))}
      </ul>

      <p className="nota mt-5">
        I tuoi {valore} € valgono su qualunque di questi. Scegli tu.
      </p>
    </Step>
  );
}

/* ------------------------------------------------------------------ */
/* 7 — I dati                                                          */
/* ------------------------------------------------------------------ */

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const NOME_OK = /^[\p{L}'’.-]{2,}(\s+[\p{L}'’.-]{2,})+$/u;
const soleCifre = (v: string) => v.replace(/\D/g, '');

export type DatiModulo = {
  nome: string; email: string; telefono: string; auto: string; consenso: boolean;
};

export function Dati({
  onInvia, inCorso, errore,
}: { onInvia: (d: DatiModulo) => void; inCorso: boolean; errore: string | null }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [auto, setAuto] = useState('');
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
          {/* Facoltativo, e deve restare facoltativo: per l’officina vale più
              dell’email, ma se diventa un obbligo qualcuno molla qui. */}
          {CHIEDI_AUTO && (
            <input
              className="campo" id="auto" type="text"
              placeholder="Che auto hai? (facoltativo)" value={auto}
              aria-label="Marca e modello dell’auto"
              onChange={(e) => setAuto(e.target.value)}
            />
          )}
          <label className="consenso">
            <input type="checkbox" checked={consenso}
              onChange={(e) => setConsenso(e.target.checked)} />
            <span>
              Acconsento a ricevere il credito e le novità di {OFFICINA.nome}.{' '}
              <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy policy</a>
            </span>
          </label>
          {errore && <p className="nota" role="alert" style={{ color: '#c2546f' }}>{errore}</p>}
          <Cta piena type="submit" disabled={!valido || inCorso}
            onClick={() => valido && onInvia({
              nome: nome.trim(), email: email.trim(),
              telefono: cifre ? `+39 ${cifre}` : '',
              auto: auto.trim(), consenso,
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
/* 8 — La chiusura                                                     */
/* ------------------------------------------------------------------ */

/**
 * L’ultima schermata non è un ringraziamento: è il momento in cui si prenota.
 * Il codice, il bottone che chiama davvero, la strada per arrivare, e la
 * riga del notturno — che è la cosa che in zona non ha quasi nessuno.
 */
export function Fine({ codice, onRicomincia }: { codice: string; onRicomincia: () => void }) {
  return (
    <Step
      scuro
      bottom={
        <>
          <a className="cta cta-fill" href={`tel:${OFFICINA.telefonoLink}`}>
            Chiama l’officina
          </a>
          <a className="ghost" href={OFFICINA.mappa} target="_blank" rel="noreferrer">
            Come arrivare
          </a>
          <button className="ghost" onClick={onRicomincia}>Ricomincia</button>
        </>
      }
    >
      <span className="marchio-fine"><CargLogo size={88} grande title={OFFICINA.nome} /></span>
      <h1 className="h1">{'Il tuo credito\nè al sicuro.'}</h1>
      <p className="codice">{codice}</p>
      <p className="nota">Dillo in officina: lo troviamo noi.</p>
      <p className="notturno">{OFFICINA.notturno}</p>
      <p className="nota" style={{ marginTop: '0.75rem' }}>
        {OFFICINA.via} · {OFFICINA.citta}
        <br />{OFFICINA.orari}
      </p>
    </Step>
  );
}
