'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * La voce del coniglio, e il livello che muove la bocca.
 *
 * Tre strade, provate sempre nello stesso ordine:
 *
 *  1. L'audio recitato, se la battuta ce l'ha (`/voce/<id>.mp3`): è la strada
 *     del prototipo — voce da cartone registrata una volta, zero servizi a
 *     pagamento al momento della visita.
 *
 *  2. ElevenLabs, se il progetto gira col server e le chiavi (`/api/tts`).
 *
 *  In entrambi i casi l'audio passa da un AnalyserNode: il volume letto
 *  istante per istante è quello che apre e chiude la bocca — il labiale non è
 *  inventato, è la voce vera.
 *
 *  3. La voce del browser, con il tono alzato: la rete di sicurezza. Qui il
 *     volume non si può leggere — `speechSynthesis` non passa dal grafo
 *     audio — quindi la bocca si muove su un'onda finta.
 *
 * In nessun caso un guasto ferma la conversazione: il testo nel fumetto è già
 * a schermo prima che la voce parta.
 */

type FinestraConAudio = Window & { webkitAudioContext?: typeof AudioContext };

export function useVoce() {
  const [livello, setLivello] = useState(0);
  const [staParlando, setStaParlando] = useState(false);

  const contestoRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analisiRef = useRef<AnalyserNode | null>(null);
  const frameRef = useRef(0);
  const urlRef = useRef<string | null>(null);

  /**
   * Va chiamata da dentro un gesto dell'utente — un tocco, un click.
   *
   * Su iOS l'audio non parte se il contesto non è stato creato o risvegliato
   * mentre il dito era ancora sullo schermo. Siccome il coniglio parla dopo una
   * chiamata di rete, quando il gesto è ormai passato, il contesto va aperto
   * prima: al primo tocco qualsiasi sulla pagina.
   */
  const sveglia = useCallback(() => {
    if (!contestoRef.current) {
      const Costruttore =
        window.AudioContext ?? (window as unknown as FinestraConAudio).webkitAudioContext;
      if (Costruttore) contestoRef.current = new Costruttore();
    }
    void contestoRef.current?.resume().catch(() => {});
  }, []);

  /** Il grafo audio si costruisce una volta sola: un elemento a cui cambiamo la sorgente. */
  const preparaAudio = useCallback((contesto: AudioContext) => {
    if (audioRef.current) return audioRef.current;
    const elemento = new Audio();
    elemento.preload = 'auto';
    const sorgente = contesto.createMediaElementSource(elemento);
    const analisi = contesto.createAnalyser();
    analisi.fftSize = 1024;
    analisi.smoothingTimeConstant = 0.65;
    sorgente.connect(analisi);
    analisi.connect(contesto.destination);
    analisiRef.current = analisi;
    audioRef.current = elemento;
    return elemento;
  }, []);

  const fermaMisura = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
    setLivello(0);
  }, []);

  /** Legge il volume reale dall'analizzatore, un frame alla volta. */
  const misuraDavvero = useCallback(() => {
    const analisi = analisiRef.current;
    if (!analisi) return;
    const campioni = new Uint8Array(analisi.fftSize);
    const passo = () => {
      analisi.getByteTimeDomainData(campioni);
      let somma = 0;
      for (let i = 0; i < campioni.length; i++) {
        const scarto = (campioni[i] - 128) / 128;
        somma += scarto * scarto;
      }
      // Radice quadrata media, poi una scala generosa: il parlato normale sta
      // molto sotto il fondo scala, e senza amplificarlo la bocca resterebbe
      // quasi ferma per tutta la frase.
      const intensita = Math.min(1, Math.sqrt(somma / campioni.length) * 4.2);
      setLivello(intensita);
      frameRef.current = requestAnimationFrame(passo);
    };
    frameRef.current = requestAnimationFrame(passo);
  }, []);

  /** L'onda finta, per quando parla il browser e non c'è niente da misurare. */
  const misuraAFinta = useCallback(() => {
    const inizio = performance.now();
    const passo = () => {
      const t = (performance.now() - inizio) / 1000;
      // Tre seni incommensurabili fra loro: non si ripete a orecchio, e le
      // pause fra una sillaba e l'altra vengono da sole.
      const onda =
        0.5 + 0.5 * Math.sin(t * 11.3) * Math.sin(t * 4.1 + 1.2) * Math.sin(t * 2.3 + 0.4);
      setLivello(Math.max(0, Math.min(1, onda * 0.85)));
      frameRef.current = requestAnimationFrame(passo);
    };
    frameRef.current = requestAnimationFrame(passo);
  }, []);

  /** Zittisce tutto: usata prima di ogni nuova battuta e allo smontaggio. */
  const taci = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
    }
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    fermaMisura();
    setStaParlando(false);
  }, [fermaMisura]);

  const vocePropria = useCallback(
    async (testo: string, urlAudio?: string): Promise<boolean> => {
      // Prima l'audio recitato della battuta, se esiste; poi il TTS del
      // server. Un file mancante risponde 404 (o una pagina HTML): entrambi i
      // casi cadono nel `return false` e si passa alla strada successiva.
      const risposta = urlAudio
        ? await fetch(urlAudio)
        : await fetch('/api/tts', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ testo }),
          });
      if (!risposta.ok) return false;
      const tipo = risposta.headers.get('content-type') ?? '';
      if (urlAudio && !tipo.startsWith('audio/')) return false;

      const suono = await risposta.blob();
      if (!suono.size) return false;

      const contesto = contestoRef.current;
      const url = URL.createObjectURL(suono);
      urlRef.current = url;

      // Senza AudioContext si sente lo stesso, semplicemente la bocca si muove
      // sull'onda finta invece che sul volume reale.
      const elemento = contesto ? preparaAudio(contesto) : (audioRef.current ??= new Audio());
      elemento.src = url;

      await new Promise<void>((risolvi) => {
        const chiudi = () => {
          elemento.onended = null;
          elemento.onerror = null;
          risolvi();
        };
        elemento.onended = chiudi;
        elemento.onerror = chiudi;
        elemento
          .play()
          .then(() => (contesto && analisiRef.current ? misuraDavvero() : misuraAFinta()))
          .catch(chiudi);
      });

      URL.revokeObjectURL(url);
      urlRef.current = null;
      return true;
    },
    [preparaAudio, misuraDavvero, misuraAFinta],
  );

  const voceDelBrowser = useCallback(
    async (testo: string): Promise<void> => {
      if (typeof speechSynthesis === 'undefined') return;

      const battuta = new SpeechSynthesisUtterance(testo);
      battuta.lang = 'it-IT';
      // Tono alto e passo svelto: è il segnaposto della voce cartoonesca, non
      // la voce definitiva. Quella arriva dalle battute recitate.
      battuta.pitch = 1.75;
      battuta.rate = 1.06;

      const italiane = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('it'));
      if (italiane.length) battuta.voice = italiane[0];

      misuraAFinta();
      await new Promise<void>((risolvi) => {
        // Alcuni browser (o un sistema senza voci installate) non chiamano mai
        // `onend`: senza paracadute la demo resterebbe «occupata» per sempre.
        // Il tempo massimo è proporzionale alla lunghezza della battuta.
        const paracadute = setTimeout(risolvi, Math.max(4000, testo.length * 110));
        const chiudi = () => {
          clearTimeout(paracadute);
          risolvi();
        };
        battuta.onend = chiudi;
        battuta.onerror = chiudi;
        speechSynthesis.speak(battuta);
      });
    },
    [misuraAFinta],
  );

  /**
   * Fa parlare il coniglio. Ritorna quando ha finito, comunque sia andata.
   * `urlAudio` è la battuta recitata, se esiste; `conTts` dice se ha senso
   * tentare anche il server (nel prototipo statico non c'è: si salta).
   */
  const di = useCallback(
    async (testo: string, opzioni?: { urlAudio?: string; conTts?: boolean }) => {
      taci();
      setStaParlando(true);
      try {
        let riuscito = false;
        if (opzioni?.urlAudio) {
          riuscito = await vocePropria(testo, opzioni.urlAudio).catch(() => false);
        }
        if (!riuscito && (opzioni?.conTts ?? true)) {
          riuscito = await vocePropria(testo).catch(() => false);
        }
        if (!riuscito) await voceDelBrowser(testo);
      } finally {
        fermaMisura();
        setStaParlando(false);
      }
    },
    [taci, vocePropria, voceDelBrowser, fermaMisura],
  );

  useEffect(() => taci, [taci]);

  return { di, taci, sveglia, livello, staParlando };
}
