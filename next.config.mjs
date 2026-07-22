/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Export statico: produce una cartella `out/` autonoma, deployabile su
  // qualsiasi host (il dominio del cliente, Vercel, Netlify, un CDN…).
  output: 'export',
  // Necessario con output:'export' — le <img> sono già ottimizzate a monte.
  images: { unoptimized: true },
  // URL con trailing slash → cartelle con index.html, robusto su ogni host.
  trailingSlash: true,
};

export default nextConfig;
