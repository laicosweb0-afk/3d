'use client';

// La radice dell'esperienza: canvas fisso + spacer di scroll + layer DOM.
// Con prefers-reduced-motion il viaggio si ritira e resta il documento.

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { World } from './canvas/World';
import { Hero } from './dom/Hero';
import { Overlays, afterJourney } from './dom/Overlays';
import { RealityWindows } from './dom/RealityWindows';
import { TimelineMetro } from './dom/TimelineMetro';
import { VideoJourney } from './dom/VideoJourney';
import { initScroll } from '@/lib/scroll';
import { TOTAL_VH } from '@/lib/scenes';
import { VIAGGIO_VH, progresso3D, subentroVideo, veloBianco } from '@/content/viaggio';
import { progress, debugState, setMappa3D } from '@/lib/progress';
import { setAudioEnabled, updateAudio } from '@/lib/audio';
import { useApp } from '@/lib/store';
import { Monogram } from './dom/Monogram';

function AudioToggle() {
  const audioOn = useApp((s) => s.audioOn);
  const toggle = useApp((s) => s.toggleAudio);
  return (
    <button
      type="button"
      className={`chrome-audio ${audioOn ? 'is-on' : ''}`}
      aria-pressed={audioOn}
      aria-label={audioOn ? 'Disattiva il suono' : 'Attiva il suono'}
      onClick={() => {
        setAudioEnabled(!audioOn);
        toggle();
      }}
    >
      <span aria-hidden="true" />
      <span aria-hidden="true" />
      <span aria-hidden="true" />
    </button>
  );
}

export function ExperienceRoot() {
  const [mounted, setMounted] = useState(false);
  const [reduced, setReduced] = useState(false);
  // Modalità video (?video=1): il viaggio è il girato reale scrubbato dallo
  // scroll al posto del 3D. Opt-in finché le clip non sono nel repo: senza
  // file la modalità non trova i video e il sito 3D resta la via normale.
  const [videoMode, setVideoMode] = useState(false);
  const spacer = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const velo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // modalità fotogramma per still di produzione/QA
    const q = new URLSearchParams(window.location.search);
    const pParam = q.get('p');
    if (pParam !== null) {
      debugState.fixedP = Math.min(1, Math.max(0, parseFloat(pParam)));
      progress.p = debugState.fixedP;
      progress.smoothed = debugState.fixedP;
    }
    debugState.clay = q.get('clay') === '1';
    debugState.still = q.get('still') === '1';
    const bpParam = q.get('bp');
    if (bpParam !== null) {
      debugState.bp = Math.min(1, Math.max(0, parseFloat(bpParam)));
    }
    // Aggancio per gli strumenti di previz: sposta il progresso senza
    // ricaricare la pagina. Serve a renderizzare una sequenza (il video della
    // traiettoria di camera da dare ai modelli come riferimento del
    // movimento): ricaricare a ogni fotogramma costerebbe minuti per pochi
    // secondi di girato. Esiste solo in modalità fotogramma, mai in produzione.
    if (debugState.still) {
      (window as unknown as { __setP?: (v: number) => void }).__setP = (v) => {
        const c = Math.min(1, Math.max(0, v));
        debugState.fixedP = c;
        progress.p = c;
        progress.viaggio = c;
        // In ibrido il 3D vede il tratto rimappato; altrimenti coincidono.
        progress.smoothed = q.get('video') === '1' ? progresso3D(c) : c;
      };
    }
    if (q.get('ui') === '0') document.body.classList.add('no-ui');
    const ibrido = q.get('video') === '1';
    // Nel viaggio ibrido il 3D deve continuare a ragionare nel suo intervallo
    // naturale: lo scroll copre due linguaggi, ma la regia non lo deve sapere.
    setMappa3D(ibrido ? progresso3D : null);
    if (ibrido && debugState.fixedP !== null) {
      progress.viaggio = debugState.fixedP;
      progress.smoothed = progresso3D(debugState.fixedP);
    }
    setVideoMode(ibrido);
    setMounted(true);
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    if (!mounted || reduced || !spacer.current) return;
    if (debugState.fixedP !== null) return; // fotogramma bloccato: niente scroll
    return initScroll(spacer.current);
  }, [mounted, reduced]);

  // suono: f(p, velocità), come tutto il resto
  useEffect(() => {
    if (!mounted || reduced) return;
    const update = () => updateAudio(progress.smoothed, progress.velocity);
    gsap.ticker.add(update);
    return () => gsap.ticker.remove(update);
  }, [mounted, reduced]);

  // Il congedo del mondo. Le sezioni scorrono sopra il canvas, che è fisso:
  // finché resta opaco la prima sezione gli passa davanti come una lama e
  // taglia la casa a metà parete, con tanto di filo del border-top. Il mondo
  // si dissolve sulla stessa curva con cui se ne vanno chrome, metro e testi
  // — quando la sezione arriva non c'è più niente da tagliare.
  // In modalità video non si dissolve niente: l'ultima clip finisce sul cielo
  // quasi bianco, e il fondo del sito è lo stesso bianco. Le sezioni scorrono
  // sopra un fotogramma che è già diventato pagina — la transizione l'ha fatta
  // la camera uscendo dalla finestra. Dissolvere qui rimetterebbe lo stacco
  // che tutta la regia serve a evitare.
  useEffect(() => {
    if (!mounted || reduced || !world.current) return;
    const el = world.current;
    const update = () => {
      if (videoMode) {
        // Il modello cede il posto al girato sulla soglia: sfuma mentre la
        // porta si apre, che è il punto in cui il progetto diventa cantiere
        // vero. Dopo resta spento — il suo compito è finito.
        const dentro = subentroVideo(progress.viaggio);
        el.style.opacity = String(1 - dentro);
        el.style.visibility = dentro >= 0.999 ? 'hidden' : 'visible';
        return;
      }
      const out = afterJourney();
      el.style.opacity = String(1 - out);
      el.style.visibility = out >= 1 ? 'hidden' : 'visible';
    };
    gsap.ticker.add(update);
    return () => gsap.ticker.remove(update);
  }, [mounted, reduced, videoMode]);

  // Il velo bianco sulla soglia (solo ibrido): modello e girato sono due
  // inquadrature diverse, quindi non si dissolvono l'uno nell'altro — spariscono
  // entrambi dentro il bianco della porta, e il bianco si ritira sul girato.
  useEffect(() => {
    if (!mounted || reduced || !videoMode || !velo.current) return;
    const el = velo.current;
    const update = () => {
      const v = veloBianco(progress.viaggio);
      el.style.opacity = String(v);
      el.style.visibility = v <= 0.001 ? 'hidden' : 'visible';
    };
    gsap.ticker.add(update);
    return () => gsap.ticker.remove(update);
  }, [mounted, reduced, videoMode]);

  // motion: reveal delle sezioni con easing cinematografico
  useEffect(() => {
    if (!mounted) return;
    const sections = document.querySelectorAll('.sez, .s13, .footer');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    sections.forEach((s) => {
      s.classList.add('reveal');
      io.observe(s);
    });
    return () => io.disconnect();
  }, [mounted]);

  // parallax: le foto degli ambienti scorrono un filo più lente dello
  // scroll (depth cue Apple/Awwwards). Solo mentre sono a schermo.
  useEffect(() => {
    if (!mounted || reduced) return;
    const figs = Array.from(
      document.querySelectorAll<HTMLElement>('.foto-grid figure')
    );
    figs.forEach((f) => f.classList.add('has-parallax'));
    const update = () => {
      const vh = window.innerHeight;
      for (const f of figs) {
        const r = f.getBoundingClientRect();
        if (r.bottom < -120 || r.top > vh + 120) continue;
        const off = (r.top + r.height / 2 - vh / 2) / vh; // ~ -0.7..0.7
        const img = f.querySelector<HTMLImageElement>('.foto-media img');
        if (img) img.style.transform = `translate3d(0, calc(-8% + ${(off * -26).toFixed(1)}px), 0)`;
      }
    };
    gsap.ticker.add(update);
    return () => gsap.ticker.remove(update);
  }, [mounted, reduced]);

  if (mounted && reduced) {
    return (
      <div className="reduced">
        <Hero />
      </div>
    );
  }

  return (
    <>
      {/* Viaggio ibrido: il girato sta sotto e il modello sopra. Il modello
          porta dal foglio bianco fino alla porta che si apre — è lui a tenere
          il bianco dell'hero senza strappi — poi sfuma e sotto è già pronto il
          girato, fermo sul suo primo fotogramma. */}
      {mounted && videoMode && (
        <div className="world" aria-hidden="true">
          <VideoJourney />
        </div>
      )}
      <div className="world" aria-hidden="true" ref={world}>
        {mounted && <World />}
      </div>
      {mounted && videoMode && <div className="velo-bianco" aria-hidden="true" ref={velo} />}
      <div
        className="journey-spacer"
        ref={spacer}
        style={{ height: `${(videoMode ? VIAGGIO_VH : TOTAL_VH) * 100}svh` }}
      />
      <Hero />
      {/* Finestre di realtà, testi e metro appartengono alla regia 3D: in
          modalità video il girato È la realtà, e i testi andranno riancorati
          alle clip (lavoro successivo). */}
      {!videoMode && <RealityWindows />}
      {!videoMode && <Overlays />}
      {!videoMode && <TimelineMetro />}
      <header className="chrome">
        <span className="chrome-logo">
          <Monogram className="chrome-mark" />
          Mondial Service
        </span>
        <div className="chrome-actions">
          <AudioToggle />
          <a className="chrome-cta" href="#contatti">Contattaci</a>
        </div>
      </header>
    </>
  );
}
