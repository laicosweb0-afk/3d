import type { Fonte } from '@/lib/dominio/tipi';
import type { Canale } from '@/lib/dominio/campagne';

// I loghi delle provenienze.
//
// Un pallino colorato bisogna impararlo; un logo si riconosce prima di
// leggerlo. Dove la fonte è un posto che esiste davvero — Instagram,
// Facebook, WhatsApp, Google, Gmail — si usa il suo marchio, nel suo
// colore. Dove non c'è un marchio (showroom, passaparola, card) si usa un
// disegno semplice che dica la cosa.
//
// La parola resta sempre accanto al logo: un'icona da sola è un indovinello,
// e chi non distingue i colori leggerebbe solo macchie.
//
// Sono SVG scritti a mano, dentro il CRM: nessuna immagine da scaricare,
// nessuna chiamata a server di terzi, e quindi nessuno che sappia chi
// guarda cosa.

const TRATTO = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function Guscio({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <svg className="logo-fonte" viewBox="0 0 24 24" role="img" aria-label={titolo}>
      <title>{titolo}</title>
      {children}
    </svg>
  );
}

const Instagram = (
  <Guscio titolo="Instagram">
    <g style={{ color: '#e1306c' }} {...TRATTO}>
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" />
      <circle cx="12" cy="12" r="4.1" />
    </g>
    <circle cx="17.2" cy="6.8" r="1.25" fill="#e1306c" />
  </Guscio>
);

const Facebook = (
  <Guscio titolo="Facebook">
    <path
      fill="#1877f2"
      d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.5-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.33v6.99A10 10 0 0 0 22 12Z"
    />
  </Guscio>
);

const WhatsApp = (
  <Guscio titolo="WhatsApp">
    <g fill="#25d366">
      <path d="M12 2.4a9.6 9.6 0 0 0-8.16 14.66L2.4 21.6l4.68-1.38A9.6 9.6 0 1 0 12 2.4Zm0 17.47a7.85 7.85 0 0 1-4.1-1.15l-.3-.18-2.86.84.86-2.79-.19-.3A7.87 7.87 0 1 1 12 19.87Z" />
      <path d="M16.63 14.1c-.25-.13-1.49-.73-1.72-.82-.23-.08-.4-.12-.56.13-.17.25-.65.82-.79.99-.15.17-.29.19-.54.06a6.44 6.44 0 0 1-3.22-2.81c-.24-.42.24-.39.69-1.3.08-.16.04-.3-.02-.42-.06-.13-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.42h-.48c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.06s.89 2.39 1.01 2.56c.12.17 1.74 2.66 4.22 3.73 1.57.68 2.19.73 2.98.62.48-.07 1.49-.61 1.7-1.2.21-.59.21-1.1.15-1.2-.06-.11-.23-.17-.47-.3Z" />
    </g>
  </Guscio>
);

const Google = (
  <Guscio titolo="Google">
    <path fill="#4285f4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.36Z" />
    <path fill="#34a853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z" />
    <path fill="#fbbc05" d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02l3.34-2.59Z" />
    <path fill="#ea4335" d="M12 5.93c1.47 0 2.78.5 3.82 1.5l2.86-2.86C16.96 2.98 14.7 2 12 2A10 10 0 0 0 3.07 7.49l3.34 2.59C7.2 7.72 9.4 5.93 12 5.93Z" />
  </Guscio>
);

const Gmail = (
  <Guscio titolo="Gmail">
    <path
      fill="#ea4335"
      d="M3.4 7.1c0-.97.79-1.76 1.76-1.76h.45L12 10.44l6.39-5.1h.45c.97 0 1.76.79 1.76 1.76v9.8c0 .97-.79 1.76-1.76 1.76h-1.93v-8.4L12 14.4l-4.91-4.14v8.4H5.16c-.97 0-1.76-.79-1.76-1.76V7.1Z"
    />
  </Guscio>
);

const Messenger = (
  <Guscio titolo="Messenger">
    <path
      fill="#0084ff"
      d="M12 2.4C6.5 2.4 2.4 6.4 2.4 11.8c0 2.84 1.17 5.3 3.07 7.01.16.14.26.34.26.56l.05 1.74c.02.55.59.91 1.1.69l1.94-.86c.17-.07.36-.09.53-.04 1.09.3 2.26.46 3.48.46 5.5 0 9.6-4.02 9.6-9.4 0-5.4-4.1-9.56-9.43-9.56Zm5.76 7.2-2.82 4.47c-.45.71-1.42.89-2.09.38l-2.24-1.68a.58.58 0 0 0-.7 0l-3.03 2.3c-.4.3-.93-.18-.66-.61l2.82-4.47a1.5 1.5 0 0 1 2.09-.38l2.24 1.68c.21.15.49.15.7 0l3.03-2.3c.4-.3.93.18.66.61Z"
    />
  </Guscio>
);

const Sito = (
  <Guscio titolo="Sito">
    <g style={{ color: 'var(--ciano)' }} {...TRATTO}>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M3.2 12h17.6M12 3.2c2.2 2.4 3.3 5.4 3.3 8.8s-1.1 6.4-3.3 8.8c-2.2-2.4-3.3-5.4-3.3-8.8S9.8 5.6 12 3.2Z" />
    </g>
  </Guscio>
);

const Campagna = (
  <Guscio titolo="Campagna">
    <g style={{ color: '#d96a4a' }} {...TRATTO}>
      <path d="M4 9.6 15 5.2v13.6L4 14.4Z" />
      <path d="M7 15v4.4h3V16" />
      <path d="M18.2 10.4a2.7 2.7 0 0 1 0 3.2" />
    </g>
  </Guscio>
);

const Showroom = (
  <Guscio titolo="Showroom">
    <g style={{ color: 'var(--oro-chiaro)' }} {...TRATTO}>
      <path d="M3.6 8.4 5.2 4h13.6l1.6 4.4" />
      <path d="M3.6 8.4a2.4 2.4 0 0 0 4.2 1.6 2.4 2.4 0 0 0 4.2 0 2.4 2.4 0 0 0 4.2 0 2.4 2.4 0 0 0 4.2-1.6" />
      <path d="M5.2 10.8V20h13.6v-9.2" />
      <path d="M9.6 20v-5.2h4.8V20" />
    </g>
  </Guscio>
);

const CardNfc = (
  <Guscio titolo="Card NFC">
    <g style={{ color: 'var(--oro-chiaro)' }} {...TRATTO}>
      <rect x="2.8" y="5.6" width="12.4" height="12.8" rx="2.4" />
      <path d="M6.4 10.4h2.8M6.4 13.6h4.8" />
      <path d="M18 8.8a4.4 4.4 0 0 1 0 6.4M20.8 6.4a8 8 0 0 1 0 11.2" />
    </g>
  </Guscio>
);

const Passaparola = (
  <Guscio titolo="Passaparola">
    <g style={{ color: 'var(--ink-2)' }} {...TRATTO}>
      <circle cx="9" cy="8.4" r="3" />
      <path d="M3.6 19.2c0-2.9 2.4-4.6 5.4-4.6s5.4 1.7 5.4 4.6" />
      <path d="M16.2 6.6a3 3 0 0 1 0 5.6M18.6 15.2c1.4.7 2.2 1.9 2.2 3.6" />
    </g>
  </Guscio>
);

const Telefono = (
  <Guscio titolo="Telefono">
    <g style={{ color: 'var(--ink-2)' }} {...TRATTO}>
      <path d="M6.2 3.6h3l1.3 3.4-2 1.4a11.5 11.5 0 0 0 5.2 5.2l1.4-2 3.4 1.3v3c0 .9-.7 1.7-1.7 1.7A14.7 14.7 0 0 1 4.5 5.3c0-1 .8-1.7 1.7-1.7Z" />
    </g>
  </Guscio>
);

const Altro = (
  <Guscio titolo="Altro">
    <g style={{ color: 'var(--ink-3)' }} {...TRATTO}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M9.6 9.8a2.5 2.5 0 0 1 4.9.6c0 1.7-2.5 2-2.5 3.4M12 17.2v.3" />
    </g>
  </Guscio>
);

const PER_FONTE: Record<Fonte, React.ReactNode> = {
  instagram: Instagram,
  facebook: Facebook,
  google: Google,
  sito: Sito,
  campagna: Campagna,
  showroom: Showroom,
  card_nfc: CardNfc,
  whatsapp: WhatsApp,
  passaparola: Passaparola,
  altro: Altro,
};

const PER_CANALE: Record<Canale, React.ReactNode> = {
  messenger: Messenger,
  whatsapp: WhatsApp,
  instagram: Instagram,
  email: Gmail,
  telefono: Telefono,
  sito: Sito,
  altro: Altro,
};

export const LogoFonte = ({ id }: { id: Fonte }) => <>{PER_FONTE[id] ?? Altro}</>;
export const LogoCanale = ({ id }: { id: Canale }) => <>{PER_CANALE[id] ?? Altro}</>;
