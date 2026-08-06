// Il riconoscimento vocale del browser non sta nelle definizioni standard di
// TypeScript: `SpeechRecognition` è un'API storicamente prefissata `webkit-` e
// non ancora normata, quindi ce la dichiariamo noi.
//
// Qui c'è solo la parte che usiamo davvero in `components/Barra.tsx`. Se un
// giorno serve altro (grammatiche, risultati alternativi, `maxAlternatives`),
// si aggiunge qui: è il posto giusto, e resta l'unico.

interface RisultatoParlato {
  readonly transcript: string;
  readonly confidence: number;
}

interface BranoParlato {
  readonly isFinal: boolean;
  readonly length: number;
  [indice: number]: RisultatoParlato;
}

interface ElencoBrani {
  readonly length: number;
  [indice: number]: BranoParlato;
}

interface EventoParlato extends Event {
  readonly resultIndex: number;
  readonly results: ElencoBrani;
}

interface ErroreParlato extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: ((this: SpeechRecognition, evento: Event) => void) | null;
  onresult: ((this: SpeechRecognition, evento: EventoParlato) => void) | null;
  onerror: ((this: SpeechRecognition, evento: ErroreParlato) => void) | null;
  onend: ((this: SpeechRecognition, evento: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
