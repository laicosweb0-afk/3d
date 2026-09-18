import { useEffect, useRef, useState } from 'react';
import { Step, Cta } from './components/Step';
import { Ruota, type RuotaHandle } from './components/Ruota';
import {
  CONSIGLI, CONTATTO_RICHIESTO, DOMANDA, ESITO, FAMIGLIE, OSPITE, PERCENTUALI,
  PREMIO_MASSIMO, TAGLIO, VALIDITA_GIORNI, famigliaDi, livelloDi, premioDi,
} from './config/gioco';
import { tocco as toccoAptico, vittoria as vittoriaAptica } from './lib/haptics';
import { arresto, conteggio, pop, vittoria as suonoVittoria } from './lib/suono';

/**
 * Il percorso di un file dentro `public/`, servito come si deve anche da una
 * sottocartella: la build gira con `base: './'`, e un `/fragranze/x.png` con
 * la barra davanti cercherebbe il file alla radice del dominio, dove non c'è.
 */
export function indirizzo(file: string): string {
  if (/^(https?:)?\/\//.test(file) || file.startsWith('data:')) return file;
  return import.meta.env.BASE_URL + file.replace(/^\/+/, '');
}

/* ------------------------------------------------------------------ */
/* 1 — L'ingresso                                                      */
/* ------------------------------------------------------------------ */

/**
 * La prima schermata, scura: il profumo è già stato annusato, la domanda è
 * solo una, e si comincia da qui.
 */
export function Ingresso({ onAvanti }: { onAvanti: () => void }) {
  return (
    <Step scuro bottom={<Cta onClick={onAvanti}>Inizia il quiz</Cta>}>
      <p className="eyebrow">The Fragrance Experience</p>
      <h1 className="h1">{'Riconosci la\nfragranza?'}</h1>
      <p className="lede">{'Annusa la tua fialetta.\nPoi prova a indovinare.'}</p>
    </Step>
  );
}

/* ------------------------------------------------------------------ */
/* 2 — La domanda, una sola                                            */
/* ------------------------------------------------------------------ */

export function Domanda({ onRisposto }: { onRisposto: (famiglia: string) => void }) {
  const [scelta, setScelta] = useState<string | null>(null);
  const bloccato = useRef(false);

  /*
   * Il tocco sceglie e avanza da solo, dopo 300ms di pausa perché la scheda
   * abbia il tempo di accendersi. Nessun bottone «conferma»: la risposta è
   * di pancia, e un secondo passaggio la farebbe diventare un ragionamento.
   */
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
      <h1 className="h1">{'Cosa hai\nsentito?'}</h1>
      <div className="opts" role="radiogroup" aria-label={DOMANDA.titolo}>
        {FAMIGLIE.map((f) => (
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
/* 3 — La rivelazione, senza il credito                                */
/* ------------------------------------------------------------------ */

/**
 * Cos'era. **Qui il credito non compare**: sono due emozioni diverse, e
 * schiacciarle nella stessa scrollata le smorza tutte e due. Prima si scopre
 * la fragranza, poi si vince — e fra le due cose c'è una schermata di
 * respiro, non una riga in fondo.
 */
export function Rivelazione({ scelta, onAvanti }: { scelta: string; onAvanti: () => void }) {
  const centrato = scelta === OSPITE.famiglia;
  const esito = centrato ? ESITO.centrato : ESITO.altrove;
  const percentuale = PERCENTUALI?.[scelta];
  const r = (i: number) => ({ className: 'ra', style: { animationDelay: `${300 + i * 80}ms` } });

  return (
    <Step bottom={<Cta onClick={onAvanti}>Vinci il tuo credito</Cta>}>
      {/* La foto del flacone, se la profumeria l'ha mandata. Qui ci sta —
          il nome è già scoperto, non svela più niente — e vale più di
          qualunque disegno: è la boccetta che il cliente ha in mano. */}
      {OSPITE.immagine && (
        <img
          className="flacone ra" src={indirizzo(OSPITE.immagine)} alt=""
          style={{ animationDelay: '200ms' }}
        />
      )}
      <p {...r(0)} className="eyebrow ra">{esito.titolo}</p>
      <h1 {...r(1)} className="h1 ra">{`${centrato ? 'È esattamente\n' : 'È\n'}${OSPITE.nome}.`}</h1>
      <p {...r(2)} className="lede ra">di {OSPITE.maison}</p>
      <p {...r(3)} className="nota ra" style={{ ...r(3).style, marginTop: '1.25rem' }}>
        {OSPITE.note.join(' · ')}
      </p>
      {!centrato && (
        <p {...r(4)} className="lede ra">{esito.riga(OSPITE)}</p>
      )}
      {percentuale !== undefined && (
        <p {...r(5)} className="nota ra" style={{ ...r(5).style, marginTop: '1.25rem' }}>
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
      <p className="nota mt-7">Fino a {PREMIO_MASSIMO} € in fialette. Si vince sempre.</p>
    </Step>
  );
}

/* ------------------------------------------------------------------ */
/* 5 — Il credito vinto                                                */
/* ------------------------------------------------------------------ */

export function Credito({ valore, onAvanti }: { valore: number; onAvanti: () => void }) {
  const premio = premioDi(valore);
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
    <Step scuro bottom={<Cta onClick={onAvanti}>Scopri le tue fragranze</Cta>}>
      <div className="vetro relative px-6 py-8">
        <p className="premio-cifra">€<span className="tabular">{mostrato}</span></p>
        <p className="premio-label">di credito</p>
        <p className="premio-sub">
          {premio.fialette === 1
            ? `Una fialetta da ${TAGLIO} €, da scegliere fra le nostre.`
            : `${premio.fialette} fialette da ${TAGLIO} €, da scegliere fra le nostre.`}
        </p>
        <p className="premio-sub">Tue con il prossimo ordine.</p>
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
/* 6 — Le fragranze consigliate                                        */
/* ------------------------------------------------------------------ */

/**
 * I consigli sono sempre tre: sono una consulenza, non il premio. Il credito
 * dice quante se ne portano a casa adesso — e le altre restano lì, scritte,
 * per la prossima volta. È il motivo per cui chi vince 5 € non esce con
 * l'impressione di aver ricevuto un terzo di qualcosa.
 */
export function Consigli({
  scelta, valore, onAvanti,
}: { scelta: string; valore: number; onAvanti: () => void }) {
  const centrato = scelta === OSPITE.famiglia;
  const premio = premioDi(valore);
  const famiglia = famigliaDi(scelta);
  const consigli = CONSIGLI[scelta] ?? [];

  return (
    <Step bottom={<Cta onClick={onAvanti}>Salva il tuo credito</Cta>}>
      <p className="eyebrow">The Fragrance Experience</p>
      <h1 className="h1">{centrato ? 'Le tue\n3 fragranze.' : 'Scelte\nper te.'}</h1>
      <p className="lede">
        {centrato
          ? `Tre da provare, scelte sulla famiglia che hai riconosciuto.`
          : `Tre ${famiglia?.plurale ?? ''}, scelte su quello che hai sentito.`}
      </p>

      <ul className="recs vetro">
        {consigli.map((c, i) => (
          <li key={c.nome} className="rec" data-fuori={i >= premio.fialette ? 'true' : undefined}>
            <p className="rec-nome">{c.nome}</p>
            <p className="rec-maison">{OSPITE.maison} · {famiglia?.etichetta}</p>
            <p className="rec-note">{c.riga}</p>
          </li>
        ))}
      </ul>

      <p className="nota mt-5">
        {premio.fialette >= consigli.length
          ? 'Il tuo credito le copre tutte e tre.'
          : `Il tuo credito ne copre ${premio.fialette === 1 ? 'una' : premio.fialette}: scegli tu quale.`}
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
              Acconsento a ricevere il credito e le novità di Woman.{' '}
              <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy policy</a>
            </span>
          </label>
          {errore && <p className="nota" role="alert" style={{ color: '#c2546f' }}>{errore}</p>}
          <Cta piena type="submit" disabled={!valido || inCorso}
            onClick={() => valido && onInvia({
              nome: nome.trim(), email: email.trim(),
              telefono: cifre ? `+39 ${cifre}` : '', consenso,
            })}
          >
            {inCorso ? 'Un attimo…' : 'Salva le mie fialette'}
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

export function Fine({
  codice, centrato, onRicomincia,
}: { codice: string; centrato: boolean; onRicomincia: () => void }) {
  return (
    <Step
      scuro
      bottom={<button className="ghost" onClick={onRicomincia}>Ricomincia la prova</button>}
    >
      <h1 className="h1">{'SMELL. GUESS.\nSHARE.'}</h1>
      <p className="lede">Annusa. Indovina. Condividi.</p>
      <p className="livello">Il tuo livello: {livelloDi(centrato)}</p>
      <p className="codice">{codice}</p>
      <p className="nota" style={{ marginTop: '1rem' }}>Il tuo credito è al sicuro.</p>
    </Step>
  );
}
