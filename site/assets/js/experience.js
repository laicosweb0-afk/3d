/* MONDIAL SERVICE — controller dell'esperienza
   Scroll → tempo video: ogni capitolo "scrub" blocca la scena e
   fa avanzare il time-lapse (grezzo → finito) con lo scorrimento. */

(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var chapters = Array.prototype.slice.call(document.querySelectorAll(".chapter.scrub"));
  var dots = Array.prototype.slice.call(document.querySelectorAll(".dots button"));
  var allSections = Array.prototype.slice.call(document.querySelectorAll(".chapter"));

  /* ---------- geometria: altezza dei capitoli scrub ---------- */

  function layout() {
    var vh = window.innerHeight;
    chapters.forEach(function (ch) {
      var mult = reduced ? 1 : (parseFloat(ch.getAttribute("data-scrub")) || 2);
      ch.style.height = Math.round(vh * mult) + "px";
    });
  }

  var lastW = window.innerWidth;
  window.addEventListener("resize", function () {
    /* su mobile ignora i resize di sola altezza causati dalla barra URL */
    if (Math.abs(window.innerWidth - lastW) < 2) return;
    lastW = window.innerWidth;
    layout();
  });
  layout();

  /* ---------- stato per capitolo ---------- */

  var states = chapters.map(function (ch) {
    var video = ch.querySelector("video");
    var poster = ch.getAttribute("data-poster");
    var media = ch.querySelector(".media");
    if (poster && media) media.style.backgroundImage = "url('" + poster + "')";
    return {
      el: ch,
      video: video,
      src: ch.getAttribute("data-src"),
      meter: ch.querySelector(".build-meter b"),
      loaded: false,
      failed: false,
      ready: false,
      playFallback: false,
      played: false,
      pendingTime: -1,
      blobUrl: null
    };
  });

  if (reduced) {
    /* niente fetch/decodifica video: restano poster e contenuto completo */
    activateDots();
    return;
  }

  /* ---------- caricamento pigro (solo capitoli vicini) ---------- */

  function loadState(st) {
    if (st.loaded || st.failed) return;
    st.loaded = true;

    /* prova Blob (seek affidabile); se il CDN non espone CORS, src diretto */
    fetch(st.src, { mode: "cors" })
      .then(function (r) {
        if (!r.ok) throw new Error("http " + r.status);
        return r.blob();
      })
      .then(function (b) {
        st.blobUrl = URL.createObjectURL(b);
        attach(st, st.blobUrl);
      })
      .catch(function () {
        attach(st, st.src); /* il seek su CloudFront funziona via byte-range */
      });
  }

  function attach(st, url) {
    var v = st.video;
    v.preload = "auto";
    v.src = url;

    var t = setTimeout(function () {
      /* metadati mai arrivati: resta il poster */
      if (!st.ready) st.failed = true;
    }, 20000);

    v.addEventListener("loadedmetadata", function () {
      clearTimeout(t);
      st.ready = true;
    });
    v.addEventListener("error", function () {
      clearTimeout(t);
      if (st.blobUrl && v.src === st.blobUrl) {
        /* il blob non decodifica: ultimo tentativo con l'URL remoto */
        URL.revokeObjectURL(st.blobUrl);
        st.blobUrl = null;
        attach(st, st.src);
      } else {
        st.failed = true;
      }
    });
    v.addEventListener("seeked", function () {
      if (st.pendingTime >= 0) {
        var tt = st.pendingTime;
        st.pendingTime = -1;
        v.currentTime = tt;
      }
    });
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var st = states.filter(function (s) { return s.el === e.target; })[0];
      if (st) loadState(st);
    });
  }, { rootMargin: "120% 0px" });

  chapters.forEach(function (ch) { io.observe(ch); });

  /* ---------- priming iOS: primo gesto → play/pause muto ---------- */

  var primed = false;
  function prime() {
    if (primed) return;
    primed = true;
    states.forEach(function (st) {
      var p = st.video.play();
      if (p && p.then) {
        p.then(function () { st.video.pause(); })
         .catch(function () { st.playFallback = true; });
      }
    });
    window.removeEventListener("touchstart", prime);
    window.removeEventListener("pointerdown", prime);
  }
  window.addEventListener("touchstart", prime, { passive: true });
  window.addEventListener("pointerdown", prime, { passive: true });

  /* ---------- loop di scrub ---------- */

  function progressOf(ch) {
    var rect = ch.getBoundingClientRect();
    var travel = rect.height - window.innerHeight;
    if (travel <= 0) return rect.top < 0 ? 1 : 0;
    return Math.min(1, Math.max(0, -rect.top / travel));
  }

  function tick() {
    states.forEach(function (st) {
      var rect = st.el.getBoundingClientRect();
      var visible = rect.bottom > 0 && rect.top < window.innerHeight;
      if (!visible) return;

      var p = progressOf(st.el);
      if (st.meter) st.meter.style.width = (p * 100).toFixed(1) + "%";
      if (!st.ready || st.failed) return;

      var v = st.video;
      var dur = v.duration;
      if (!dur || !isFinite(dur)) return;

      if (st.playFallback) {
        /* fallback: riproduzione singola quando il capitolo è in scena */
        if (!st.played && p > 0.05) {
          st.played = true;
          v.play().catch(function () {});
        }
        return;
      }

      var target = Math.min(dur - 0.05, p * dur);
      if (Math.abs((v.currentTime || 0) - target) < 0.033) return;
      if (v.seeking) {
        st.pendingTime = target;
      } else {
        try { v.currentTime = target; }
        catch (err) { st.playFallback = true; }
      }
    });
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* ---------- navigazione a punti ---------- */

  function activateDots() {
    if (!dots.length) return;
    dots.forEach(function (d) {
      d.addEventListener("click", function () {
        var target = document.getElementById(d.getAttribute("data-target"));
        if (target) target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      });
    });
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = e.target.id;
        dots.forEach(function (d) {
          d.classList.toggle("on", d.getAttribute("data-target") === id);
        });
      });
    }, { rootMargin: "-45% 0px -45% 0px" });
    allSections.forEach(function (s) { obs.observe(s); });
  }
  activateDots();
})();
