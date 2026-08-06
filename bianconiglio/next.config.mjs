/** @type {import('next').NextConfig} */

// Questo progetto NON è un export statico, a differenza del sito nella cartella
// superiore: la demo ha bisogno di API routes server-side, perché le chiavi di
// Claude e ElevenLabs non devono mai raggiungere il browser.
const nextConfig = {
  reactStrictMode: true,

  // La demo è un link privato per il titolare: non deve finire nei motori di
  // ricerca. L'header vale per ogni percorso, comprese le API — così anche un
  // eventuale link copiato e incollato resta fuori dagli indici.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' },
        ],
      },
    ];
  },
};

export default nextConfig;
