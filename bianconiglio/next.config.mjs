/** @type {import('next').NextConfig} */

// Due modi di costruire lo stesso progetto:
//
// - normale (`npm run build`): server con API routes — le chiavi restano sul
//   server, la password la controlla il middleware. È la versione «vera», per
//   quando ci saranno le chiavi.
// - prototipo (`npm run prototipo`): solo file statici, nessun server, nessuna
//   chiave, nessun costo a visita. Cervello a repertorio e voci registrate.
//   Lo script che lo costruisce mette da parte middleware e API prima di
//   compilare, perché l'export statico non li ammette.
const prototipo = process.env.PROTOTIPO === '1';

const nextConfig = {
  reactStrictMode: true,

  ...(prototipo
    ? {
        // Cartella `out/` autonoma: si apre da qualsiasi hosting statico.
        output: 'export',
      }
    : {
        // La demo è un link privato: non deve finire nei motori di ricerca.
        // L'header vale per ogni percorso, API comprese. (Nell'export statico
        // gli header non esistono: lì resta il noindex nei metadati.)
        async headers() {
          return [
            {
              source: '/:path*',
              headers: [
                {
                  key: 'X-Robots-Tag',
                  value: 'noindex, nofollow, noarchive, nosnippet',
                },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;
