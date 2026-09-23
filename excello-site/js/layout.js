/* Shared layout: preloader, cursor, header, fullscreen menu, footer.
   Injected on every page so the markup lives in one place (no build step). */
(function () {
  document.documentElement.classList.add("js");

  /* Base path when the app runs under a sub-folder. Derived from where THIS
     script actually loaded (…/<prefix>/js/layout.js) so nav/links resolve under
     the sub-path with or without an injected <base>. Falls back to <base>. */
  var B = (function () {
    try {
      var s = (document.currentScript && document.currentScript.src) || "";
      if (s) return new URL(s).pathname.replace(/\/js\/layout\.js.*$/, "");
    } catch (e) {}
    var b = document.querySelector("base"); return b ? (b.getAttribute("href") || "/").replace(/\/+$/, "") : "";
  })();
  var path = (location.pathname.replace(B, "") || "/").replace(/index\.html$/, "").toLowerCase() || "/";
  var links = [
    { href: "/", label: "Home", num: "01", match: ["/", "/index.html"] },
    { href: "/about", label: "About", num: "02", match: ["/about", "/about.html"] },
    { href: "/services", label: "Services", num: "03", match: ["/services", "/services.html"] },
    { href: "/projects", label: "Projects", num: "04", match: ["/projects", "/projects.html", "/project/"] },
    { href: "/insights", label: "Insights", num: "05", match: ["/insights", "/insights.html", "/insight/"] },
    { href: "/contact", label: "Contact", num: "06", match: ["/contact", "/contact.html"] }
  ];
  function isActive(l) {
    return l.match.some(function (m) { return m.slice(-1) === "/" && m !== "/" ? path.indexOf(m) === 0 : path === m; });
  }

  var arrow =
    '<svg class="arrow" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M1 13 13 1M4 1h9v9"/></svg>';

  var navHtml = links
    .map(function (l) {
      var active = isActive(l) ? " is-active" : "";
      return '<a class="nav__link' + active + '" href="' + B + l.href + '" data-magnetic>' + l.label + "</a>";
    })
    .join("");

  var menuHtml = links
    .map(function (l) {
      return (
        '<a class="menu__link" href="' + B + l.href + '"><span><small>' + l.num + "</small> " + l.label + "</span></a>"
      );
    })
    .join("");

  var top =
    '<div class="preloader" id="preloader">' +
    '<div class="preloader__inner">' +
    '<div class="preloader__top"><span>Excello Developers</span><span>Design &amp; Build</span></div>' +
    '<div class="preloader__center">' +
    '<div class="preloader__word">' +
    "EXCELLO".split("").map(function (c) { return "<span>" + c + "</span>"; }).join("") +
    "</div>" +
    '<div class="preloader__roll"><span id="preRoll">' +
    ["Architecture","Interiors","Design &amp; Build","Construction","Development"].map(function (w) { return "<b>" + w + "</b>"; }).join("") +
    "</span></div>" +
    "</div>" +
    '<div class="preloader__bottom">' +
    '<div class="preloader__bar"><i id="preBar"></i></div>' +
    '<div class="preloader__count"><span id="preCount">0</span><em>%</em></div>' +
    "</div>" +
    "</div>" +
    "</div>" +
    '<div class="cursor" id="cursor"><span class="cursor__label">View</span></div>' +
    '<header class="header" id="header">' +
    '<a class="brand" href="' + B + '/" aria-label="Excello home">' +
    '<img class="brand__mark" src="img/logo-triangle.png" alt="" aria-hidden="true">' +
    '<span class="brand__text"><span class="brand__word">EXCELLO</span><span class="brand__sub" data-site="tagline">the way you imagine</span></span>' +
    "</a>" +
    '<nav class="nav" aria-label="Primary">' + navHtml + "</nav>" +
    '<a class="btn" href="' + B + '/contact" data-magnetic>Start a project ' + arrow + "</a>" +
    '<button class="burger" id="burger" aria-label="Open menu" aria-expanded="false"><span></span><span></span></button>' +
    "</header>" +
    '<div class="menu" id="menu" aria-hidden="true">' +
    '<div class="menu__links">' + menuHtml + "</div>" +
    '<div class="menu__foot"><span data-site="addrFull">No. 16, St Rita’s Road, Mount Lavinia, Sri Lanka</span><span data-site="phone">+94 77 022 2000</span><span>&copy; Excello Developers</span></div>' +
    "</div>";

  var footer =
    '<div class="footer-wrap"><footer class="footer" id="footer">' +
    '<div class="footer__cta">' +
      '<div><p class="footer__eyebrow">Start a project</p>' +
      '<h2 class="footer__head">Let’s build something<br>considered.</h2></div>' +
      '<a class="btn footer__btn" href="' + B + '/contact" data-magnetic>Start a conversation ' + arrow + "</a>" +
    "</div>" +
    '<div class="footer__top">' +
    '<div class="footer__col"><p class="footer__tag">Thoughtfully designed. Precisely built.</p></div>' +
    '<div class="footer__col"><h4>Navigate</h4><ul>' +
    links.map(function (l) { return '<li><a href="' + B + l.href + '">' + l.label + "</a></li>"; }).join("") +
    "</ul></div>" +
    '<div class="footer__col"><h4>Visit</h4><ul><li data-site="addr1">No. 16, St Rita’s Road</li><li data-site="addr2">Mount Lavinia</li><li data-site="addr3">Sri Lanka</li></ul></div>' +
    '<div class="footer__col"><h4>Connect</h4><ul>' +
    '<li><a href="tel:+94770222000" data-site="phone">+94 77 022 2000</a></li>' +
    '<li><a href="mailto:inquiry@excello.lk" data-site="email">inquiry@excello.lk</a></li>' +
    '<li><a href="https://www.facebook.com/ExcelloSriLanka/" target="_blank" rel="noopener" data-site="facebook">Facebook</a></li>' +
    '<li><a href="https://lk.linkedin.com/company/excello-developers-pvt-ltd" target="_blank" rel="noopener" data-site="linkedin">LinkedIn</a></li>' +
    '<li data-site-item="instagram" hidden><a href="#" target="_blank" rel="noopener" data-site="instagram">Instagram</a></li>' +
    "</ul></div>" +
    "</div>" +
    '<div class="footer__wordmark" aria-hidden="true">' +
    "EXCELLO".split("").map(function (c) { return "<span>" + c + "</span>"; }).join("") +
    "</div>" +
    '<div class="footer__bottom"><span>&copy; ' + new Date().getFullYear() + ' Excello Developers (Pvt) Ltd. All rights reserved.</span><span>Mount Lavinia · Colombo · Sri Lanka</span><span class="footer__credit">Developed by <a href="https://rapidsolutions.live" target="_blank" rel="noopener">RapidSolutions</a></span></div>' +
    "</footer></div>";

  /* ---- Floating WhatsApp + chat assistant (every page) ------------------ */
  var WA_NUMBER = "94770222000";
  var WA_TEXT = encodeURIComponent("Hello Excello, I'd like to talk about a project.");
  var waIcon = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 1.9a8.1 8.1 0 1 1-4.1 15.1l-.3-.2-3 .8.8-2.9-.2-.3A8.1 8.1 0 0 1 12 3.9zM8.9 7.3c-.2 0-.5.1-.7.4-.2.3-.9 1-.9 2.3s.9 2.6 1.1 2.8c.2.2 1.8 2.9 4.5 4 2.2.9 2.7.7 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.5-.3-1.7-.8c-.2-.1-.4-.1-.6.1l-.7.9c-.1.2-.3.2-.5.1-.7-.3-1.5-.6-2.3-1.7-.2-.3.2-.5.4-.9.1-.2.1-.3 0-.5l-.7-1.8c-.2-.5-.4-.4-.6-.4z"/></svg>';
  var chatIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z"/><circle cx="8.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="12" r="1" fill="currentColor" stroke="none"/></svg>';
  var sendIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 12 20 4l-6 16-2.5-6.5L4 12z"/></svg>';
  var upIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
  var widgets =
    '<div class="fabs">' +
      '<button class="fab fab--top" id="toTop" aria-label="Back to top"><span class="fab__label">Back to top</span>' + upIcon + "</button>" +
      '<a class="fab fab--wa" href="https://wa.me/' + WA_NUMBER + '?text=' + WA_TEXT + '" target="_blank" rel="noopener" aria-label="Chat on WhatsApp"><span class="fab__label">Chat on WhatsApp</span>' + waIcon + "</a>" +
      '<button class="fab fab--chat" id="chatToggle" aria-label="Open chat"><span class="fab__dot"></span><span class="fab__label">Ask Excello</span>' + chatIcon + "</button>" +
    "</div>" +
    '<aside class="chat" id="chat" aria-label="Excello assistant">' +
      '<div class="chat__head"><div class="chat__avatar">E</div><div><div class="chat__who">Excello Assistant</div><div class="chat__status">● Online</div></div><button class="chat__close" id="chatClose" aria-label="Close chat">&times;</button></div>' +
      '<div class="chat__body" id="chatBody"></div>' +
      '<div class="chat__quick" id="chatQuick"></div>' +
      '<form class="chat__foot" id="chatForm"><input class="chat__input" id="chatInput" placeholder="Type a message…" autocomplete="off"><button class="chat__send" type="submit" aria-label="Send">' + sendIcon + "</button></form>" +
    "</aside>";

  document.body.insertAdjacentHTML("afterbegin", top + widgets);
  /* The footer must land after <main>, so wait for the document to be parsed. */
  document.addEventListener("DOMContentLoaded", function () {
    document.body.insertAdjacentHTML("beforeend", footer);
    applySite(window.__SITE); /* patch the footer too, once it exists */
  });

  /* ---- Company details come from the backend (data/site.json) ------------- *
     One editable source drives phone, WhatsApp, email, address and socials
     across the header, footer, menu, WhatsApp button and contact page. */
  var DEFAULT_SITE = {
    companyName: "Excello Developers", tagline: "the way you imagine",
    phone: "+94 77 022 2000", whatsapp: "94770222000",
    whatsappText: "Hello Excello, I'd like to talk about a project.", email: "inquiry@excello.lk",
    addressLine1: "No. 16, St Rita’s Road", addressLine2: "Mount Lavinia", addressLine3: "Sri Lanka",
    facebook: "https://www.facebook.com/ExcelloSriLanka/",
    linkedin: "https://lk.linkedin.com/company/excello-developers-pvt-ltd", instagram: "",
    formEndpoint: B + "/api/enquiry", seoTitleSuffix: "Excello Developers", seoDescription: ""
  };
  window.__SITE = DEFAULT_SITE;

  function telHref(p) { return "tel:" + String(p || "").replace(/[^\d+]/g, ""); }
  function waHref(s) {
    return "https://wa.me/" + (s.whatsapp || "").replace(/[^\d]/g, "") +
      "?text=" + encodeURIComponent(s.whatsappText || "");
  }
  function setText(sel, val) {
    if (val == null) return;
    document.querySelectorAll(sel).forEach(function (el) { el.textContent = val; });
  }
  function applySite(s) {
    if (!s) return;
    setText('[data-site="tagline"]', s.tagline);
    setText('[data-site="addr1"]', s.addressLine1);
    setText('[data-site="addr2"]', s.addressLine2);
    setText('[data-site="addr3"]', s.addressLine3);
    setText('[data-site="addrFull"]', [s.addressLine1, s.addressLine2, s.addressLine3].filter(Boolean).join(", "));
    document.querySelectorAll('[data-site="addrHtml"]').forEach(function (el) {
      var e = function (t) { return String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
      el.innerHTML = e(s.addressLine1) + ",<br>" + [s.addressLine2, s.addressLine3].filter(Boolean).map(e).join(", ");
    });
    document.querySelectorAll('[data-site="phone"]').forEach(function (el) {
      el.textContent = s.phone || ""; if (el.tagName === "A") el.setAttribute("href", telHref(s.phone));
    });
    document.querySelectorAll('[data-site="email"]').forEach(function (el) {
      el.textContent = s.email || ""; if (el.tagName === "A") el.setAttribute("href", "mailto:" + (s.email || ""));
    });
    ["facebook", "linkedin", "instagram"].forEach(function (k) {
      document.querySelectorAll('[data-site="' + k + '"]').forEach(function (el) {
        if (s[k]) { el.setAttribute("href", s[k]); var li = el.closest("[data-site-item]"); if (li) li.hidden = false; }
        else { var li2 = el.closest("[data-site-item]"); if (li2) li2.hidden = true; }
      });
    });
    document.querySelectorAll(".fab--wa").forEach(function (el) { el.setAttribute("href", waHref(s)); });
    /* Per-page hero image override (set in the admin). Falls back to the
       default already in the markup. Works even if the page is served as a
       static file, since it applies from the /api/site fetch. */
    document.querySelectorAll("img[data-hero]").forEach(function (el) {
      var key = "hero" + el.getAttribute("data-hero").replace(/^./, function (c) { return c.toUpperCase(); });
      if (s[key]) el.setAttribute("src", s[key]);
    });
  }

  /* Social/SEO tags. The per-page <title> and <meta name="description"> stay
     authoritative; this adds Open Graph + Twitter + canonical on top, using the
     site settings, so shared links look right. */
  function meta(attr, key, val) {
    if (!val) return;
    var el = document.head.querySelector("meta[" + attr + '="' + key + '"]');
    if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
    el.setAttribute("content", val);
  }
  function injectSeo(s) {
    var descEl = document.head.querySelector('meta[name="description"]');
    var desc = (descEl && descEl.getAttribute("content")) || s.seoDescription || "";
    if (!descEl && desc) meta("name", "description", desc);
    var canonical = location.origin + location.pathname;
    var link = document.head.querySelector('link[rel="canonical"]');
    if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
    link.href = canonical;
    meta("property", "og:site_name", s.seoTitleSuffix || s.companyName || "Excello Developers");
    meta("property", "og:title", document.title);
    meta("property", "og:description", desc);
    meta("property", "og:type", "website");
    meta("property", "og:url", canonical);
    meta("name", "twitter:card", "summary_large_image");
    meta("name", "twitter:title", document.title);
    meta("name", "twitter:description", desc);
  }

  /* Expose a promise so main.js (chat / contact form) can use the same data. */
  window.__sitePromise = fetch(B + "/api/site")
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (s) {
      var merged = Object.assign({}, DEFAULT_SITE, s || {});
      window.__SITE = merged;
      applySite(merged);
      injectSeo(merged);
      return merged;
    })
    .catch(function () { applySite(DEFAULT_SITE); injectSeo(DEFAULT_SITE); return DEFAULT_SITE; });

  applySite(DEFAULT_SITE); /* header/widgets are already in the DOM */
})();
