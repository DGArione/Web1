/* Rapid Solutions — main.js
   Lenis smooth scroll + GSAP/ScrollTrigger typographic reveals.
   Everything degrades gracefully: if libraries or JS fail, the
   content is fully visible and the page still works. */

(function () {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGSAP = typeof window.gsap !== "undefined";
  const hasLenis = typeof window.Lenis !== "undefined";

  /* ---------- Footer year + live clock ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const clockEl = document.getElementById("clock");
  if (clockEl) {
    const tick = () => {
      const d = new Date();
      const p = (n) => String(n).padStart(2, "0");
      clockEl.textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} LOCAL`;
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- Lenis smooth scroll ---------- */
  let lenis = null;
  if (hasLenis && !reduce) {
    lenis = new Lenis({
      lerp: 0.09,
      wheelMultiplier: 1,
      smoothWheel: true,
    });
    if (hasGSAP && window.ScrollTrigger) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  /* ---------- Anchor links routed through Lenis ---------- */
  document.querySelectorAll("[data-scroll]").forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (!id || id.charAt(0) !== "#") return;
      const target = id === "#top" ? 0 : document.querySelector(id);
      if (target === null) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.2 });
      else (typeof target === "number" ? window : target).scrollTo
        ? window.scrollTo({ top: 0, behavior: "smooth" })
        : target.scrollIntoView({ behavior: "smooth" });
    });
  });

  /* If motion is reduced or GSAP is missing, stop here — CSS shows all. */
  if (reduce || !hasGSAP) return;
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Helper: wrap words in masked spans ---------- */
  function splitWords(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    return words.map((w, i) => {
      const outer = document.createElement("span");
      outer.className = "w";
      outer.style.display = "inline-block";
      outer.style.overflow = "hidden";
      outer.style.verticalAlign = "top";
      const inner = document.createElement("span");
      inner.className = "w-in";
      inner.style.display = "inline-block";
      inner.style.willChange = "transform";
      inner.textContent = w;
      outer.appendChild(inner);
      el.appendChild(outer);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
      return inner;
    });
  }

  /* ---------- Hero: line-by-line mask reveal ---------- */
  const heroTitle = document.getElementById("heroTitle");
  if (heroTitle) {
    const lines = heroTitle.querySelectorAll(".line");
    gsap.set(lines, { yPercent: 115 });
    gsap.to(lines, {
      yPercent: 0,
      duration: 1.15,
      ease: "power4.out",
      stagger: 0.12,
      delay: 0.15,
    });
  }

  /* ---------- Fade-in meta + notes ---------- */
  gsap.set("[data-fade]", { opacity: 0, y: 14 });
  gsap.to("[data-fade]", { opacity: 1, y: 0, duration: 0.9, ease: "power2.out", stagger: 0.08, delay: 0.5 });

  /* ---------- Statement: word-by-word ink fill on scroll ---------- */
  const statement = document.getElementById("statementCopy");
  if (statement) {
    const words = statement.textContent.trim().split(/\s+/);
    statement.innerHTML = words
      .map((w) => `<span class="word">${w}</span>`)
      .join(" ");
    gsap.to(statement.querySelectorAll(".word"), {
      color: "var(--ink)",
      stagger: 0.5,
      ease: "none",
      scrollTrigger: {
        trigger: statement,
        start: "top 78%",
        end: "bottom 58%",
        scrub: true,
      },
    });
    gsap.set(statement.querySelectorAll(".word"), { color: "var(--faint)" });
  }

  /* ---------- Generic reveal on scroll ---------- */
  gsap.utils.toArray("[data-reveal]").forEach((el) => {
    gsap.from(el, {
      y: 40,
      opacity: 0,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 85%" },
    });
  });

  /* ---------- Footer wordmark mask reveal ---------- */
  const wm = document.querySelector(".wm-line");
  if (wm) {
    gsap.set(wm, { yPercent: 108 });
    gsap.to(wm, {
      yPercent: 0,
      duration: 1.3,
      ease: "power4.out",
      scrollTrigger: { trigger: ".footer-wordmark", start: "top 92%" },
    });
  }

  /* Recalculate once fonts settle so triggers line up. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
