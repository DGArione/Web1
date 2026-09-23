/* ==========================================================================
   EXCELLO — motion system
   GSAP 3 + ScrollTrigger + SplitText, Lenis smooth scroll.
   Every effect is opt-in through data-attributes / classes so pages stay
   plain HTML. See README.md for the list.
   ========================================================================== */
(function () {
  "use strict";

  gsap.registerPlugin(ScrollTrigger, SplitText);
  /* Phone browsers grow the viewport as the address bar hides; without this the
     pinned hero canvas gets a stale height and shows only half. Telling
     ScrollTrigger to ignore that resize keeps the pin correct so the frame-scrub
     works on touch swipe too. */
  ScrollTrigger.config({ ignoreMobileResize: true });

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var body = document.body;
  /* Base path (from the injected <base>) so internal fetches work under a sub-folder. */
  var B = (function () {
    try {
      var s = (document.currentScript && document.currentScript.src) || "";
      if (s) return new URL(s).pathname.replace(/\/js\/main\.js.*$/, "");
    } catch (e) {}
    var b = document.querySelector("base"); return b ? (b.getAttribute("href") || "/").replace(/\/+$/, "") : "";
  })();
  function apiUrl(p) { return p && p.charAt(0) === "/" ? B + p : p; }

  /* ------------------------------------------------------------------
     Home hydration — if the page is served as a static file (so the server
     never filled the Services / Featured / Selected markers), build those
     sections in the browser from the API. No-op when the server already
     rendered them (dynamic serving).
     ------------------------------------------------------------------ */
  (function hydrateHome() {
    var cS = document.getElementById("homeServices");
    var cF = document.getElementById("homeFeatured");
    var cL = document.getElementById("homeSelected");
    if (!cS && !cF && !cL) return;                       // not the home page
    var needS = cS && cS.children.length === 0;
    var needF = cF && cF.children.length === 0;
    var needL = cL && cL.children.length === 0;
    if (!needS && !needF && !needL) return;              // server already filled

    function esc(t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
    function pad2(n) { return (n < 10 ? "0" : "") + n; }
    function bySlug(list, slug) { for (var i = 0; i < list.length; i++) if (list[i].slug === slug) return list[i]; return null; }
    function get(u) { return fetch(apiUrl(u)).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }); }
    var ARROW = '<svg class="arrow" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M1 13 13 1M4 1h9v9"/></svg>';

    Promise.all([
      needS ? get("/api/services") : Promise.resolve([]),
      (needF || needL) ? get("/api/projects") : Promise.resolve([]),
      (window.__sitePromise || Promise.resolve(null))
    ]).then(function (r) {
      var services = r[0] || [], projects = r[1] || [], site = r[2] || {};
      /* Re-run the reveal / parallax / image-wipe / theme setup on injected
         content so the client-built sections animate like the rest. */
      function enhance(scope) {
        scope.querySelectorAll("[data-reveal]").forEach(function (el) {
          gsap.to(el, { opacity: 1, y: 0, duration: 1.05, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 92%", once: true } });
        });
        scope.querySelectorAll(".media--parallax").forEach(function (wrap) {
          var im = wrap.querySelector("img"); if (!im) return;
          var amt = parseFloat(wrap.dataset.parallax || 10);
          gsap.fromTo(im, { yPercent: -amt }, { yPercent: amt, ease: "none", scrollTrigger: { trigger: wrap, start: "top bottom", end: "bottom top", scrub: true } });
        });
        scope.querySelectorAll(".media").forEach(function (wrap) {
          var im = wrap.querySelector("img"); if (!im) return;
          wrap.style.clipPath = "none";
          var cov = document.createElement("span"); cov.className = "media__cover"; wrap.appendChild(cov);
          gsap.set(im, { scale: 1.22 });
          gsap.timeline({ scrollTrigger: { trigger: wrap, start: "top 84%", once: true } })
            .to(cov, { scaleY: 0, duration: 1.15, ease: "power4.inOut" }, 0)
            .to(im, { scale: 1, duration: 1.7, ease: "power3.out" }, 0.08);
        });
        scope.querySelectorAll("[data-theme]").forEach(function (sec) {
          var dark = sec.dataset.theme === "dark";
          ScrollTrigger.create({ trigger: sec, start: "top 55%", end: "bottom 55%",
            onEnter: function () { body.classList.toggle("is-dark", dark); },
            onEnterBack: function () { body.classList.toggle("is-dark", dark); },
            onLeave: function () { body.classList.remove("is-dark"); },
            onLeaveBack: function () { body.classList.remove("is-dark"); } });
        });
      }
      if (needS && services.length) {
        cS.innerHTML = services.map(function (s, i) {
          return '<a class="service" href="services#' + esc(s.slug) + '">' +
            '<span class="service__num">' + pad2(i + 1) + '</span>' +
            '<span class="service__title">' + esc(s.title) + '</span>' +
            '<span class="service__desc">' + esc(s.card || s.tagline || "") + '</span>' +
            '<span class="service__arrow">' + ARROW + '</span></a>';
        }).join("");
      }
      if (needF && projects.length) {
        var fp = bySlug(projects, site.homeFeatured) || projects[0];
        var kick = [fp.category, fp.location].filter(Boolean).map(esc).join(" · ");
        cF.innerHTML =
          '<section class="section container" data-theme="dark"><div class="spotlight">' +
            '<div class="media media--parallax media--clip media--ratio-portrait" data-parallax="10"><img src="' + esc(site.homeFeaturedImage || fp.cover) + '" alt="' + esc(fp.title) + '">' +
              (kick ? '<span class="media__caption">' + kick + '</span>' : '') + '</div>' +
            '<div><p class="label" data-reveal><span class="num">(02)</span>Featured project</p>' +
              '<h2 class="h-1" data-reveal style="margin-top:18px">' + esc(fp.title) + '</h2>' +
              (fp.excerpt ? '<p class="body" data-reveal style="margin-top:28px">' + esc(fp.excerpt) + '</p>' : '') +
              '<div data-reveal style="margin-top:40px"><a class="btn" href="project/' + esc(fp.slug) + '">View the project ' + ARROW + '</a></div>' +
            '</div></div></section>';
        enhance(cF);
      }
      if (needL && projects.length) {
        var a = bySlug(projects, site.homeSelectedA) || projects[1] || projects[0];
        var b2 = bySlug(projects, site.homeSelectedB) || projects[2] || projects[1] || projects[0];
        function media(p, img, amt) { var cap = [p.title, p.location].filter(Boolean).map(esc).join(" · "); return '<div class="media media--parallax media--clip" data-parallax="' + amt + '"><img src="' + esc(img || p.cover) + '" alt="' + esc(p.title) + '"><span class="media__caption">' + cap + '</span></div>'; }
        cL.innerHTML =
          '<section class="container"><div class="duo">' +
            '<div class="duo__lead"><p class="lede" data-reveal>From coastal villas and urban residences to café interiors and wellness retreats, our projects are places shaped by a clear idea, and a considered response to place, climate and daily life.</p>' +
            '<a class="link" data-reveal href="projects">Selected work</a></div>' +
            media(a, site.homeSelectedImageA, 8) + media(b2, site.homeSelectedImageB, 12) +
          '</div></section>';
        enhance(cL);
      }
      if (window.ScrollTrigger && ScrollTrigger.refresh) ScrollTrigger.refresh();
    });
  })();

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
  /* Pages without a dark hero (e.g. Insights, Calculator) start on the light
     background, where the blend-mode transparent header is unreadable — so keep
     the solid (dark-on-light) header on those pages at all times. */
  var noHero = !document.querySelector(".hero");
  if (noHero && header) header.classList.add("is-solid");
  ScrollTrigger.create({
    start: 40,
    onUpdate: function (self) {
      var s = self.scroll();
      header.classList.toggle("is-compact", s > 60);
      header.classList.toggle("is-solid", noHero || s > 60);
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
  curtain.className = "page-curtain";
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
      var wordmark = footerWrap.querySelector("[data-wordmark]");
      if (wordmark) {
        gsap.from(wordmark.querySelectorAll("span"), {
          yPercent: 70,
          opacity: 0,
          stagger: 0.05,
          duration: 1.2,
          ease: "power4.out",
          scrollTrigger: { trigger: wordmark, start: "top 95%", once: true }
        });
      }
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
      /* Hero headline narrates the build as you scroll — changes slowly. */
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
        /* Photographic background frames don't need retina; 1x (capped) keeps
           the per-frame draw cheap so the scroll scrub stays smooth on hi-dpi
           screens, where 2x would mean pushing 4x the pixels every frame. */
        var dpr = Math.min(window.devicePixelRatio || 1, 1.25);
        var w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      }
      function ready1(i) { var im = frames[i]; return im && im.complete && im.naturalWidth; }
      var wantIdx = -1;
      function paint(i) {
        i = i < 0 ? 0 : (i > count - 1 ? count - 1 : i);
        wantIdx = i; /* the exact frame we want; may fall back to a neighbour below */
        /* If the exact target frame hasn't decoded yet, draw the nearest frame
           that has, instead of freezing on the last one. Motion keeps flowing
           (just briefly coarser) and sharpens to the exact frame the instant it
           lands — no stutter while frames are still streaming in. */
        if (!ready1(i)) {
          var found = -1;
          for (var d = 1; d < count; d++) {
            if (i - d >= 0 && ready1(i - d)) { found = i - d; break; }
            if (i + d < count && ready1(i + d)) { found = i + d; break; }
          }
          if (found < 0) return;
          i = found;
        }
        var img = frames[i];
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
      /* Single linear play-through: construction (frame 0) builds straight to
         the finished home (last frame), exactly once across the scroll. */
      function frameFor(p) {
        var last = count - 1;
        return Math.round(p * last);
      }
      /* Batch paints to one per animation frame: ScrollTrigger's onUpdate can
         fire several times between repaints, so we keep only the latest target
         frame and draw it once, which removes redundant work during fast scroll. */
      var _raf = 0, _tgt = 0;
      function redraw() {
        _tgt = frameFor(progress);
        if (_raf) return;
        _raf = requestAnimationFrame(function () { _raf = 0; paint(_tgt); });
      }
      var firstIdx = 0; /* frame shown at rest (construction / "before") */
      /* Priority frames gate the preloader. Keep it small so the site becomes
         interactive fast; the rest of the (now light, ~50 KB) frames stream in
         behind it and fill smoothness without blocking first paint. */
      var need = (mode === "hero") ? Math.min(count, 30) : 0, priorityLoaded = 0;
      if (mode === "hero") window.__heroReady = 0;
      function onFrame(idx, k) {
        loaded++;
        if (mode === "hero" && k < need) { priorityLoaded++; window.__heroReady = priorityLoaded / need; }
        if (loaderNum) loaderNum.textContent = Math.round(loaded / count * 100);
        if (idx === firstIdx && !ready) { ready = true; sizeCanvas(); redraw(); }
        if (loaded >= count && loaderWrap) loaderWrap.classList.add("is-done");
        /* Repaint when the frame we currently want (or are showing) just landed,
           so a coarse neighbour sharpens to the exact frame the instant it decodes. */
        if (idx === wantIdx || idx === cur || cur === -1) redraw();
      }
      /* Load in the order the scrub visits: the resting teaser (last frame)
         first so the hero appears, then the forward build 0..last — which is
         exactly the order you scroll through. That way the frames you reach
         first are decoded first, so the scrub never steps waiting on a download. */
      var order = [];
      for (var j = 0; j < count; j++) order.push(j);
      for (var k = 0; k < order.length; k++) (function (k) {
        var idx = order[k];
        var img = new Image(); img.decoding = "async"; frames[idx] = img;
        function done() { onFrame(idx, k); }
        /* Decode the frame to a ready bitmap up front (while loading, off the
           scroll path) so painting it during the scrub never blocks on decode. */
        img.onload = function () { if (img.decode) img.decode().then(done, done); else done(); };
        img.onerror = done;
        img.src = url(idx);
      })(k);
      window.addEventListener("resize", function () { sizeCanvas(); redraw(); });

      if (reduce) { sizeCanvas(); if (frames[0].complete) redraw(); else frames[0].addEventListener("load", function () { ready = true; sizeCanvas(); redraw(); }); return; }

      var sticky = scene.hasAttribute("data-seq-sticky");
      ScrollTrigger.create({
        trigger: scene, start: "top top", end: host.dataset.seqEnd || "+=120%",
        pin: !sticky, scrub: (mode === "hero" ? 0.9 : 0.6), invalidateOnRefresh: true, anticipatePin: sticky ? 0 : 1,
        onRefresh: function () { sizeCanvas(); redraw(); },
        onUpdate: function (self) {
          progress = self.progress; if (ready) redraw();
          if (mode === "hero") {
            var p = self.progress;
            var c = scene.querySelector(".hero__content");
            if (c) { var o = p < 0.72 ? 1 : 1 - (p - 0.72) / 0.28; gsap.set(c, { autoAlpha: Math.max(0, o), y: -50 * Math.max(0, p - 0.5) }); }
            /* Swap the headline slowly through the build phases (long crossfade),
               so the wording changes gently as you scroll — never a snap. */
            if (heroTitle) {
              var phase = p < 0.18 ? 0 : p < 0.40 ? 1 : p < 0.60 ? 2 : 3;
              if (heroTitle._phase !== phase) {
                heroTitle._phase = phase;
                gsap.to(heroTitle, { autoAlpha: 0, duration: 0.55, ease: "power2.inOut", overwrite: true, onComplete: function () {
                  heroTitle.innerHTML = heroPhrases[phase];
                  gsap.to(heroTitle, { autoAlpha: 1, duration: 0.8, ease: "power2.out", overwrite: true });
                } });
              }
            }
            var hb = scene.querySelector(".hero__bottom");
            if (hb) { var bo = p < 0.05 ? 1 : 1 - (p - 0.05) / 0.09; gsap.set(hb, { autoAlpha: Math.max(0, Math.min(1, bo)) }); }
            /* Soft ambient clouds at the landing that clear as the build plays
               through (no cut to hide anymore — the sequence runs once). */
            var cl = scene.querySelector("#heroClouds");
            if (cl) {
              var o = p < 0.16 ? 1 - p / 0.16 : 0;
              gsap.set(cl, { opacity: 0.55 * Math.max(0, Math.min(1, o)), scale: 1 + 0.12 * Math.max(0, Math.min(1, o)) });
            }
          }
        }
      });
    });

    /* ------------------------------------------------------------------
       Hero hand-off: the first section after the pinned hero rises into
       view with a parallax lift + soft fade as the hero releases, so the
       next section "comes in" rather than just scrolling up flatly.
       ------------------------------------------------------------------ */
    if (!reduce) {
      /* Target by marker, not sibling: ScrollTrigger's pin wraps the hero in a
         .pin-spacer at runtime, so an adjacent-sibling selector would miss. */
      var afterHero = document.querySelector("[data-hero-next]");
      if (afterHero) {
        gsap.set(afterHero, { transformOrigin: "50% 100%", willChange: "transform" });
        gsap.fromTo(afterHero,
          { yPercent: 16, scale: 1.05, autoAlpha: 0.55 },
          { yPercent: 0, scale: 1, autoAlpha: 1, ease: "none",
            scrollTrigger: { trigger: afterHero, start: "top bottom", end: "top 45%", scrub: 0.5 } });
      }
    }

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
      var endpoint = apiUrl((window.__SITE && window.__SITE.formEndpoint) || "/api/enquiry");
      fetch(endpoint, {
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
    /* WhatsApp target comes from the shared site settings (see js/layout.js). */
    function waHref() {
      var s = window.__SITE || {};
      return "https://wa.me/" + (s.whatsapp || "94770222000").replace(/[^\d]/g, "") +
        "?text=" + encodeURIComponent(s.whatsappText || "Hello Excello, I'd like to talk about a project.");
    }
    var greeted = false;

    /* The Q&A is editable in the admin panel (Chatbot tab). These built-ins are
       only used as a fallback if the backend can't be reached (e.g. opened as a
       plain file). Each entry: title (chip label / question), keywords (comma
       list used to match what the visitor types), answer, and quick (chip). */
    var FALLBACK = [
      { title: "Our services", quick: true, keywords: "service, services, offer, do you, architecture, construction, interior, property, development, design", answer: "We work four ways in: Architecture & Interior Design, Design and Build, Construction & Project Delivery, and Property Development & Consultation. Which one are you exploring?" },
      { title: "About Aathavan", quick: true, keywords: "aathavan, price, pricing, cost, how much, rate, budget", answer: "Aathavan Apartments is a family-oriented development of 44 residences at No. 6 Carron Place, Dehiwala, with two- and three-bedroom homes, rooftop amenities, solar infrastructure and parking. Shall I have our team share more detail?" },
      { title: "Our projects", quick: false, keywords: "sea esta, villa, panimozhi, kaapi, bambalapitiya, rudra, project, projects, portfolio", answer: "Our recent work includes Aathavan Apartments, Panimozhi Club House, Sea Esta Villas, Café Kaapi, Bambalapitiya Residence and Rudra Wellness Retreat. Would you like the project archive?" },
      { title: "Book a call", quick: true, keywords: "call, meet, book, appointment, visit, consult, clarity", answer: "Happy to arrange it. Call us on +94 77 022 2000, or leave your details on the contact page and we'll help you identify the right first step." },
      { title: "Where are you located?", quick: false, keywords: "where, location, address, office, map, colombo, lavinia", answer: "We're at No. 16, St Rita's Road, Mount Lavinia, Sri Lanka. There's a live map on our contact page." },
      { title: "Contact details", quick: false, keywords: "email, contact, reach, phone, number", answer: "You can reach us at inquiry@excello.lk or +94 77 022 2000. Want me to open WhatsApp?" }
    ];
    var entries = FALLBACK;

    function tokensFor(e) {
      return (e.keywords || e.title || "").split(/[,|]/).map(function (t) { return t.trim().toLowerCase(); }).filter(Boolean);
    }
    function matchEntry(text) {
      var low = " " + text.toLowerCase() + " ";
      for (var i = 0; i < entries.length; i++) {
        var toks = tokensFor(entries[i]);
        for (var j = 0; j < toks.length; j++) { if (toks[j] && low.indexOf(toks[j]) !== -1) return entries[i]; }
      }
      return null;
    }

    /* Load the editable Q&A from the backend; keep the fallback on failure. */
    fetch(B + "/api/chatbot").then(function (r) { return r.ok ? r.json() : null; }).then(function (list) {
      if (list && list.length) { entries = list; if (panel.classList.contains("is-open")) renderQuick(); }
    }).catch(function () {});

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
    function openWa() { botSay("Opening WhatsApp…"); setTimeout(function () { window.open(waHref(), "_blank"); }, 500); }
    function respond(text) {
      var low = text.toLowerCase();
      if (/\b(whatsapp|whats app)\b/.test(low)) return openWa();
      if (/^\s*(hi|hello|hey|good (morning|evening|afternoon))\b/.test(low)) return botSay("Hello! How can we help with your project today?");
      if (/\b(thanks|thank you|thankyou|cheers)\b/.test(low)) return botSay("You're most welcome. Anything else I can help with?");
      var hit = matchEntry(text);
      if (hit && hit.answer) { if (hit.answer === "__WA__") return openWa(); return botSay(hit.answer); }
      botSay("Thanks! The quickest way to a detailed answer is a quick chat. Call +94 77 022 2000, tap WhatsApp below, or use the contact form and we'll reply within one business day.");
    }
    function renderQuick() {
      quickEl.innerHTML = "";
      entries.filter(function (e) { return e.quick; }).forEach(function (e) {
        var b = document.createElement("button");
        b.className = "chat__chip"; b.type = "button"; b.textContent = e.title;
        b.onclick = function () { add(e.title, "me"); if (e.answer && e.answer !== "__WA__") botSay(e.answer); else respond(e.title); };
        quickEl.appendChild(b);
      });
      var wa = document.createElement("button");
      wa.className = "chat__chip"; wa.type = "button"; wa.textContent = "Talk on WhatsApp";
      wa.onclick = function () { window.open(waHref(), "_blank"); };
      quickEl.appendChild(wa);
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
