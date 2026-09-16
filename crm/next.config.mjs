import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

/** @type {import('next').NextConfig} */

// Il CRM è un'app con server (login, database, invio email): niente
// output:'export' qui — quello vale per il sito nella radice del repo, che è
// statico. Questa cartella viene pubblicata da un progetto Vercel a sé, con
// Root Directory = `crm` (vedi CRM-RAMA.md).
const nextConfig = {
  reactStrictMode: true,
  // Il repo ha due package-lock (la radice e questo): senza questa riga Next
  // prende la radice per workspace e avvisa a ogni build.
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
};

export default nextConfig;
