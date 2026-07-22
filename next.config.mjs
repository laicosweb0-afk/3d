/** @type {import('next').NextConfig} */

// Prefisso base: vuoto in produzione (dominio alla radice), "/3d" per
// l'anteprima gratuita in sottocartella (…github.io/3d/). Deve combaciare
// con l'helper lib/asset.ts, che usa lo stesso NEXT_PUBLIC_BASE_PATH.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  reactStrictMode: true,
  // Export statico: produce una cartella `out/` autonoma, deployabile su
  // qualsiasi host (il dominio del cliente, Vercel, Netlify, un CDN…).
  output: 'export',
  // Necessario con output:'export' — le <img> sono già ottimizzate a monte.
  images: { unoptimized: true },
  // URL con trailing slash → cartelle con index.html, robusto su ogni host.
  trailingSlash: true,
  // Serve gli asset di Next (_next/…) dal sottopercorso corretto.
  basePath,
  assetPrefix: basePath || undefined,
};

export default nextConfig;
