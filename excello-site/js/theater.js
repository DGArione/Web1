/* Insights "theater" — a cinematic, autoplaying showcase slider.
   Loads before main.js; uses the global gsap. */
(function () {
  var B = (function () {
    try {
      var s = (document.currentScript && document.currentScript.src) || "";
      if (s) return new URL(s).pathname.replace(/\/js\/theater\.js.*$/, "");
    } catch (e) {}
    var b = document.querySelector("base"); return b ? (b.getAttribute("href") || "/").replace(/\/+$/, "") : "";
  })();
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function initTheater() {
    var root = document.getElementById("theater");
    if (!root) return;
    var slides = Array.prototype.slice.call(root.querySelectorAll(".tslide"));
    if (!slides.length) return;
    var dots = Array.prototype.slice.call(root.querySelectorAll(".tdot"));
    var nowEl = document.getElementById("tnow");
    var bar = document.getElementById("tbar");
    var cur = 0, timer = null, DURATION = 6800, paused = false;

    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function animateIn(slide) {
      if (reduce || !window.gsap) return;
      var items = slide.querySelectorAll(".tslide__meta, .tslide__title, .tslide__excerpt, .btn");
      gsap.fromTo(items, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1, stagger: 0.08, ease: "power4.out", overwrite: true });
    }
    function go(i, dir) {
      i = (i + slides.length) % slides.length;
      if (i === cur && slides[i].classList.contains("is-active")) return;
      slides.forEach(function (s, j) { s.classList.toggle("is-active", j === i); });
      dots.forEach(function (d, j) { d.classList.toggle("is-active", j === i); });
      cur = i;
      if (nowEl) nowEl.textContent = pad(i + 1);
      animateIn(slides[i]);
      restart();
    }
    function next() { go(cur + 1, 1); }
    function prev() { go(cur - 1, -1); }

    function restart() {
      if (!bar) return;
      if (window.gsap) {
        gsap.killTweensOf(bar);
        gsap.set(bar, { width: "0%" });
        if (!reduce && !paused) gsap.to(bar, { width: "100%", duration: DURATION / 1000, ease: "none", onComplete: next });
      }
    }
    function stop() { paused = true; if (window.gsap) gsap.killTweensOf(bar); }
    function play() { if (paused) { paused = false; restart(); } }

    /* Controls */
    var prevBtn = root.querySelector("[data-prev]"), nextBtn = root.querySelector("[data-next]");
    if (prevBtn) prevBtn.addEventListener("click", prev);
    if (nextBtn) nextBtn.addEventListener("click", next);
    dots.forEach(function (d) { d.addEventListener("click", function () { go(parseInt(d.dataset.goto, 10), 1); }); });
    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", play);

    /* Keyboard (only while the theater is on screen) */
    var onScreen = true;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) { onScreen = e[0].isIntersecting; if (onScreen) play(); else stop(); }, { threshold: 0.3 }).observe(root);
    }
    document.addEventListener("keydown", function (e) {
      if (!onScreen) return;
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    });

    /* Drag / swipe */
    var down = false, sx = 0;
    root.addEventListener("pointerdown", function (e) { down = true; sx = e.clientX; });
    window.addEventListener("pointerup", function (e) {
      if (!down) return; down = false;
      var dx = e.clientX - sx;
      if (Math.abs(dx) > 60) { dx < 0 ? next() : prev(); }
    });

    go(0, 1);
  }

  /* Full index list under the theater, from the public API */
  function initList() {
    var host = document.getElementById("ilist");
    if (!host) return;
    fetch(B + "/api/insights").then(function (r) { return r.json(); }).then(function (items) {
      if (!items || !items.length) { host.innerHTML = '<p class="body body--muted" style="padding:24px 0;">No insights yet.</p>'; return; }
      host.innerHTML = items.map(function (a, i) {
        var meta = [a.category, a.date].filter(Boolean).join(" · ");
        var n = (i < 9 ? "0" : "") + (i + 1);
        return '<a class="icard" href="' + B + '/insight/' + a.slug + '" data-cursor="view">' +
          '<span class="icard__i">' + n + "</span>" +
          '<span class="icard__title">' + esc(a.title) + "</span>" +
          '<span class="icard__meta">' + esc(meta) + "</span>" +
          '<span class="icard__arrow"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M1 13 13 1M4 1h9v9"/></svg></span>' +
          "</a>";
      }).join("");
    }).catch(function () {});
  }
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }

  if (document.readyState !== "loading") { initTheater(); initList(); }
  else document.addEventListener("DOMContentLoaded", function () { initTheater(); initList(); });
})();
