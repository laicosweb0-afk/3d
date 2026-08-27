'use client';

// Il gioco vive solo nel browser (WebGL): niente SSR.
import dynamic from 'next/dynamic';

const LugoApp = dynamic(() => import('@/components/lugo/LugoApp').then((m) => m.LugoApp), {
  ssr: false,
  loading: () => <div className="lugo-caricamento">Sto costruendo Lugo…</div>,
});

export default function PaginaLugo() {
  return <LugoApp />;
}
