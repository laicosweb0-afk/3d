/* ============================================================
   MONDIAL SERVICE — script principale
   Stack: Lenis (smooth scroll) + GSAP ScrollTrigger (animazioni)
   Effetto chiave: scroll-scrubbing dei video (il video avanza
   al ritmo dello scroll).
   ============================================================ */

gsap.registerPlugin(ScrollTrigger);

/* ⚙️ CONFIG — le cose che potresti voler ritoccare stanno qui */
const CONFIG = {
  // Numero WhatsApp per il form contatti (formato internazionale senza +)
  whatsappNumber: "391234567890", // ☎️ SOSTITUISCI con il numero reale

  // Fluidità dello scrubbing: 0.08 = molto morbido, 0.2 = più reattivo
  scrubSmoothing: 0.12,

  // Durata smooth scroll Lenis
  lenisDuration: 1.15,
};

const prefersReducedMotion =
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ============================================================
   1. SMOOTH SCROLL (Lenis) — disattivato se reduced-motion
   ============================================================ */
let lenis = null;

if (!prefersReducedMotion) {
  lenis = new Lenis({
    duration: CONFIG.lenisDuration,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  });
  window.lenis = lenis; // utile per debug da console

  // Lenis e ScrollTrigger devono restare sincronizzati
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // I link ancora (#servizi ecc.) usano lo scroll morbido di Lenis
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const target = document.querySelector(a.getAttribute("href"));
      if (target) {
        e.preventDefault();
        lenis.scrollTo(target, { offset: 0 });
      }
    });
  });
}

/* ============================================================
   2. PRELOAD VIDEO
   - Ogni video esiste in due formati: .mp4 (H.264, per Safari/iOS)
     e .webm (VP9, per i browser senza codec H.264).
     Con canPlayType scegliamo quello riproducibile.
   - Scarichiamo il video come blob: currentTime diventa affidabile
     e lo scrubbing non "scatta" in attesa dei chunk di rete.
   ============================================================ */
function pickPlayableSrc(video) {
  let src = video.getAttribute("src");
  if (!video.canPlayType('video/mp4; codecs="avc1.42E01E"') && src.endsWith(".mp4")) {
    src = src.replace(/\.mp4$/, ".webm");
  }
  return src;
}

async function preloadVideo(video) {
  const src = pickPlayableSrc(video);
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    video.src = URL.createObjectURL(blob);
  } catch (e) {
    // Se il fetch fallisce si resta sul download progressivo
    console.warn("Preload video fallito, uso src diretto:", e);
    video.src = src;
  }
  return new Promise((resolve) => {
    if (video.readyState >= 2) return resolve();
    video.addEventListener("loadeddata", () => resolve(), { once: true });
    video.load();
  });
}

/* ============================================================
   3. SCROLL-SCRUBBING DEI CAPITOLI
   Ogni <section data-scrub-chapter> è alta 300vh; il progresso
   dello ScrollTrigger (0..1) diventa il tempo del video.
   Per evitare micro-scatti non impostiamo currentTime a ogni
   evento scroll: un loop requestAnimationFrame insegue il tempo
   target con una interpolazione (lerp).

   📱 NOTA iOS/SAFARI: se sul tuo iPhone lo scrubbing dovesse
   scattare anche con video all-keyframe, il piano B è la
   sequenza di frame (immagini disegnate su <canvas>): si
   esportano i frame del video (es. 80 jpg) e si sostituisce
   il <video> con un canvas. La struttura qui sotto è già
   pronta per aggiungerlo (basta un'altra classe Scrubber).
   ============================================================ */
class VideoScrubber {
  constructor(section) {
    this.section = section;
    this.video = section.querySelector("[data-scrub-video]");
    this.captions = section.querySelectorAll("[data-caption]");
    this.progressBar = section.querySelector("[data-progress-bar]");
    this.targetTime = 0;   // dove "vorrebbe" essere il video
    this.currentTime = 0;  // dove si trova davvero (insegue il target)
    this.ready = false;
    this.init();
  }

  async init() {
    await preloadVideo(this.video);
    this.video.pause();
    this.duration = this.video.duration || 0;
    this.ready = true;

    // ScrollTrigger: mappa il progresso della sezione sul tempo video
    ScrollTrigger.create({
      trigger: this.section,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        this.targetTime = self.progress * this.duration;
        this.updateCaptions(self.progress);
        if (this.progressBar) {
          this.progressBar.style.transform = `scaleX(${self.progress})`;
        }
      },
    });

    // Loop rAF: insegue il tempo target in modo fluido
    const tick = () => {
      if (this.ready && this.duration) {
        const diff = this.targetTime - this.currentTime;
        if (Math.abs(diff) > 0.001) {
          this.currentTime += diff * CONFIG.scrubSmoothing;
          // clamp per sicurezza ai limiti del video
          this.video.currentTime = Math.max(
            0,
            Math.min(this.currentTime, this.duration - 0.01)
          );
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* Testi in dissolvenza sincronizzati con lo scroll.
     Ogni caption ha data-at (0..1): appare lì e resta visibile
     per una finestra di ~0.3, poi svanisce. */
  updateCaptions(progress) {
    this.captions.forEach((cap) => {
      const at = parseFloat(cap.dataset.at || 0);
      const fadeIn = 0.08;  // durata della dissolvenza
      const hold = 0.28;    // quanto resta visibile
      let opacity = 0;
      if (progress >= at && progress <= at + fadeIn) {
        opacity = (progress - at) / fadeIn;
      } else if (progress > at + fadeIn && progress <= at + hold) {
        opacity = 1;
      } else if (progress > at + hold && progress <= at + hold + fadeIn) {
        opacity = 1 - (progress - at - hold) / fadeIn;
      }
      // ultima caption: resta visibile fino a fine capitolo
      if (cap === this.captions[this.captions.length - 1] && progress > at + fadeIn) {
        opacity = Math.max(opacity, progress > at ? 1 : 0);
      }
      cap.style.opacity = opacity;
      cap.style.transform = `translateY(${(1 - opacity) * 24}px)`;
    });
  }
}

/* ============================================================
   4. INTRO / HERO — la porta che si apre
   Il video intro parte da solo (non è scrubbato); a fine video
   compare la headline. "Salta intro" porta subito alla fine.
   ============================================================ */
function initHero() {
  const video = document.getElementById("intro-video");
  const content = document.getElementById("hero-content");
  const skip = document.getElementById("skip-intro");
  const hint = document.getElementById("scroll-hint");

  // Anche l'intro sceglie mp4 o webm in base ai codec disponibili
  const playable = pickPlayableSrc(video);
  if (playable !== video.getAttribute("src")) video.src = playable;

  const showContent = () => {
    // velo più forte sul video: garantisce contrasto al titolo
    document.getElementById("hero").classList.add("is-revealed");
    gsap.to(content, { opacity: 1, y: 0, duration: 1, ease: "power2.out" });
    gsap.to(hint, { opacity: 1, duration: 0.8, delay: 0.6 });
    skip.style.display = "none";
  };

  if (prefersReducedMotion) {
    // Versione statica: niente video, contenuto subito visibile
    video.pause();
    showContent();
    return;
  }

  video.play().catch(() => showContent()); // se l'autoplay è bloccato, mostra subito
  video.addEventListener("ended", showContent, { once: true });

  // "Salta intro": ferma il video sull'ultimo frame e mostra i testi
  skip.addEventListener("click", () => {
    video.currentTime = Math.max(0, (video.duration || 0) - 0.05);
    video.pause();
    showContent();
  });
}

/* ============================================================
   5. REVEAL — comparsa dolce di card / portfolio / recensioni
   ============================================================ */
function initReveals() {
  if (prefersReducedMotion) return;
  gsap.utils.toArray("[data-reveal]").forEach((el, i) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: "power2.out",
      delay: (i % 3) * 0.1, // leggera cascata sulle griglie
      scrollTrigger: { trigger: el, start: "top 85%" },
    });
  });
}

/* ============================================================
   6. FORM CONTATTI → WHATSAPP PRECOMPILATO
   Nessun backend: il submit apre wa.me con il messaggio pronto.
   ============================================================ */
function initWhatsAppForm() {
  const form = document.getElementById("whatsapp-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    // ✏️ Testo del messaggio precompilato: ritoccalo pure qui
    const msg =
      `Ciao Mondial Service! Sono ${data.get("nome")}.\n` +
      `Lavoro: ${data.get("tipo")}.\n` +
      `${data.get("messaggio") || ""}\n` +
      `Vorrei prenotare un sopralluogo.`;
    const url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener");
  });
}

/* ============================================================
   7. VARIE — burger mobile, anno footer
   ============================================================ */
function initMisc() {
  const nav = document.getElementById("nav");
  document.getElementById("burger").addEventListener("click", () => {
    nav.classList.toggle("is-open");
  });
  // chiudi il menu quando si sceglie una voce
  nav.querySelectorAll(".nav__links a").forEach((a) =>
    a.addEventListener("click", () => nav.classList.remove("is-open"))
  );
  document.getElementById("anno").textContent = new Date().getFullYear();
}

/* ============================================================
   AVVIO
   ============================================================ */
initHero();
initReveals();
initWhatsAppForm();
initMisc();

if (!prefersReducedMotion) {
  // Un VideoScrubber per ogni capitolo con data-scrub-chapter
  document
    .querySelectorAll("[data-scrub-chapter]")
    .forEach((section) => new VideoScrubber(section));
} else {
  // Reduced motion: mostra direttamente il risultato finito
  document.querySelectorAll("[data-scrub-video]").forEach((v) => {
    v.addEventListener("loadedmetadata", () => {
      v.currentTime = Math.max(0, v.duration - 0.05);
    });
  });
}
