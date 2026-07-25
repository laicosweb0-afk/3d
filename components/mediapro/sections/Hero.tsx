'use client';

import { useEffect, useRef } from 'react';
import { gsap } from '../gsap';
import { HERO } from '../content';

// Posizioni fisse delle particelle (niente Math.random: l'HTML del server
// e quello del client devono coincidere).
const DUST = [
  { left: '12%', top: '22%', delay: '-1s', scale: 1 },
  { left: '26%', top: '68%', delay: '-4s', scale: 0.7 },
  { left: '44%', top: '12%', delay: '-2.5s', scale: 0.8 },
  { left: '58%', top: '80%', delay: '-6s', scale: 1.2 },
  { left: '72%', top: '30%', delay: '-3s', scale: 0.6 },
  { left: '84%', top: '58%', delay: '-5s', scale: 1 },
  { left: '90%', top: '18%', delay: '-7s', scale: 0.7 },
  { left: '8%', top: '84%', delay: '-2s', scale: 0.9 },
];

export function Hero({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const monolithRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const flareRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const bridgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;
    const section = sectionRef.current!;
    const pin = pinRef.current!;
    const monolith = monolithRef.current!;

    const ctx = gsap.context(() => {
      // --- ingresso: le righe del titolo salgono, il monolite si accende ---
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from('.mp-hero-line > span', {
          yPercent: 110,
          duration: 1.4,
          stagger: 0.12,
          delay: 0.15,
        })
        .from(
          ['.mp-hero-kicker', '.mp-hero-sub', '.mp-hero-cta'],
          { opacity: 0, y: 24, duration: 1.1, stagger: 0.1 },
          '<0.3'
        )
        .from(
          stageRef.current,
          { opacity: 0, scale: 0.92, y: 40, duration: 1.8, ease: 'power2.out' },
          0.1
        );

      // --- la camera: sequenza pinnata guidata dallo scroll ---
      gsap
        .timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1.1,
          },
          defaults: { ease: 'none' },
        })
        // il testo esce di scena per primo
        .to(copyRef.current, { yPercent: -30, autoAlpha: 0, duration: 0.3 }, 0)
        .to('.mp-hero-scroll', { autoAlpha: 0, duration: 0.12 }, 0)
        // la camera avanza dentro il monolite
        .to(
          stageRef.current,
          { scale: 1.6, y: '-6vh', rotation: -3, duration: 0.75 },
          0.05
        )
        .to(monolith, { rotationY: -16, rotationX: 6, duration: 0.75 }, 0.05)
        // la luce cambia: l'ambiente si scurisce, resta il bagliore
        .to('.mp-hero-bg', { opacity: 0.35, duration: 0.5 }, 0.3)
        // il momento di luce: mentre la camera entra, l'oggetto si accende.
        // Senza questo, a metà sequenza si vede solo buio su buio.
        .fromTo(
          flareRef.current,
          { autoAlpha: 0, scale: 0.3 },
          { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'power2.in' },
          0.45
        )
        // l'oggetto si dissolve nella luce prima che arrivi il testo,
        // così non si sovrappongono
        .to(stageRef.current, { autoAlpha: 0, scale: 1.85, duration: 0.16 }, 0.62)
        // il bagliore non si spegne del tutto: resta acceso mentre l'hero
        // esce di scena, così il passaggio al portfolio non è mai buio pieno
        .to(
          flareRef.current,
          { autoAlpha: 0.4, scale: 2.4, duration: 0.24, ease: 'power2.out' },
          0.76
        )
        // dalla luce nasce la battuta di raccordo…
        .fromTo(
          bridgeRef.current,
          { autoAlpha: 0, scale: 0.94, y: 40 },
          { autoAlpha: 1, scale: 1, y: 0, duration: 0.12, ease: 'power2.out' },
          0.78
        )
        // …e se ne va prima che l'hero si sganci, per non finire sotto la nav
        .to(bridgeRef.current, { autoAlpha: 0, y: -34, duration: 0.05 }, 0.95);

      // --- il mouse: riflessi e micro-rotazioni, sempre morbidi ---
      const rx = gsap.quickTo(monolith, 'rotationX', { duration: 0.9, ease: 'power3.out' });
      const ry = gsap.quickTo(monolith, 'rotationY', { duration: 0.9, ease: 'power3.out' });
      const gx = gsap.quickTo(glowRef.current, 'x', { duration: 1.4, ease: 'power3.out' });
      const gy = gsap.quickTo(glowRef.current, 'y', { duration: 1.4, ease: 'power3.out' });

      const onMove = (e: PointerEvent) => {
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = (e.clientY / window.innerHeight) * 2 - 1;
        ry(nx * 7);
        rx(ny * -5);
        gx(nx * window.innerWidth * 0.28);
        gy(ny * window.innerHeight * 0.28);
        monolith.style.setProperty('--hx', `${50 + nx * 35}%`);
        monolith.style.setProperty('--hy', `${28 + ny * 30}%`);
      };
      pin.addEventListener('pointermove', onMove);
      return () => pin.removeEventListener('pointermove', onMove);
    }, section);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={sectionRef} className="mp-hero" id="hero">
      <div ref={pinRef} className="mp-hero-pin">
        <div className="mp-hero-bg" />
        <div ref={glowRef} className="mp-hero-glow" />
        <div className="mp-hero-dust" aria-hidden>
          {DUST.map((d, i) => (
            <span
              key={i}
              className="mp-dust"
              style={{
                left: d.left,
                top: d.top,
                animationDelay: d.delay,
                transform: `scale(${d.scale})`,
              }}
            />
          ))}
        </div>

        <div ref={flareRef} className="mp-hero-flare" aria-hidden />

        <div ref={stageRef} className="mp-hero-stage">
          <div ref={monolithRef} className="mp-monolith">
            <span className="mp-monolith-logo">
              MediaPro<em>.</em>
            </span>
            <div className="mp-podium" />
          </div>
          <div className="mp-orb mp-orb--a" aria-hidden />
          <div className="mp-orb mp-orb--b" aria-hidden />
        </div>

        <div ref={copyRef} className="mp-hero-copy">
          <p className="mp-hero-kicker">{HERO.kicker}</p>
          <h1 className="mp-hero-title">
            {HERO.lines.map((line) => (
              <span
                key={line.text}
                className={`mp-hero-line${line.accent ? ' mp-hero-line--accent' : ''}`}
              >
                <span>{line.text}</span>
              </span>
            ))}
          </h1>
          <p className="mp-hero-sub">{HERO.sub}</p>
          <div className="mp-hero-cta">
            <a className="mp-btn" href="#portfolio">
              {HERO.cta} <span className="mp-btn-arrow">→</span>
            </a>
          </div>
        </div>

        <div className="mp-hero-scroll">Scroll</div>

        {/* Non è un titolo di sezione: è la battuta che porta dentro al
            portfolio, così non si legge due volte la stessa intestazione. */}
        <div ref={bridgeRef} className="mp-hero-bridge" aria-hidden>
          <p>Adesso, il lavoro.</p>
        </div>
      </div>
    </section>
  );
}
