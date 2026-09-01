'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CATALOG,
  FAMILIES,
  MYSTERY,
  QUESTIONS,
  type CatalogEntry,
  type Family,
  type QuizOption,
} from '@/data/fragrances';
import { copy, fill } from '@/content/quiz/copy';

/* ------------------------------------------------------------------ */
/* Tipi                                                                */
/* ------------------------------------------------------------------ */

type Step =
  | 'landing'
  | 'warmup'
  | 'quiz'
  | 'moment'
  | 'result'
  | 'recs'
  | 'email'
  | 'envelope'
  | 'end';

type Entry = 'coupon' | 'busta';
type ForcedOutcome = 'off' | 'right' | 'wrong';

type TrackedEvent = {
  name: string;
  detail?: string;
  ts: Date;
  code: string;
};

const pad = (n: number) => String(n).padStart(2, '0');

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
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizOption[]>([]);
  const [active, setActive] = useState<string | null>(null);
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
      setQIndex(0);
      setAnswers([]);
      setActive(null);
      setGuessed(false);
      setRecs([]);
      setEnvelopeDone(false);
      track('scan_opened', nextEntry === 'busta' ? 'da busta' : 'da coupon');
    },
    [track],
  );

  /* --- passaggi automatici: «Partiamo.» e «Ci siamo quasi.» --- */
  useEffect(() => {
    if (step === 'warmup') {
      const t = window.setTimeout(() => setStep('quiz'), 1100);
      return () => window.clearTimeout(t);
    }
    if (step === 'moment') {
      const t = window.setTimeout(() => setStep('result'), 1300);
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

  /* --- risposta a una domanda: il tap avanza --- */
  const answering = useRef(false);
  const onAnswer = (option: QuizOption) => {
    if (answering.current) return;
    answering.current = true;
    setActive(option.label);

    const question = QUESTIONS[qIndex];
    let detail = `${pad(qIndex + 1)} · ${option.label}`;
    let hit = guessed;
    if (question.scoring) {
      const natural = option.family === MYSTERY.family;
      hit = forced === 'right' ? true : forced === 'wrong' ? false : natural;
      setGuessed(hit);
      detail += ` · ${hit ? 'indovinato' : 'non indovinato'}`;
    }
    track('quiz_answered', detail);
    const nextAnswers = [...answers, option];
    setAnswers(nextAnswers);

    window.setTimeout(() => {
      answering.current = false;
      setActive(null);
      if (qIndex + 1 < QUESTIONS.length) {
        setQIndex(qIndex + 1);
      } else {
        setRecs(computeRecs(nextAnswers));
        setStep('moment');
      }
    }, 260);
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

  const stepKey = step === 'quiz' ? `quiz-${qIndex}` : step;

  return (
    <>
      <div className={`fx-step${step === 'landing' ? ' fx-step--landing' : ''}`} key={stepKey}>
        {step === 'landing' && <Landing entry={entry} nome={urlNome} onStart={() => setStep('warmup')} />}
        {step === 'warmup' && <Interlude title={copy.warmup} />}
        {step === 'quiz' && <Question index={qIndex} active={active} onAnswer={onAnswer} />}
        {step === 'moment' && <Interlude eyebrow={copy.result.eyebrow} title={copy.result.almost} />}
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

/* Le tre raccomandazioni: famiglie più votate nelle risposte
 * (la domanda che conta pesa doppio), poi il catalogo in quell'ordine. */
function computeRecs(answers: QuizOption[]): CatalogEntry[] {
  const score = new Map<Family, number>(FAMILIES.map((f) => [f, 0]));
  answers.forEach((option, i) => {
    if (option.family) {
      score.set(option.family, (score.get(option.family) ?? 0) + (QUESTIONS[i]?.scoring ? 2 : 1));
    }
  });
  const ranked = [...FAMILIES].sort((a, b) => (score.get(b) ?? 0) - (score.get(a) ?? 0));
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
/* Passaggi intermedi («Partiamo.», «Ci siamo quasi.»)                 */
/* ------------------------------------------------------------------ */

function Interlude({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <>
      <div className="fx-top" />
      <div className="fx-main">
        {eyebrow && <p className="fx-eyebrow">{eyebrow}</p>}
        <h1 className="fx-h1 fx-h1--display">{title}</h1>
      </div>
      <div className="fx-bottom" />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Domanda                                                             */
/* ------------------------------------------------------------------ */

function Question({
  index,
  active,
  onAnswer,
}: {
  index: number;
  active: string | null;
  onAnswer: (o: QuizOption) => void;
}) {
  const question = QUESTIONS[index];
  const progress = ((index + 1) / QUESTIONS.length) * 100;
  return (
    <>
      <div className="fx-top">
        <p className="fx-counter">
          {fill(copy.quiz.counter, { n: pad(index + 1), total: pad(QUESTIONS.length) })}
        </p>
        <div className="fx-bar">
          <i style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="fx-main">
        <h1 className="fx-h1">{question.text}</h1>
        <div className="fx-opts">
          {question.options.map((o) => (
            <button
              key={o.label}
              className="fx-opt"
              data-active={active === o.label}
              onClick={() => onAnswer(o)}
            >
              {o.label}
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
        <p className={`fx-eyebrow${guessed ? '' : ' fx-eyebrow--muted'}`}>{copy.result.eyebrow}</p>
        <h1 className="fx-h1 fx-h1--display">
          {guessed ? copy.result.right.title : copy.result.wrong.title}
        </h1>
        <p className="fx-lede">{guessed ? copy.result.right.sub : copy.result.wrong.sub}</p>
        <p className="fx-reveal-name">
          {fill(copy.result.reveal, { name: MYSTERY.name, maison: MYSTERY.maison })}
        </p>
        {!guessed && (
          <p className="fx-note" style={{ marginTop: 'var(--fx-space-2)' }}>
            {fill(copy.result.pct, { pct: MYSTERY.guessedPct })}
          </p>
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
        {!guessed && <p className="fx-lede">{copy.result.wrong.chosen}</p>}
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
