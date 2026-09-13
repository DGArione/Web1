/* Shared layout: preloader, cursor, header, fullscreen menu, footer.
   Injected on every page so the markup lives in one place (no build step). */
(function () {
  document.documentElement.classList.add("js");

  var path = location.pathname.replace(/index\.html$/, "").toLowerCase();
  var links = [
    { href: "/", label: "Home", num: "01", match: ["/", "/index.html"] },
    { href: "/about.html", label: "About", num: "02", match: ["/about.html"] },
    { href: "/services.html", label: "Services", num: "03", match: ["/services.html"] },
    { href: "/projects", label: "Projects", num: "04", match: ["/projects", "/projects.html", "/project/"] },
    { href: "/insights", label: "Insights", num: "05", match: ["/insights", "/insights.html", "/insight/"] },
    { href: "/contact.html", label: "Contact", num: "06", match: ["/contact.html"] }
  ];
  function isActive(l) {
    return l.match.some(function (m) { return m.slice(-1) === "/" && m !== "/" ? path.indexOf(m) === 0 : path === m; });
  }

  var arrow =
    '<svg class="arrow" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M1 13 13 1M4 1h9v9"/></svg>';

  var navHtml = links
    .map(function (l) {
      var active = isActive(l) ? " is-active" : "";
      return '<a class="nav__link' + active + '" href="' + l.href + '" data-magnetic>' + l.label + "</a>";
    })
    .join("");

  var menuHtml = links
    .map(function (l) {
      return (
        '<a class="menu__link" href="' + l.href + '"><span><small>' + l.num + "</small> " + l.label + "</span></a>"
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
    ["Architecture","Construction","Interiors","Real Estate","Branding"].map(function (w) { return "<b>" + w + "</b>"; }).join("") +
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
    '<a class="brand" href="/" aria-label="Excello home"><span class="brand__word">EXCELLO</span><span class="brand__sub">Design &amp; Build</span></a>' +
    '<nav class="nav" aria-label="Primary">' + navHtml + "</nav>" +
    '<a class="btn" href="/contact.html" data-magnetic>Start a project ' + arrow + "</a>" +
    '<button class="burger" id="burger" aria-label="Open menu" aria-expanded="false"><span></span><span></span></button>' +
    "</header>" +
    '<div class="menu" id="menu" aria-hidden="true">' +
    '<div class="menu__links">' + menuHtml + "</div>" +
    '<div class="menu__foot"><span>No 16, St Rita’s Road, Mount Lavinia, Sri Lanka</span><span>+94 77 022 2000</span><span>&copy; Excello Developers</span></div>' +
    "</div>";

  var footer =
    '<div class="footer-wrap"><footer class="footer" id="footer">' +
    '<div class="footer__top">' +
    '<div class="footer__col"><p class="footer__tag">Elevating standards of living, one landmark at a time.</p></div>' +
    '<div class="footer__col"><h4>Navigate</h4><ul>' +
    links.map(function (l) { return '<li><a href="' + l.href + '">' + l.label + "</a></li>"; }).join("") +
    "</ul></div>" +
    '<div class="footer__col"><h4>Visit</h4><ul><li>No 16, St Rita’s Road</li><li>Mount Lavinia</li><li>Sri Lanka</li></ul></div>' +
    '<div class="footer__col"><h4>Connect</h4><ul>' +
    '<li><a href="tel:+94770222000">+94 77 022 2000</a></li>' +
    '<li><a href="mailto:info@excello.lk">info@excello.lk</a></li>' +
    '<li><a href="https://www.facebook.com/ExcelloSriLanka/" target="_blank" rel="noopener">Facebook</a></li>' +
    '<li><a href="https://lk.linkedin.com/company/excello-developers-pvt-ltd" target="_blank" rel="noopener">LinkedIn</a></li>' +
    "</ul></div>" +
    "</div>" +
    '<div class="footer__wordmark" data-wordmark>' +
    "EXCELLO".split("").map(function (c) { return "<span>" + c + "</span>"; }).join("") +
    "</div>" +
    '<div class="footer__bottom"><span>&copy; ' + new Date().getFullYear() + ' Excello Developers (Pvt) Ltd. All rights reserved.</span><span>Design &amp; Build · Architecture · Interiors · Real Estate</span></div>' +
    "</footer></div>";

  document.body.insertAdjacentHTML("afterbegin", top);
  /* The footer must land after <main>, so wait for the document to be parsed. */
  document.addEventListener("DOMContentLoaded", function () {
    document.body.insertAdjacentHTML("beforeend", footer);
  });
})();
