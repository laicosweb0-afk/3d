'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FAMILIES, MYSTERY, type Family } from '@/data/fragrances';
import { copy, fill } from '@/content/quiz/copy';

/* ------------------------------------------------------------------ */
/* Tipi                                                                */
/* ------------------------------------------------------------------ */

type Step = 's0' | 's1' | 's2' | 's3' | 's4' | 's5' | 'end';
type Entry = 'coupon' | 'busta';
type ForcedOutcome = 'off' | 'right' | 'wrong';

type TrackedEvent = {
  name: string;
  detail?: string;
  ts: Date;
  code: string;
};

/* ------------------------------------------------------------------ */
/* Logo                                                                */
/* ------------------------------------------------------------------ */

function Logo({ onInk }: { onInk: boolean }) {
  return (
    <header className="fx-logo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={onInk ? '/WOMAN-logo-white.png' : '/WOMAN-logo.png'} alt="Woman Parfume Store" />
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Flusso                                                              */
/* ------------------------------------------------------------------ */

export default function QuizFlow() {
  const params = useSearchParams();
  const code = params.get('c') || '—';
  const urlEntry: Entry = params.get('from') === 'busta' ? 'busta' : 'coupon';
  const urlNome = params.get('nome') || copy.s0.busta.defaultNome;

  const [entry, setEntry] = useState<Entry>(urlEntry);
  const [step, setStep] = useState<Step>('s0');
  const [answer, setAnswer] = useState<Family | null>(null);
  const [guessed, setGuessed] = useState(false);
  const [selected, setSelected] = useState<Family[]>([]);
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
      setStep('s0');
      setAnswer(null);
      setGuessed(false);
      setSelected([]);
      setEnvelopeDone(false);
      track('scan_opened', nextEntry === 'busta' ? 'da busta' : 'da coupon');
    },
    [track],
  );

  /* --- S1: il tap sulla risposta avanza --- */
  const answered = useRef(false);
  const onAnswer = (family: Family) => {
    if (answered.current) return;
    answered.current = true;
    const natural = family === MYSTERY.family;
    const hit = forced === 'right' ? true : forced === 'wrong' ? false : natural;
    setAnswer(family);
    setGuessed(hit);
    track('quiz_answered', `${family} · ${hit ? 'indovinato' : 'non indovinato'}`);
    window.setTimeout(() => {
      answered.current = false;
      setStep('s2');
    }, 240);
  };

  /* --- S3: preselezione per chi non ha indovinato --- */
  const startChoice = () => {
    if (!guessed) {
      const pre: Family[] = [];
      for (const f of [answer, MYSTERY.family, ...FAMILIES]) {
        if (f && !pre.includes(f)) pre.push(f);
        if (pre.length === 3) break;
      }
      setSelected(pre);
    }
    setStep('s3');
  };

  const toggleFamily = (f: Family) => {
    setSelected((prev) => {
      if (prev.includes(f)) return prev.filter((x) => x !== f);
      if (prev.length >= 3) return prev;
      return [...prev, f];
    });
  };

  const confirmChoice = () => {
    track('families_selected', selected.join(' · '));
    setStep('s4');
  };

  const saveEmail = (email: string) => {
    track('email_saved', email);
    setStep('s5');
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
  const baseLevel = guessed ? copy.levels.allenato : copy.levels.curioso;
  const finalLevel = envelopeDone
    ? guessed
      ? copy.levels.esperto
      : copy.levels.allenato
    : baseLevel;

  const onInk = step === 's0' || step === 's2' || step === 'end';

  return (
    <main className="fx-frame">
      <div className="fx-screen" data-bg={onInk ? 'ink' : undefined} key={step}>
        <Logo onInk={onInk} />
        {step === 's0' && (
          <Intro entry={entry} nome={urlNome} onStart={() => setStep('s1')} />
        )}
        {step === 's1' && <Question answer={answer} onAnswer={onAnswer} />}
        {step === 's2' && (
          <Reveal
            guessed={guessed}
            level={baseLevel}
            onShown={() => track('result_shown', guessed ? 'indovinato' : 'non indovinato')}
            onNext={startChoice}
          />
        )}
        {step === 's3' && (
          <Choice
            guessed={guessed}
            selected={selected}
            onToggle={toggleFamily}
            onConfirm={confirmChoice}
          />
        )}
        {step === 's4' && <Email onSave={saveEmail} />}
        {step === 's5' && <Envelope onFinish={finish} />}
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
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* S0 — Ingresso                                                       */
/* ------------------------------------------------------------------ */

function Intro({
  entry,
  nome,
  onStart,
}: {
  entry: Entry;
  nome: string;
  onStart: () => void;
}) {
  const mittente = copy.s0.busta.defaultMittente;
  return (
    <>
      <div className="fx-body">
        {entry === 'coupon' ? (
          <>
            <h1 className="fx-title fx-title--xl">{copy.s0.coupon.title}</h1>
            <p className="fx-sub">{copy.s0.coupon.subtitle}</p>
          </>
        ) : (
          <>
            <h1 className="fx-title fx-title--xl">{fill(copy.s0.busta.title, { nome })}</h1>
            <p className="fx-sub">{fill(copy.s0.busta.subtitle, { mittente })}</p>
            <p className="fx-note" style={{ marginTop: 18 }}>
              {fill(copy.s0.busta.transparency, { mittente })}
            </p>
          </>
        )}
      </div>
      <div className="fx-actions">
        <button className="fx-btn" onClick={onStart}>
          {copy.s0.cta}
        </button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* S1 — La domanda                                                     */
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
      <div className="fx-body">
        <p className="fx-eyebrow">{copy.s1.eyebrow}</p>
        <h1 className="fx-title">{copy.s1.question}</h1>
      </div>
      <div className="fx-actions">
        <div className="fx-answers">
          {FAMILIES.map((f) => (
            <button
              key={f}
              className="fx-answer"
              data-active={answer === f}
              onClick={() => onAnswer(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* S2 — La rivelazione                                                 */
/* ------------------------------------------------------------------ */

function Reveal({
  guessed,
  level,
  onShown,
  onNext,
}: {
  guessed: boolean;
  level: string;
  onShown: () => void;
  onNext: () => void;
}) {
  const [shown, setShown] = useState(false);
  const notified = useRef(false);

  useEffect(() => {
    // 600 ms di attesa prima del risultato (BRIEF §4, S2)
    const t = window.setTimeout(() => {
      setShown(true);
      if (!notified.current) {
        notified.current = true;
        onShown();
      }
    }, 600);
    return () => window.clearTimeout(t);
  }, [onShown]);

  if (!shown) return <div className="fx-body" />;

  return (
    <>
      <div className="fx-body fx-reveal">
        <p className={`fx-eyebrow${guessed ? ' fx-eyebrow--magenta' : ''}`}>
          {guessed ? copy.s2.guessed.eyebrow : copy.s2.missed.eyebrow}
        </p>
        <h1 className="fx-title">{fill(copy.s2.reveal, { name: MYSTERY.name })}</h1>
        {guessed ? (
          <>
            <p className="fx-sub">{fill(copy.s2.guessed.byMaison, { maison: MYSTERY.maison })}</p>
            <p className="fx-notes">{MYSTERY.notes.join(' · ')}</p>
          </>
        ) : (
          <>
            <p className="fx-sub">{fill(copy.s2.missed.trick, { trickNote: MYSTERY.trickNote })}</p>
            <p className="fx-notes">{fill(copy.s2.missed.pct, { pct: MYSTERY.guessedPct })}</p>
          </>
        )}
        <div className="fx-credit">
          <p>{copy.s2.credit}</p>
          <p className="fx-note" style={{ marginTop: 8 }}>
            {copy.s2.creditSub}
          </p>
        </div>
        <p className="fx-level">
          {copy.levelLabel}: {level}
        </p>
      </div>
      <div className="fx-actions">
        <button className="fx-btn" onClick={onNext}>
          {copy.s2.cta}
        </button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* S3 — La scelta                                                      */
/* ------------------------------------------------------------------ */

function Choice({
  guessed,
  selected,
  onToggle,
  onConfirm,
}: {
  guessed: boolean;
  selected: Family[];
  onToggle: (f: Family) => void;
  onConfirm: () => void;
}) {
  // Chi non ha indovinato vede le tre proposte; la griglia si apre col
  // link «cambiale». Chi ha indovinato sceglie subito dalla griglia.
  const [editing, setEditing] = useState(guessed);
  const ready = selected.length === 3;

  return (
    <>
      <div className="fx-body">
        <h1 className="fx-title">{copy.s3.title}</h1>
        <p className="fx-sub">{guessed ? copy.s3.guessedSub : copy.s3.missedSub}</p>

        {editing ? (
          <div className="fx-grid">
            {FAMILIES.map((f) => (
              <button
                key={f}
                className="fx-family"
                data-selected={selected.includes(f)}
                onClick={() => onToggle(f)}
              >
                {f}
              </button>
            ))}
          </div>
        ) : (
          <>
            <ul className="fx-picked">
              {selected.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button className="fx-ghost" style={{ marginTop: 14 }} onClick={() => setEditing(true)}>
              {copy.s3.change}
            </button>
          </>
        )}
      </div>
      <div className="fx-actions">
        {editing && (
          <div>
            <p className="fx-summary">{copy.s3.summaryLabel}</p>
            <p className="fx-note">{ready ? selected.join(' · ') : `${selected.length} / 3`}</p>
          </div>
        )}
        <button className="fx-btn" disabled={!ready} onClick={onConfirm}>
          {copy.s3.cta}
        </button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* S4 — Il salvataggio                                                 */
/* ------------------------------------------------------------------ */

function Email({ onSave }: { onSave: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && consent;

  return (
    <>
      <div className="fx-body">
        <h1 className="fx-title">{copy.s4.title}</h1>
      </div>
      <div className="fx-actions">
        <div>
          <input
            className="fx-field"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={copy.s4.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className="fx-consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              {copy.s4.consent}{' '}
              <a href="#" onClick={(e) => e.preventDefault()}>
                {copy.s4.privacyLink}
              </a>
            </span>
          </label>
        </div>
        <button className="fx-btn" disabled={!valid} onClick={() => onSave(email)}>
          {copy.s4.cta}
        </button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* S5 — La busta                                                       */
/* ------------------------------------------------------------------ */

function Envelope({ onFinish }: { onFinish: (name: string | null) => void }) {
  const [name, setName] = useState('');

  return (
    <>
      <div className="fx-body">
        <h1 className="fx-title">{copy.s5.title}</h1>
        <p className="fx-sub">{copy.s5.text}</p>
      </div>
      <div className="fx-actions">
        <input
          className="fx-field"
          type="text"
          placeholder={copy.s5.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="fx-btn" onClick={() => onFinish(name.trim())}>
          {copy.s5.cta}
        </button>
        <button className="fx-ghost" onClick={() => onFinish(null)}>
          {copy.s5.later}
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
    <div className="fx-body" style={{ textAlign: 'center' }}>
      <h1 className="fx-claim">{copy.claim}</h1>
      <p className="fx-claim-sub">{copy.claimSub}</p>
      <p className="fx-level" style={{ marginTop: 34 }}>
        {copy.levelLabel}: {level}
      </p>
      <p className="fx-note" style={{ marginTop: 10 }}>
        {copy.end.creditSaved}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pannello demo (BRIEF §6)                                            */
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
