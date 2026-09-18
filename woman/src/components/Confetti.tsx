import { useEffect, useRef } from 'react';

type Pezzo = { x: number; y: number; vx: number; vy: number; r: number; w: number; h: number; c: string };

/**
 * Coriandoli su canvas: due secondi, magenta e nero, pochi e sottili. Niente
 * libreria e niente nodi nel DOM, così non pesano sul resto della scena.
 */
export function Confetti({ attivi }: { attivi: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!attivi) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const L = canvas.clientWidth, H = canvas.clientHeight;
    canvas.width = L * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const tinte = ['#F4B9CE', '#D5799A', '#BD3A66', '#1A171C'];
    const pezzi: Pezzo[] = Array.from({ length: 46 }, () => ({
      x: L / 2 + (Math.random() - 0.5) * L * 0.5,
      y: H * 0.34 + (Math.random() - 0.5) * 30,
      vx: (Math.random() - 0.5) * 4.6,
      vy: -3.4 - Math.random() * 3.6,
      r: Math.random() * Math.PI,
      w: 3 + Math.random() * 3,
      h: 6 + Math.random() * 5,
      c: tinte[Math.floor(Math.random() * tinte.length)],
    }));

    const t0 = performance.now();
    let vivo = true;
    const disegna = (ora: number) => {
      if (!vivo) return;
      const t = (ora - t0) / 2000;
      ctx.clearRect(0, 0, L, H);
      if (t >= 1) return;
      const dissolve = t > 0.72 ? 1 - (t - 0.72) / 0.28 : 1;
      for (const p of pezzi) {
        p.vy += 0.116;          // gravità
        p.vx *= 0.995;          // attrito dell'aria
        p.x += p.vx; p.y += p.vy; p.r += 0.085;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.globalAlpha = dissolve;
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      requestAnimationFrame(disegna);
    };
    requestAnimationFrame(disegna);
    return () => { vivo = false; };
  }, [attivi]);

  return (
    <canvas ref={ref} aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full" />
  );
}
