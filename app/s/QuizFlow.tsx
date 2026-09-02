'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CATALOG, FAMILIES, MYSTERY, type CatalogEntry, type Family } from '@/data/fragrances';
import { copy, fill } from '@/content/quiz/copy';

/* ------------------------------------------------------------------ */
/* Tipi                                                                */
/* ------------------------------------------------------------------ */

type Step = 'landing' | 'warmup' | 'quiz' | 'result' | 'recs' | 'email' | 'envelope' | 'end';

type Entry = 'coupon' | 'busta';
type ForcedOutcome = 'off' | 'right' | 'wrong';

type TrackedEvent = {
  name: string;
  detail?: string;
  ts: Date;
  code: string;
};

/* ------------------------------------------------------------------ */
/* Elementi ricorrenti                                                 */
/* ------------------------------------------------------------------ */

function Logo() {
  return (
    <div className="fx-logo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/WOMAN-logo.png" alt="WO•MAN Perfume Store" />
    </div>
  );
}

/* La fialetta: solo linea e un «?». Nessun logo sopra. */
function Vial() {
  return (
    <figure className="fx-vial" aria-hidden="true">
      <svg width="90" height="180" viewBox="0 0 90 180" fill="none">
        <g stroke="currentColor" strokeWidth="1.25">
          <rect className="fx-vial-body" x="33" y="2" width="24" height="20" rx="3" />
          <path d="M36 22v8M54 22v8" />
          <rect className="fx-vial-body" x="26" y="30" width="38" height="146" rx="17" />
        </g>
        <text className="fx-vial-mark" x="45" y="112" textAnchor="middle">
          ?
        </text>
      </svg>
    </figure>
  );
}

function Cta({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button className="fx-cta" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function Reward() {
  return (
    <div className="fx-reward">
      <p className="fx-reward-amount">{copy.reward.amount}</p>
      <p className="fx-reward-label">{copy.reward.label}</p>
      <p className="fx-reward-sub">
        {copy.reward.sub} {copy.reward.note}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Flusso                                                              */
/* ------------------------------------------------------------------ */

export default function QuizFlow() {
  const params = useSearchParams();
  const code = params.get('c') || '—';
  const urlEntry: Entry = params.get('from') === 'busta' ? 'busta' : 'coupon';
  const urlNome = params.get('nome') || copy.landing.busta.defaultNome;

  const [entry, setEntry] = useState<Entry>(urlEntry);
  const [step, setStep] = useState<Step>('landing');
  const [answer, setAnswer] = useState<Family | null>(null);
  const [guessed, setGuessed] = useState(false);
  const [recs, setRecs] = useState<CatalogEntry[]>([]);
  const [envelopeDone, setEnvelopeDone] = useState(false);
  const [events, setEvents] = useState<TrackedEvent[]>([]);
  const [forced, setForced] = useState<ForcedOutcome>('off');
  const [demoOpen, setDemoOpen] = useState(false);

  const track = useCallback(
    (name: string, detail?: string) => {
      setEvents((prev) => [...prev, { name, detail, ts: new Date(), code }]);
    },
    [code],
  );

  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    track('scan_opened', entry === 'busta' ? 'da busta' : 'da coupon');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restart = useCallback(
    (nextEntry: Entry) => {
      setEntry(nextEntry);
      setStep('landing');
      setAnswer(null);
      setGuessed(false);
      setRecs([]);
      setEnvelopeDone(false);
      track('scan_opened', nextEntry === 'busta' ? 'da busta' : 'da coupon');
    },
    [track],
  );

  /* --- «Partiamo.» avanza da solo --- */
  useEffect(() => {
    if (step === 'warmup') {
      const t = window.setTimeout(() => setStep('quiz'), 1100);
      return () => window.clearTimeout(t);
    }
  }, [step]);

  const resultShown = useRef(false);
  useEffect(() => {
    if (step === 'result' && !resultShown.current) {
      resultShown.current = true;
      track('result_shown', guessed ? 'indovinato' : 'non indovinato');
    }
    if (step === 'landing') resultShown.current = false;
  }, [step, guessed, track]);

  /* --- la risposta unica: il tap avanza al risultato --- */
  const answering = useRef(false);
  const onAnswer = (family: Family) => {
    if (answering.current) return;
    answering.current = true;
    setAnswer(family);
    const natural = family === MYSTERY.family;
    const hit = forced === 'right' ? true : forced === 'wrong' ? false : natural;
    setGuessed(hit);
    track('quiz_answered', `${family} · ${hit ? 'indovinato' : 'non indovinato'}`);
    setRecs(computeRecs(family));
    window.setTimeout(() => {
      answering.current = false;
      setStep('result');
    }, 300);
  };

  const confirmRecs = () => {
    track('families_selected', recs.map((r) => r.name).join(' · '));
    setStep('email');
  };

  const saveEmail = (email: string) => {
    track('email_saved', email);
    setStep('envelope');
  };

  const finish = (name: string | null) => {
    if (name !== null) {
      setEnvelopeDone(true);
      track('envelope_named', name || '—');
    }
    track('flow_completed');
    setStep('end');
  };

  /* --- livello simbolico --- */
  const finalLevel = envelopeDone
    ? guessed
      ? copy.levels.esperto
      : copy.levels.allenato
    : guessed
      ? copy.levels.allenato
      : copy.levels.curioso;

  return (
    <>
      <div className={`fx-step${step === 'landing' ? ' fx-step--landing' : ''}`} key={step}>
        {step === 'landing' && <Landing entry={entry} nome={urlNome} onStart={() => setStep('warmup')} />}
        {step === 'warmup' && <Interlude title={copy.warmup} />}
        {step === 'quiz' && <Question answer={answer} onAnswer={onAnswer} />}
        {step === 'result' && <Result guessed={guessed} onNext={() => setStep('recs')} />}
        {step === 'recs' && <Recs guessed={guessed} recs={recs} onNext={confirmRecs} />}
        {step === 'email' && <Email onSave={saveEmail} />}
        {step === 'envelope' && <Envelope onFinish={finish} />}
        {step === 'end' && <Closing level={finalLevel} />}
      </div>

      <DemoPanel
        open={demoOpen}
        onToggle={() => setDemoOpen((v) => !v)}
        entry={entry}
        forced={forced}
        events={events}
        code={code}
        onEntry={(e) => restart(e)}
        onForced={setForced}
        onRestart={() => restart(entry)}
      />
    </>
  );
}

/* Le tre raccomandazioni: prima la famiglia sentita, poi quella della
 * fragranza misteriosa, poi il resto del catalogo. */
function computeRecs(felt: Family): CatalogEntry[] {
  const ranked: Family[] = [];
  for (const f of [felt, MYSTERY.family, ...FAMILIES]) {
    if (!ranked.includes(f)) ranked.push(f);
  }
  const rank = (f: Family) => ranked.indexOf(f);
  return [...CATALOG].sort((a, b) => rank(a.family) - rank(b.family)).slice(0, 3);
}

/* ------------------------------------------------------------------ */
/* Landing                                                             */
/* ------------------------------------------------------------------ */

function Landing({
  entry,
  nome,
  onStart,
}: {
  entry: Entry;
  nome: string;
  onStart: () => void;
}) {
  const mittente = copy.landing.busta.defaultMittente;
  return (
    <>
      <div className="fx-top">
        <Logo />
      </div>
      <div className="fx-main">
        <div className="fx-hero">
          <p className="fx-eyebrow">{copy.eyebrow}</p>
          {entry === 'coupon' ? (
            <>
              <h1 className="fx-h1 fx-h1--display">{copy.landing.title}</h1>
              <p className="fx-lede">{copy.landing.sub}</p>
            </>
          ) : (
            <>
              <h1 className="fx-h1 fx-h1--display">{fill(copy.landing.busta.title, { nome })}</h1>
              <p className="fx-lede">{fill(copy.landing.busta.sub, { mittente })}</p>
              <p className="fx-note" style={{ marginTop: 'var(--fx-space-3)' }}>
                {fill(copy.landing.busta.transparency, { mittente })}
              </p>
            </>
          )}
        </div>
        <Vial />
      </div>
      <div className="fx-bottom">
        <Cta onClick={onStart}>{copy.landing.cta}</Cta>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* «Partiamo.»                                                         */
/* ------------------------------------------------------------------ */

function Interlude({ title }: { title: string }) {
  return (
    <>
      <div className="fx-top" />
      <div className="fx-main">
        <h1 className="fx-h1 fx-h1--display">{title}</h1>
      </div>
      <div className="fx-bottom" />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* La domanda — una sola                                               */
/* ------------------------------------------------------------------ */

function Question({
  answer,
  onAnswer,
}: {
  answer: Family | null;
  onAnswer: (f: Family) => void;
}) {
  return (
    <>
      <div className="fx-top" />
      <div className="fx-main">
        <p className="fx-eyebrow">{copy.quiz.eyebrow}</p>
        <h1 className="fx-h1">{copy.quiz.question}</h1>
        <div className="fx-opts">
          {FAMILIES.map((f) => (
            <button
              key={f}
              className="fx-opt"
              data-active={answer === f}
              onClick={() => onAnswer(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="fx-bottom" />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Risultato                                                           */
/* ------------------------------------------------------------------ */

function Result({ guessed, onNext }: { guessed: boolean; onNext: () => void }) {
  return (
    <>
      <div className="fx-top" />
      <div className="fx-main">
        {guessed ? (
          <>
            <p className="fx-eyebrow">{copy.result.guessed.eyebrow}</p>
            <h1 className="fx-h1">{fill(copy.result.guessed.title, { name: MYSTERY.name })}</h1>
            <p className="fx-lede">{fill(copy.result.guessed.byMaison, { maison: MYSTERY.maison })}</p>
            <p className="fx-notes">{MYSTERY.notes.join(' · ')}</p>
            <p className="fx-note" style={{ marginTop: 'var(--fx-space-2)' }}>
              {fill(copy.result.guessed.pct, { pct: MYSTERY.guessedPct })}
            </p>
          </>
        ) : (
          <>
            <p className="fx-eyebrow fx-eyebrow--muted">{copy.result.missed.eyebrow}</p>
            <h1 className="fx-h1">{fill(copy.result.missed.title, { name: MYSTERY.name })}</h1>
            <p className="fx-lede">{fill(copy.result.missed.trick, { trickNote: MYSTERY.trickNote })}</p>
          </>
        )}
        {/* Il credito è identico nei due esiti: cambia il racconto, mai il valore. */}
        <Reward />
      </div>
      <div className="fx-bottom">
        <Cta onClick={onNext}>{copy.result.cta}</Cta>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Raccomandazioni                                                     */
/* ------------------------------------------------------------------ */

function Recs({
  guessed,
  recs,
  onNext,
}: {
  guessed: boolean;
  recs: CatalogEntry[];
  onNext: () => void;
}) {
  return (
    <>
      <div className="fx-top" />
      <div className="fx-main">
        <p className="fx-eyebrow">{copy.eyebrow}</p>
        <h1 className="fx-h1">{guessed ? copy.recs.titleRight : copy.recs.titleWrong}</h1>
        {!guessed && <p className="fx-lede">{copy.recs.subWrong}</p>}
        <ul className="fx-recs">
          {recs.map((r) => (
            <li className="fx-rec" key={r.name}>
              <p className="fx-rec-name">{r.name}</p>
              <p className="fx-rec-maison">
                {r.maison} · {r.family}
              </p>
              <p className="fx-rec-notes">{r.notes.join(' · ')}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="fx-bottom">
        <Cta onClick={onNext}>{copy.recs.cta}</Cta>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Email                                                               */
/* ------------------------------------------------------------------ */

function Email({ onSave }: { onSave: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && consent;

  return (
    <>
      <div className="fx-top" />
      <div className="fx-main">
        <h1 className="fx-h1">{copy.email.title}</h1>
      </div>
      <div className="fx-bottom">
        <input
          className="fx-field"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={copy.email.placeholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label className="fx-consent">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>
            {copy.email.consent}{' '}
            <a href="#" onClick={(e) => e.preventDefault()}>
              {copy.email.privacyLink}
            </a>
          </span>
        </label>
        <Cta onClick={() => onSave(email)} disabled={!valid}>
          {copy.email.cta}
        </Cta>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* La busta                                                            */
/* ------------------------------------------------------------------ */

function Envelope({ onFinish }: { onFinish: (name: string | null) => void }) {
  const [name, setName] = useState('');

  return (
    <>
      <div className="fx-top" />
      <div className="fx-main">
        <h1 className="fx-h1">{copy.envelope.title}</h1>
        <p className="fx-lede">{copy.envelope.text}</p>
      </div>
      <div className="fx-bottom">
        <input
          className="fx-field"
          type="text"
          placeholder={copy.envelope.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Cta onClick={() => onFinish(name.trim())}>{copy.envelope.cta}</Cta>
        <button className="fx-ghost" onClick={() => onFinish(null)}>
          {copy.envelope.later}
        </button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Chiusura                                                            */
/* ------------------------------------------------------------------ */

function Closing({ level }: { level: string }) {
  return (
    <>
      <div className="fx-top">
        <Logo />
      </div>
      <div className="fx-main">
        <h1 className="fx-claim">{copy.claim}</h1>
        <p className="fx-claim-sub">{copy.claimSub}</p>
        <p className="fx-level">
          {copy.levelLabel}: {level}
        </p>
        <p className="fx-note" style={{ marginTop: 'var(--fx-space-2)' }}>
          {copy.end.creditSaved}
        </p>
      </div>
      <div className="fx-bottom" />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Pannello demo                                                       */
/* ------------------------------------------------------------------ */

function DemoPanel({
  open,
  onToggle,
  entry,
  forced,
  events,
  code,
  onEntry,
  onForced,
  onRestart,
}: {
  open: boolean;
  onToggle: () => void;
  entry: Entry;
  forced: ForcedOutcome;
  events: TrackedEvent[];
  code: string;
  onEntry: (e: Entry) => void;
  onForced: (f: ForcedOutcome) => void;
  onRestart: () => void;
}) {
  return (
    <>
      <button className="fx-demo-toggle" onClick={onToggle} aria-label={copy.demo.open}>
        ⋯
      </button>
      {open && (
        <section className="fx-demo" aria-label={copy.demo.title}>
          <h2>
            {copy.demo.title} · {copy.demo.coupon} {code}
          </h2>
          <div className="fx-demo-row">
            <span>{copy.demo.entry}</span>
            <div className="fx-seg">
              <button data-on={entry === 'coupon'} onClick={() => onEntry('coupon')}>
                {copy.demo.entryCoupon}
              </button>
              <button data-on={entry === 'busta'} onClick={() => onEntry('busta')}>
                {copy.demo.entryBusta}
              </button>
            </div>
          </div>
          <div className="fx-demo-row">
            <span>{copy.demo.outcome}</span>
            <div className="fx-seg">
              <button data-on={forced === 'off'} onClick={() => onForced('off')}>
                {copy.demo.outcomeOff}
              </button>
              <button data-on={forced === 'right'} onClick={() => onForced('right')}>
                {copy.demo.outcomeRight}
              </button>
              <button data-on={forced === 'wrong'} onClick={() => onForced('wrong')}>
                {copy.demo.outcomeWrong}
              </button>
            </div>
          </div>
          <button className="fx-demo-restart" onClick={onRestart}>
            {copy.demo.restart}
          </button>
          <div className="fx-events">
            <h2>{copy.demo.events}</h2>
            {events.length === 0 ? (
              <p className="fx-note">{copy.demo.noEvents}</p>
            ) : (
              <ol>
                {events.map((e, i) => (
                  <li key={i}>
                    <time>{e.ts.toLocaleTimeString('it-IT')}</time>
                    <span>
                      {e.name}
                      {e.detail ? <span className="fx-event-detail"> — {e.detail}</span> : null}
                      <span className="fx-event-detail"> · {e.code}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      )}
    </>
  );
}
