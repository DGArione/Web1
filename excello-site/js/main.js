/* ==========================================================================
   EXCELLO — motion system
   GSAP 3 + ScrollTrigger + SplitText, Lenis smooth scroll.
   Every effect is opt-in through data-attributes / classes so pages stay
   plain HTML. See README.md for the list.
   ========================================================================== */
(function () {
  "use strict";

  gsap.registerPlugin(ScrollTrigger, SplitText);

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var body = document.body;

  /* After a masked line reveal finishes, stop clipping so glyph descenders
     and italic overhangs are never cut off. */
  function unclip(el) {
    el.style.overflow = "visible";
    el.querySelectorAll("*").forEach(function (m) { m.style.overflow = "visible"; });
  }

  /* ---------------------------------------------------------------------
     Image fallback: if an Unsplash placeholder fails, swap to picsum.
     --------------------------------------------------------------------- */
  document.addEventListener(
    "error",
    function (e) {
      var el = e.target;
      if (!el || el.tagName !== "IMG" || el.dataset.fb) return;
      el.dataset.fb = "1";
      var seed = (el.alt || el.src).replace(/\W+/g, "").slice(0, 24) || "excello";
      el.src = "https://picsum.photos/seed/" + seed + "/1600/1100";
    },
    true
  );

  /* ---------------------------------------------------------------------
     Smooth scroll (Lenis) wired into GSAP's ticker
     --------------------------------------------------------------------- */
  var lenis = null;
  if (!reduce) {
    lenis = new Lenis({
      lerp: 0.06,
      duration: 1.25,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      syncTouch: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6
    });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------------------------------------------------------------------
     Custom cursor + magnetic elements
     --------------------------------------------------------------------- */
  var cursor = document.getElementById("cursor");
  if (finePointer && cursor && !reduce) {
    body.classList.add("no-cursor");
    var cx = gsap.quickTo(cursor, "x", { duration: 0.35, ease: "power3" });
    var cy = gsap.quickTo(cursor, "y", { duration: 0.35, ease: "power3" });
    window.addEventListener("mousemove", function (e) { cx(e.clientX); cy(e.clientY); });

    document.addEventListener("mouseover", function (e) {
      var t = e.target.closest("[data-cursor], a, button, .service");
      if (!t) return;
      if (t.dataset.cursor === "view") cursor.classList.add("is-view");
      else cursor.classList.add("is-link");
    });
    document.addEventListener("mouseout", function (e) {
      var t = e.target.closest("[data-cursor], a, button, .service");
      if (!t) return;
      cursor.classList.remove("is-view", "is-link");
    });

    document.querySelectorAll("[data-magnetic]").forEach(function (el) {
      var mx = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3" });
      var my = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3" });
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        mx((e.clientX - (r.left + r.width / 2)) * 0.35);
        my((e.clientY - (r.top + r.height / 2)) * 0.35);
      });
      el.addEventListener("mouseleave", function () { mx(0); my(0); });
    });
  }

  /* ---------------------------------------------------------------------
     Header: compact + hide on scroll down, show on scroll up
     --------------------------------------------------------------------- */
  var header = document.getElementById("header");
  function setHeader() { /* header now stays visible; kept for callers */ }
  ScrollTrigger.create({
    start: 40,
    onUpdate: function (self) {
      var s = self.scroll();
      header.classList.toggle("is-compact", s > 60);
      header.classList.toggle("is-solid", s > 60);
    }
  });

  /* ---------------------------------------------------------------------
     Fullscreen menu
     --------------------------------------------------------------------- */
  var menu = document.getElementById("menu");
  var burger = document.getElementById("burger");
  var menuOpen = false;
  var menuTl = gsap.timeline({ paused: true });
  menuTl
    .to(menu, { clipPath: "inset(0 0 0% 0)", duration: 0.9, ease: "power4.inOut" })
    .to(menu.querySelectorAll(".menu__link > span"), { y: 0, duration: 0.9, stagger: 0.06, ease: "power4.out" }, "-=0.4")
    .from(menu.querySelector(".menu__foot"), { opacity: 0, y: 10, duration: 0.6 }, "-=0.6");

  function toggleMenu(force) {
    menuOpen = typeof force === "boolean" ? force : !menuOpen;
    burger.classList.toggle("is-open", menuOpen);
    burger.setAttribute("aria-expanded", menuOpen);
    menu.classList.toggle("is-open", menuOpen);
    menu.setAttribute("aria-hidden", !menuOpen);
    setHeader(false);
    if (menuOpen) { menuTl.timeScale(1).play(); if (lenis) lenis.stop(); }
    else { menuTl.timeScale(1.6).reverse(); if (lenis) lenis.start(); }
  }
  burger.addEventListener("click", function () { toggleMenu(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && menuOpen) toggleMenu(false); });

  /* ---------------------------------------------------------------------
     Page transition (fade curtain between internal pages)
     --------------------------------------------------------------------- */
  var curtain = document.createElement("div");
  curtain.style.cssText = "position:fixed;inset:0;background:#1d1e1a;z-index:950;pointer-events:none;transform:translateY(101%)";
  body.appendChild(curtain);
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[href]");
    if (!a || reduce) return;
    var href = a.getAttribute("href");
    if (!href || /^(#|mailto:|tel:|https?:)/.test(href) || a.target === "_blank") return;
    e.preventDefault();
    if (menuOpen) toggleMenu(false);
    curtain.style.pointerEvents = "auto";
    gsap.to(curtain, { y: 0, duration: 0.7, ease: "power4.inOut", onComplete: function () { location.href = href; } });
  });
  window.addEventListener("pageshow", function (e) { if (e.persisted) gsap.set(curtain, { y: "101%" }); });

  /* ---------------------------------------------------------------------
     Reveal system (runs after fonts are ready so SplitText measures right)
     --------------------------------------------------------------------- */
  function initReveals() {
    /* Headline reveals — hero stays on masked lines (unchanged); every other
       heading gets a character cascade inside masked lines. */
    document.querySelectorAll("[data-split]").forEach(function (el) {
      var type = el.dataset.split || "lines";
      if (type === "words-scrub") return; /* handled by manifesto block */
      var isHero = el.closest(".hero") !== null;
      if (isHero) {
        var hs = new SplitText(el, { type: "lines", mask: "lines", linesClass: "split-line" });
        gsap.set(hs.lines, { yPercent: 140 });
        el._heroLines = hs.lines;
        return;
      }
      var split = new SplitText(el, { type: "lines,chars", mask: "lines", linesClass: "split-line" });
      gsap.set(split.chars, { yPercent: 140 });
      gsap.to(split.chars, {
        yPercent: 0,
        duration: 0.9,
        stagger: 0.014,
        ease: "power4.out",
        scrollTrigger: { trigger: el, start: "top 86%", once: true },
        onComplete: function () { unclip(el); }
      });
    });

    /* Manifesto: words brighten as you scroll through */
    document.querySelectorAll('[data-split="words-scrub"]').forEach(function (el) {
      var split = new SplitText(el, { type: "words", wordsClass: "word" });
      gsap.to(split.words, {
        opacity: 1,
        stagger: 0.05,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top 75%", end: "bottom 45%", scrub: 0.6 }
      });
    });

    /* Generic fade-up */
    ScrollTrigger.batch("[data-reveal]", {
      start: "top 90%",
      once: true,
      onEnter: function (els) {
        gsap.to(els, { opacity: 1, y: 0, duration: 1.1, ease: "power3.out", stagger: 0.1, overwrite: true });
      }
    });

    /* Parallax images */
    document.querySelectorAll(".media--parallax").forEach(function (wrap) {
      var img = wrap.querySelector("img");
      if (!img) return;
      var amount = parseFloat(wrap.dataset.parallax || 10);
      gsap.fromTo(img, { yPercent: -amount }, {
        yPercent: amount,
        ease: "none",
        scrollTrigger: { trigger: wrap, start: "top bottom", end: "bottom top", scrub: true }
      });
    });

    /* Image reveal — a cover panel wipes upward while the image settles from a
       slow zoom. Applied to every content image (skips hero/sequences/sky). */
    document.querySelectorAll("main .media").forEach(function (wrap) {
      if (wrap.closest(".hero, [data-seq-scene], .sky, .service-float")) return;
      var img = wrap.querySelector("img"); if (!img) return;
      wrap.style.clipPath = "none";
      var cover = document.createElement("span");
      cover.className = "media__cover";
      wrap.appendChild(cover);
      var horiz = wrap.closest(".hscroll") !== null;
      gsap.set(img, { scale: 1.22 });
      var tl = gsap.timeline({ scrollTrigger: { trigger: horiz ? wrap.closest(".hscroll") : wrap, start: horiz ? "top 80%" : "top 84%", once: true } });
      tl.to(cover, { scaleY: 0, duration: 1.15, ease: "power4.inOut" }, 0)
        .to(img, { scale: 1, duration: 1.7, ease: "power3.out" }, 0.08);
    });

    /* Counters */
    document.querySelectorAll("[data-count]").forEach(function (el) {
      var target = parseFloat(el.dataset.count);
      var obj = { v: 0 };
      gsap.to(obj, {
        v: target,
        duration: 2,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
        onUpdate: function () { el.textContent = Math.round(obj.v).toLocaleString(); }
      });
    });

    /* Dark / light section theming */
    document.querySelectorAll("[data-theme]").forEach(function (sec) {
      var dark = sec.dataset.theme === "dark";
      ScrollTrigger.create({
        trigger: sec,
        start: "top 55%",
        end: "bottom 55%",
        onEnter: function () { body.classList.toggle("is-dark", dark); },
        onEnterBack: function () { body.classList.toggle("is-dark", dark); },
        onLeave: function () { body.classList.remove("is-dark"); },
        onLeaveBack: function () { body.classList.remove("is-dark"); }
      });
    });

    /* Marquee */
    document.querySelectorAll(".marquee").forEach(function (m) {
      var track = m.querySelector(".marquee__track");
      track.innerHTML += track.innerHTML;
      var tween = gsap.to(track, { xPercent: -50, ease: "none", duration: 28, repeat: -1 });
      ScrollTrigger.create({
        onUpdate: function (self) {
          var v = Math.abs(self.getVelocity()) / 400;
          gsap.to(tween, { timeScale: 1 + Math.min(v, 4), duration: 0.4, overwrite: true, onComplete: function () { gsap.to(tween, { timeScale: 1, duration: 1.2 }); } });
        }
      });
    });

    /* Horizontal scroll gallery (desktop) */
    var mm = gsap.matchMedia();
    mm.add("(min-width: 901px)", function () {
      document.querySelectorAll(".hscroll").forEach(function (sec) {
        var track = sec.querySelector(".hscroll__track");
        var bar = sec.querySelector(".hscroll__progress i");
        var dist = function () { return track.scrollWidth - window.innerWidth; };
        var scroll = gsap.to(track, {
          x: function () { return -dist(); },
          ease: "none",
          scrollTrigger: {
            trigger: sec,
            pin: true,
            scrub: 0.8,
            start: "top top",
            end: function () { return "+=" + dist(); },
            invalidateOnRefresh: true,
            onUpdate: function (self) { if (bar) gsap.set(bar, { scaleX: self.progress }); }
          }
        });
        /* Inner image parallax while the track moves */
        sec.querySelectorAll(".panel .media img").forEach(function (img) {
          gsap.fromTo(img, { xPercent: -8 }, {
            xPercent: 8,
            ease: "none",
            scrollTrigger: { trigger: img.closest(".panel"), containerAnimation: scroll, start: "left right", end: "right left", scrub: true }
          });
        });
      });
    });
    mm.add("(max-width: 900px)", function () {
      document.querySelectorAll(".hscroll .panel .media img").forEach(function (img) {
        gsap.fromTo(img, { yPercent: -8 }, { yPercent: 8, ease: "none", scrollTrigger: { trigger: img.closest(".panel"), start: "top bottom", end: "bottom top", scrub: true } });
      });
    });

    /* Process: pinned image swaps per step */
    document.querySelectorAll(".process").forEach(function (p) {
      var imgs = p.querySelectorAll(".process__sticky img");
      var steps = p.querySelectorAll(".step");
      if (imgs[0]) imgs[0].classList.add("is-active");
      steps.forEach(function (step, i) {
        ScrollTrigger.create({
          trigger: step,
          start: "top 60%",
          end: "bottom 60%",
          onToggle: function (self) {
            if (!self.isActive) return;
            imgs.forEach(function (im, j) { im.classList.toggle("is-active", i === j); });
          }
        });
      });
    });

    /* Footer: slides up from under the page + wordmark letters rise */
    var footerWrap = document.querySelector(".footer-wrap");
    if (footerWrap) {
      footerWrap.style.overflow = "hidden";
      gsap.from(footerWrap.querySelector(".footer"), {
        yPercent: -22,
        ease: "none",
        scrollTrigger: { trigger: footerWrap, start: "top bottom", end: "top 20%", scrub: true }
      });
      gsap.from(footerWrap.querySelectorAll("[data-wordmark] span"), {
        yPercent: 70,
        opacity: 0,
        stagger: 0.05,
        duration: 1.2,
        ease: "power4.out",
        scrollTrigger: { trigger: footerWrap.querySelector("[data-wordmark]"), start: "top 95%", once: true }
      });
    }

    /* Hero intro (runs after preloader) */
    window.__heroIntro = function () {
      var hero = document.querySelector(".hero");
      if (!hero) return;
      var tl = gsap.timeline({ defaults: { ease: "power4.out" } });
      var bg = hero.querySelector(".hero__bg img");
      if (bg) tl.to(bg, { scale: 1, duration: 2.2, ease: "power3.out" }, 0);
      hero.querySelectorAll("[data-split]").forEach(function (el, i) {
        if (el._heroLines) tl.to(el._heroLines, { yPercent: 0, duration: 1.4, stagger: 0.1, onComplete: function () { unclip(el); } }, 0.35 + i * 0.15);
      });
      tl.from(hero.querySelectorAll("[data-hero-fade]"), { opacity: 0, y: 24, duration: 1.2, stagger: 0.12 }, 0.7);
      tl.from(header, { yPercent: -100, opacity: 0, duration: 1, ease: "power3.out" }, 0.5);

      /* Hero parallax on scroll (image hero only; the sequence hero scrubs frames instead) */
      if (!hero.classList.contains("hero--seq")) {
        if (bg) gsap.to(bg, { yPercent: 18, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
        gsap.to(hero.querySelector(".hero__content"), { yPercent: -20, opacity: 0.2, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
      }
    };

    /* ------------------------------------------------------------------
       Frame-sequence scrub — plays converted video frames on scroll.
       Any [data-seq] host with a <canvas> becomes a pinned, scrubbed scene.
       ------------------------------------------------------------------ */
    document.querySelectorAll("[data-seq]").forEach(function (host) {
      var dir = host.dataset.seq;
      var count = parseInt(host.dataset.frames, 10);
      var pad = parseInt(host.dataset.pad || "3", 10);
      var ext = host.dataset.ext || "jpg";
      var mode = host.dataset.seqMode || "band";
      var isHero = mode === "hero";
      var canvas = host.querySelector("canvas");
      if (!canvas || !count) return;
      var ctx = canvas.getContext("2d", { alpha: false });
      var scene = host.closest("[data-seq-scene]") || host;
      /* Hero headline narrates the build as you scroll through the sequence. */
      var heroTitle = isHero ? scene.querySelector(".hero__title") : null;
      var heroPhrases = [
        'Thoughtfully designed. <em>Precisely built.</em>',
        'Every home begins with <em>a clear idea.</em>',
        'We build it, <em>stage by stage.</em>',
        'From first question to <em>final handover.</em>'
      ];
      if (heroTitle) heroTitle._phase = 0;
      var loaderWrap = (mode === "hero" ? scene : host).querySelector("[data-seq-loader]");
      var loaderNum = loaderWrap && loaderWrap.querySelector("b");
      var frames = new Array(count);
      var loaded = 0, cur = -1, ready = false, progress = 0;

      function url(i) { var n = String(i + 1); while (n.length < pad) n = "0" + n; return dir + "/f_" + n + "." + ext; }
      function sizeCanvas() {
        var r = host.getBoundingClientRect();
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      }
      function paint(i) {
        i = i < 0 ? 0 : (i > count - 1 ? count - 1 : i);
        var img = frames[i];
        if (!img || !img.complete || !img.naturalWidth) return;
        cur = i;
        var cw = canvas.width, ch = canvas.height, iw = img.naturalWidth, ih = img.naturalHeight;
        var sc = Math.max(cw / iw, ch / ih), w = iw * sc, h = ih * sc, x = (cw - w) / 2, y = (ch - h) / 2;
        ctx.fillStyle = "#151613"; ctx.fillRect(0, 0, cw, ch);
        ctx.drawImage(img, x, y, w, h);
        if (mode === "hero") drawStamp(sx(iw, sc, x), sy(ih, sc, y), 0.042 * iw * sc);
      }
      /* Watermark cover: a small brand stamp drawn over the source-video mark */
      function sx(iw, sc, x) { return x + 0.891 * iw * sc; }
      function sy(ih, sc, y) { return y + 0.820 * ih * sc; }
      function drawStamp(cx, cy, R) {
        ctx.save();
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = "rgba(19, 18, 13, 0.92)"; ctx.fill();
        ctx.lineWidth = Math.max(1, R * 0.05); ctx.strokeStyle = "rgba(200, 168, 119, 0.85)";
        ctx.beginPath(); ctx.arc(cx, cy, R * 0.88, 0, Math.PI * 2); ctx.stroke();
        var s = R * 1.15;
        ctx.lineWidth = Math.max(1.2, R * 0.055); ctx.lineJoin = "round"; ctx.lineCap = "round";
        ctx.strokeStyle = "rgba(210, 180, 130, 0.95)";
        function P(px, py) { return [cx + (px - 50) / 100 * s, cy + (py - 46) / 100 * s]; }
        var seg = [[50, 20, 82, 76], [50, 20, 18, 76], [18, 76, 40, 76], [60, 76, 82, 76], [52, 40, 70, 76]];
        ctx.beginPath();
        for (var k = 0; k < seg.length; k++) { var a = P(seg[k][0], seg[k][1]), b = P(seg[k][2], seg[k][3]); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
        ctx.stroke();
        ctx.restore();
      }
      /* Hero: hold the FINISHED frame as a teaser, cut to construction behind a
         cloud cover, then play forward (construction -> finished). Band: linear. */
      function frameFor(p) {
        var last = count - 1;
        if (!isHero) return Math.round(p * last);
        if (p < 0.14) return last;                 // finished-home teaser
        if (p < 0.22) return 0;                    // construction, hidden by clouds
        var t = (p - 0.22) / 0.78; if (t > 1) t = 1;
        return Math.round(t * last);               // forward build to finished
      }
      function redraw() { paint(frameFor(progress)); }
      var firstIdx = isHero ? count - 1 : 0; /* frame shown at rest */
      var need = (mode === "hero") ? Math.min(count, 72) : 0, priorityLoaded = 0;
      if (mode === "hero") window.__heroReady = 0;
      function onFrame(idx, k) {
        loaded++;
        if (mode === "hero" && k < need) { priorityLoaded++; window.__heroReady = priorityLoaded / need; }
        if (loaderNum) loaderNum.textContent = Math.round(loaded / count * 100);
        if (idx === firstIdx && !ready) { ready = true; sizeCanvas(); redraw(); }
        if (loaded >= count && loaderWrap) loaderWrap.classList.add("is-done");
        if (idx === cur || cur === -1) redraw();
      }
      /* Hero loads the finished frames first so the resting teaser appears fast. */
      for (var k = 0; k < count; k++) (function (k) {
        var idx = isHero ? count - 1 - k : k;
        var img = new Image(); frames[idx] = img;
        img.onload = function () { onFrame(idx, k); };
        img.onerror = function () { onFrame(idx, k); };
        img.src = url(idx);
      })(k);
      window.addEventListener("resize", function () { sizeCanvas(); redraw(); });

      if (reduce) { sizeCanvas(); if (frames[0].complete) redraw(); else frames[0].addEventListener("load", function () { ready = true; sizeCanvas(); redraw(); }); return; }

      var sticky = scene.hasAttribute("data-seq-sticky");
      ScrollTrigger.create({
        trigger: scene, start: "top top", end: host.dataset.seqEnd || "+=120%",
        pin: !sticky, scrub: true, invalidateOnRefresh: true, anticipatePin: sticky ? 0 : 1,
        onRefresh: function () { sizeCanvas(); redraw(); },
        onUpdate: function (self) {
          progress = self.progress; if (ready) redraw();
          if (mode === "hero") {
            var p = self.progress;
            var c = scene.querySelector(".hero__content");
            if (c) { var o = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4; gsap.set(c, { autoAlpha: Math.max(0, o), y: -50 * Math.max(0, p - 0.45) }); }
            /* Swap the headline through the build phases; fade the sub/CTA out
               quickly so only the narrating line remains during the scroll. */
            if (heroTitle) {
              var phase = p < 0.14 ? 0 : p < 0.30 ? 1 : p < 0.46 ? 2 : 3;
              if (heroTitle._phase !== phase) {
                heroTitle._phase = phase;
                gsap.to(heroTitle, { autoAlpha: 0, duration: 0.2, overwrite: true, onComplete: function () {
                  heroTitle.innerHTML = heroPhrases[phase];
                  gsap.to(heroTitle, { autoAlpha: 1, duration: 0.35, overwrite: true });
                } });
              }
            }
            var hb = scene.querySelector(".hero__bottom");
            if (hb) { var bo = p < 0.05 ? 1 : 1 - (p - 0.05) / 0.09; gsap.set(hb, { autoAlpha: Math.max(0, Math.min(1, bo)) }); }
            /* Clouds fully cover the finished->construction cut, then part so
               the build plays through: finished teaser -> clouds -> ground. */
            var cl = scene.querySelector("#heroClouds");
            if (cl) {
              var o;
              if (p < 0.02) o = 0;
              else if (p < 0.14) o = (p - 0.02) / 0.12;   // roll in over the teaser
              else if (p < 0.24) o = 1;                    // full cover during the cut
              else if (p < 0.42) o = 1 - (p - 0.24) / 0.18; // part to reveal construction
              else o = 0;
              gsap.set(cl, { opacity: Math.max(0, Math.min(1, o)), scale: 1 + 0.14 * Math.max(0, Math.min(1, o)) });
            }
          }
        }
      });
    });

    /* ------------------------------------------------------------------
       Layered parallax (clouds and any decorative [data-py]/[data-px]).
       Element drifts from -amount to +amount across its root's scroll.
       ------------------------------------------------------------------ */
    if (!reduce) {
      document.querySelectorAll("[data-py], [data-px]").forEach(function (el) {
        var py = parseFloat(el.dataset.py || 0), px = parseFloat(el.dataset.px || 0);
        var root = el.closest("[data-parallax-root]") || el;
        gsap.fromTo(el, { yPercent: -py, xPercent: -px }, {
          yPercent: py, xPercent: px, ease: "none",
          scrollTrigger: { trigger: root, start: "top bottom", end: "bottom top", scrub: true }
        });
      });

      /* Universal, gentle parallax so every section has motion.
         Skips pinned scenes (hero, gallery, sequences) and the sky (own layers). */
      [[".section__head", 5], [".stat", 4], [".value", 4], [".spec", 3], [".person", 6],
       [".quote", 5], [".manifesto__text", 4], [".svc__list", 5], [".contact__list", 5],
       [".cta .h-display", 6], [".card__meta", 4]].forEach(function (g) {
        document.querySelectorAll(g[0]).forEach(function (el) {
          if (el.closest(".hero, .hscroll, [data-seq-scene], .sky")) return;
          gsap.fromTo(el, { yPercent: g[1] }, {
            yPercent: -g[1], ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true }
          });
        });
      });
    }

    /* ------------------------------------------------------------------
       Every image gets a GSAP reveal (fade + slow scale-out), and body
       copy / labels animate in too. Split headings are already handled above.
       ------------------------------------------------------------------ */
    if (!reduce) {
      /* Leads reveal word by word */
      document.querySelectorAll("main .lede").forEach(function (el) {
        if (el.closest(".hero, [data-seq-scene], .sky")) return;
        var split = new SplitText(el, { type: "words", wordsClass: "w-rise" });
        gsap.set(split.words, { yPercent: 115, opacity: 0 });
        gsap.to(split.words, {
          yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.03, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 90%", once: true }
        });
      });

      /* Body copy, labels and small meta fade up */
      document.querySelectorAll("main .body, main .label, main .service__desc, main .spec__k, main .panel__loc, main .card__tag, main .svc__list li").forEach(function (el) {
        if (el.hasAttribute("data-reveal")) return;
        if (el.closest(".hero, [data-seq-scene], .sky, .footer, .menu, .preloader")) return;
        gsap.from(el, { autoAlpha: 0, y: 18, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 93%", once: true } });
      });
    }

    /* ---- Redesign: scroll-progress bar + drawn section rules ---------- */
    (function () {
      var sb = document.createElement("div");
      sb.className = "scrollbar"; sb.innerHTML = "<i></i>";
      body.appendChild(sb);
      var sbi = sb.querySelector("i");
      ScrollTrigger.create({ start: 0, end: "max", onUpdate: function (self) { gsap.set(sbi, { scaleX: self.progress }); } });
    })();
    document.querySelectorAll(".section__head").forEach(function (h) {
      ScrollTrigger.create({ trigger: h, start: "top 82%", once: true, onEnter: function () { h.classList.add("is-drawn"); } });
    });

    /* Pinned sections must be refreshed before anything below them, so order
       every trigger by its position on the page before measuring. */
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  }

  /* ---------------------------------------------------------------------
     Preloader
     --------------------------------------------------------------------- */
  function runPreloader(done) {
    var pre = document.getElementById("preloader");
    var seen = sessionStorage.getItem("excello-loaded");
    if (!pre || reduce || seen) {
      if (pre) pre.remove();
      done();
      return;
    }
    sessionStorage.setItem("excello-loaded", "1");
    if (lenis) lenis.stop();
    var countEl = document.getElementById("preCount");
    var bar = document.getElementById("preBar");
    var roll = document.getElementById("preRoll");
    var words = roll ? roll.children.length : 0;

    /* Intro */
    gsap.set(pre.querySelectorAll(".preloader__word span"), { y: "110%" });
    gsap.to(pre.querySelectorAll(".preloader__word span"), { y: 0, duration: 1, stagger: 0.05, ease: "power4.out", delay: 0.1 });
    gsap.from(pre.querySelectorAll(".preloader__top span, .preloader__roll, .preloader__bottom"), { autoAlpha: 0, y: 12, duration: 0.8, stagger: 0.08, ease: "power3.out", delay: 0.2 });

    /* Progress: follows real hero-frame loading (falls back to time on other pages) */
    var start = performance.now(), shown = 0, finished = false;
    function tick(now) {
      var el = now - start;
      var heroReady = (typeof window.__heroReady === "number") ? window.__heroReady : null;
      var timeFloor = Math.min(1, el / 1600);
      /* fill toward 90% on time, then let real load complete the last 10% */
      var target = heroReady != null ? Math.max(heroReady, Math.min(timeFloor, 0.9)) : timeFloor;
      shown += (target - shown) * 0.09;
      var pct = Math.round(shown * 100);
      if (countEl) countEl.textContent = pct;
      if (bar) gsap.set(bar, { scaleX: shown });
      if (roll && words) gsap.set(roll, { y: -(Math.min(words - 1, Math.floor(shown * words)) * 1.5) + "em" });
      var ready = pct >= 99 && (heroReady == null ? el > 1400 : (heroReady >= 1 || el > 8000));
      if (!ready) { requestAnimationFrame(tick); return; }
      if (finished) return; finished = true;
      outro();
    }
    function outro() {
      if (countEl) countEl.textContent = 100;
      if (bar) gsap.set(bar, { scaleX: 1 });
      var tl = gsap.timeline({ onComplete: function () { pre.remove(); if (lenis) lenis.start(); done(); } });
      tl.to(pre.querySelectorAll(".preloader__word span"), { y: "-115%", duration: 0.7, stagger: 0.03, ease: "power4.in" }, 0)
        .to(pre.querySelectorAll(".preloader__top, .preloader__roll, .preloader__bottom"), { autoAlpha: 0, y: -10, duration: 0.5, ease: "power2.in" }, 0)
        .to(pre, { yPercent: -100, duration: 1, ease: "power4.inOut" }, "-=0.15");
    }
    requestAnimationFrame(tick);
  }

  /* ---------------------------------------------------------------------
     Contact form — POSTs to /api/enquiry (server stores it); falls back to a
     helpful message if there is no backend (e.g. opened as a plain file).
     --------------------------------------------------------------------- */
  var form = document.querySelector("form.form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var note = form.querySelector(".form__note");
      var btn = form.querySelector("button[type=submit]");
      function done(msg) {
        note.textContent = msg;
        gsap.fromTo(note, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.6 });
      }
      var data = {
        name: (form.querySelector("#name") || {}).value || "",
        email: (form.querySelector("#email") || {}).value || "",
        phone: (form.querySelector("#phone") || {}).value || "",
        service: (form.querySelector("#service") || {}).value || "",
        message: (form.querySelector("#message") || {}).value || ""
      };
      btn.disabled = true;
      note.textContent = "Sending…";
      fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(function (r) {
        if (!r.ok) return r.json().then(function (j) { throw new Error(j.error || "Something went wrong."); });
        form.reset();
        done("Thank you. We've received your enquiry and will be in touch within one business day.");
      }).catch(function (err) {
        /* No backend (e.g. opened as a plain file) or a validation error. */
        btn.disabled = false;
        done((err && err.message) ? err.message : "We couldn't send that just now — please email inquiry@excello.lk or call +94 77 022 2000.");
      });
    });
  }

  /* ---------------------------------------------------------------------
     Chat assistant (front-end concierge; wire to a backend/WhatsApp later)
     --------------------------------------------------------------------- */
  (function () {
    var toggle = document.getElementById("chatToggle");
    var panel = document.getElementById("chat");
    if (!toggle || !panel) return;
    var bodyEl = panel.querySelector("#chatBody");
    var quickEl = panel.querySelector("#chatQuick");
    var formEl = panel.querySelector("#chatForm");
    var inputEl = panel.querySelector("#chatInput");
    var waHref = "https://wa.me/94770222000?text=" + encodeURIComponent("Hello Excello, I'd like to talk about a project.");
    var greeted = false;

    var QUICK = ["Our services", "About Aathavan", "Book a call", "Talk on WhatsApp"];
    var REPLIES = [
      { k: /service|do you|offer|architect|construct|interior|property|develop|design/i, a: "We work four ways in: Architecture & Interior Design, Design and Build, Construction & Project Delivery, and Property Development & Consultation. Which one are you exploring?" },
      { k: /aathavan|price|pricing|cost|how much|rate|budget/i, a: "Aathavan Apartments is a family-oriented development of 44 residences at No. 6 Carron Place, Dehiwala, with two- and three-bedroom homes, rooftop amenities, solar infrastructure and parking. Shall I have our team share more detail?" },
      { k: /sea esta|villa|panimozhi|kaapi|bambalapitiya|rudra|project/i, a: "Our recent work includes Aathavan Apartments, Panimozhi Club House, Sea Esta Villas, Café Kaapi, Bambalapitiya Residence and Rudra Wellness Retreat. Would you like the project archive?" },
      { k: /call|meet|book|appointment|visit|consult|clarity/i, a: "Happy to arrange it. Call us on +94 77 022 2000, or leave your details on the contact page and we'll help you identify the right first step." },
      { k: /whatsapp|whats app|wa\b/i, a: "__WA__" },
      { k: /where|location|address|office|map|colombo|lavinia/i, a: "We're at No. 16, St Rita's Road, Mount Lavinia, Sri Lanka. There's a live map on our contact page." },
      { k: /email|contact|reach/i, a: "You can reach us at inquiry@excello.lk or +94 77 022 2000. Want me to open WhatsApp?" },
      { k: /hi|hello|hey|good (morning|evening|afternoon)/i, a: "Hello! How can we help with your project today?" },
      { k: /thank|thanks|great|awesome/i, a: "You're most welcome. Anything else I can help with?" }
    ];

    function scrollDown() { bodyEl.scrollTop = bodyEl.scrollHeight; }
    function add(text, who) {
      var m = document.createElement("div");
      m.className = "msg msg--" + who;
      m.textContent = text;
      bodyEl.appendChild(m);
      scrollDown();
      return m;
    }
    function botSay(text) {
      var t = add("…", "bot");
      setTimeout(function () { t.textContent = text; scrollDown(); }, 420);
    }
    function respond(text) {
      var hit = REPLIES.find(function (r) { return r.k.test(text); });
      if (!hit) return botSay("Thanks! The quickest way to a detailed answer is a quick chat. Call +94 77 022 2000, tap WhatsApp below, or use the contact form and we'll reply within one business day.");
      if (hit.a === "__WA__") { botSay("Opening WhatsApp…"); setTimeout(function () { window.open(waHref, "_blank"); }, 500); return; }
      botSay(hit.a);
    }
    function renderQuick() {
      quickEl.innerHTML = "";
      QUICK.forEach(function (q) {
        var b = document.createElement("button");
        b.className = "chat__chip"; b.type = "button"; b.textContent = q;
        b.onclick = function () {
          if (q === "Talk on WhatsApp") { window.open(waHref, "_blank"); return; }
          add(q, "me"); respond(q);
        };
        quickEl.appendChild(b);
      });
    }
    function openChat() {
      panel.classList.add("is-open");
      toggle.querySelector(".fab__dot") && toggle.querySelector(".fab__dot").remove();
      if (!greeted) { greeted = true; botSay("Hi, I'm the Excello assistant. Ask about our services, our projects, or booking a Design Clarity Call."); renderQuick(); }
      setTimeout(function () { inputEl && inputEl.focus(); }, 300);
    }
    function closeChat() { panel.classList.remove("is-open"); }

    toggle.addEventListener("click", function () { panel.classList.contains("is-open") ? closeChat() : openChat(); });
    var closeBtn = panel.querySelector("#chatClose");
    if (closeBtn) closeBtn.addEventListener("click", closeChat);
    formEl.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = inputEl.value.trim();
      if (!v) return;
      add(v, "me"); inputEl.value = ""; respond(v);
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeChat(); });
  })();

  /* ---------------------------------------------------------------------
     Back-to-top button (appears once you scroll)
     --------------------------------------------------------------------- */
  (function () {
    var toTop = document.getElementById("toTop");
    if (!toTop) return;
    ScrollTrigger.create({
      start: 100,
      onUpdate: function (self) { toTop.classList.toggle("is-visible", self.scroll() > window.innerHeight * 0.7); }
    });
    toTop.addEventListener("click", function () {
      if (lenis) lenis.scrollTo(0, { duration: 1.2 });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    });
  })();

  /* ---------------------------------------------------------------------
     Working map (Leaflet) — only where a #map-live element exists
     --------------------------------------------------------------------- */
  (function () {
    var el = document.getElementById("map-live");
    if (!el || typeof window.L === "undefined") return;
    var LATLNG = [6.8389, 79.8653]; // Mount Lavinia
    var map = window.L.map(el, { scrollWheelZoom: false, zoomControl: true, attributionControl: true }).setView(LATLNG, 12);
    window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    var icon = window.L.divIcon({ className: "", html: '<span class="map-pin"></span>', iconSize: [18, 18], iconAnchor: [9, 9] });
    window.L.marker(LATLNG, { icon: icon }).addTo(map).bindPopup("<strong>Excello Developers</strong><br>No 16, St Rita's Road, Mount Lavinia");
    map.on("click", function () { map.scrollWheelZoom.enable(); });
  })();

  /* ---------------------------------------------------------------------
     Boot
     --------------------------------------------------------------------- */
  function boot() {
    initReveals();
    runPreloader(function () { if (window.__heroIntro) window.__heroIntro(); });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot);
  else boot();

  window.addEventListener("load", function () { ScrollTrigger.sort(); ScrollTrigger.refresh(); });
})();
