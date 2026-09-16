/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Se impostata, i contatti vengono spediti in POST JSON a questo indirizzo. */
  readonly VITE_LEAD_WEBHOOK_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
