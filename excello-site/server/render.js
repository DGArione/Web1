/* Server-side HTML fragment builders (all user content is escaped). */
/* Base path (e.g. "/excello-site") when the app runs under a sub-folder; "" at
   the domain root. Links below are emitted relative so the page <base> resolves
   them, so this is exported mainly for the server to mount + inject <base>. */
const BASE = process.env.BASE_PATH ? "/" + String(process.env.BASE_PATH).replace(/^\/+|\/+$/g, "") : "";
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function pad2(n) { return (n < 10 ? "0" : "") + n; }
function bodyHtml(text) {
  const blocks = String(text || "").split(/\n{2,}/).map(function (b) {
    return "<p>" + esc(b.trim()).replace(/\n/g, "<br>") + "</p>";
  });
  return blocks.join("\n");
}
/* Body may be rich HTML (from the CMS export) or plain text. Owner-authored
   content is trusted, so pass HTML through as-is; otherwise wrap plain text into
   paragraphs. Detected by the presence of a block/inline tag. */
function richBody(text) {
  const s = String(text == null ? "" : text);
  if (/<\/?(p|h[1-6]|ul|ol|li|table|thead|tbody|tr|td|th|figure|blockquote|br|a|strong|em|img)\b/i.test(s)) return s;
  return bodyHtml(s);
}
function cover(url, alt, cls) {
  cls = cls || "";
  if (url) return '<img src="' + esc(url) + '" alt="' + esc(alt) + '"' + (cls ? ' class="' + cls + '"' : "") + '>';
  return '<div class="ph ' + cls + '" aria-hidden="true"></div>';
}

/* ---- Projects gallery ---------------------------------------------------- */
const CARD_PATTERN = ["card--7", "card--5 card--push", "card--5", "card--7 card--push", "card--4", "card--4 card--push", "card--4"];
function projectCards(list) {
  if (!list.length) return '<p class="body body--muted">No projects yet. Add them in the admin panel.</p>';
  return list.map(function (p, i) {
    const size = CARD_PATTERN[i % CARD_PATTERN.length];
    const ratio = size.indexOf("card--7") === 0 || size.indexOf("card--8") === 0 ? "media--ratio-landscape" : "media--ratio-portrait";
    const tag = [p.category, p.location].filter(Boolean).map(esc).join(" · ");
    const excerpt = p.excerpt ? '<p class="body body--muted" style="font-size:13px;">' + esc(p.excerpt) + "</p>" : "";
    return '' +
      '<a class="card ' + size + '" href="project/' + esc(p.slug) + '" data-cursor="view">' +
        '<div class="media media--parallax media--clip ' + ratio + '" data-parallax="8">' + cover(p.cover, p.title) + "</div>" +
        '<div class="card__meta"><span class="card__title">' + esc(p.title) + '</span><span class="card__tag">' + tag + "</span></div>" +
        excerpt +
      "</a>";
  }).join("\n");
}

/* ---- Home: horizontal "selected projects" scroller ---------------------- */
function hscrollPanels(list) {
  if (!list.length) return "";
  return list.map(function (p) {
    var loc = [p.location, p.category].filter(Boolean).map(esc).join(" · ");
    return '' +
      '<a class="panel" href="project/' + esc(p.slug) + '" data-cursor="view">' +
        '<div class="media">' + cover(p.cover, p.title) + "</div>" +
        '<div class="panel__meta"><span class="panel__title">' + esc(p.title) + '</span><span class="panel__loc">' + loc + "</span></div>" +
      "</a>";
  }).join("\n");
}

/* ---- Insights: theater slider ------------------------------------------- */
function insightSlides(list) {
  if (!list.length) return '<div class="theater__empty"><p class="body">No insights yet. Add them in the admin panel.</p></div>';
  const slides = list.map(function (a, i) {
    const date = a.date ? esc(a.date) : "";
    const meta = [pad2(i + 1) + " / " + pad2(list.length), a.category, date].filter(Boolean).map(esc).join("&nbsp;&nbsp;·&nbsp;&nbsp;");
    return '' +
      '<article class="tslide" data-i="' + i + '">' +
        '<div class="tslide__bg">' + cover(a.cover, a.title) + "</div>" +
        '<div class="tslide__scrim"></div>' +
        '<div class="tslide__inner container">' +
          '<p class="tslide__meta label">' + meta + "</p>" +
          '<h2 class="tslide__title h-display">' + esc(a.title) + "</h2>" +
          (a.excerpt ? '<p class="tslide__excerpt">' + esc(a.excerpt) + "</p>" : "") +
          '<a class="btn btn--solid" href="insight/' + esc(a.slug) + '" data-magnetic>Read insight <svg class="arrow" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M1 13 13 1M4 1h9v9"/></svg></a>' +
        "</div>" +
      "</article>";
  }).join("\n");
  const thumbs = list.map(function (a, i) {
    return '<button class="tdot" data-goto="' + i + '" aria-label="' + esc(a.title) + '"><span>' + pad2(i + 1) + "</span><em>" + esc(a.title) + "</em></button>";
  }).join("\n");
  return '' +
    '<div class="theater" id="theater">' +
      '<div class="theater__stage">' + slides + "</div>" +
      '<div class="theater__ui container">' +
        '<button class="theater__arrow" data-prev aria-label="Previous"><svg viewBox="0 0 24 14" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M23 7H1M7 1 1 7l6 6"/></svg></button>' +
        '<div class="theater__count"><span id="tnow">01</span><i></i><span id="ttotal">' + pad2(list.length) + "</span></div>" +
        '<button class="theater__arrow" data-next aria-label="Next"><svg viewBox="0 0 24 14" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M1 7h22M17 1l6 6-6 6"/></svg></button>' +
      "</div>" +
      '<div class="theater__thumbs">' + thumbs + "</div>" +
      '<div class="theater__progress"><i id="tbar"></i></div>' +
    "</div>";
}

/* ---- Services ------------------------------------------------------------ */
var ARROW = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M1 13 13 1M4 1h9v9"/></svg>';
/* Home page: the compact service cards. */
function serviceCards(list) {
  if (!list.length) return '<p class="body body--muted">No services yet. Add them in the admin panel.</p>';
  return list.map(function (s, i) {
    return '' +
      '<a class="service" href="services#' + esc(s.slug) + '">' +
        '<span class="service__num">' + pad2(i + 1) + "</span>" +
        '<span class="service__title">' + esc(s.title) + "</span>" +
        '<span class="service__desc">' + esc(s.card || s.tagline || "") + "</span>" +
        '<span class="service__arrow">' + ARROW + "</span>" +
      "</a>";
  }).join("\n");
}
/* Services page: the full alternating detail blocks. */
function serviceBlocks(list) {
  if (!list.length) return '<p class="body body--muted">No services yet. Add them in the admin panel.</p>';
  return list.map(function (s, i) {
    var rows = [
      ["For", s.forWho], ["Scope", s.scope], ["Deliverables", s.deliverables],
      ["Lead", s.lead], ["Connected to", s.connected], ["Projects", s.projects]
    ].filter(function (r) { return r[1]; }).map(function (r) {
      return "<li><span>" + esc(r[0]) + "</span><span>" + esc(r[1]) + "</span></li>";
    }).join("");
    var h2 = "";
    if (s.headline) {
      var h = esc(s.headline);
      if (s.headlineEm) {
        var e = esc(s.headlineEm), idx = h.indexOf(e);
        if (idx >= 0) h = h.slice(0, idx) + "<em>" + e + "</em>" + h.slice(idx + e.length);
      }
      h2 = '<h2 class="h-1" data-split style="margin-top: 18px;">' + h + "</h2>";
    }
    return '' +
      '<div class="svc" id="' + esc(s.slug) + '">' +
        '<div class="svc__media media media--parallax media--clip media--ratio-portrait" data-parallax="8">' +
          cover(s.cover, s.title) +
        "</div>" +
        "<div>" +
          '<p class="label" data-reveal><span class="num">' + pad2(i + 1) + "</span>" + esc(s.title) + "</p>" +
          h2 +
          '<p class="body body--muted" data-reveal style="margin-top: 26px;">' + esc(s.tagline || "") + "</p>" +
          '<ul class="svc__list" data-reveal>' + rows + "</ul>" +
        "</div>" +
      "</div>";
  }).join("\n");
}

/* ---- Home page: highlighted project + selected work (admin-driven) ------- */
function homeFeatured(p, img) {
  if (!p) return "";
  var src = img || p.cover;
  var kicker = [p.category, p.location].filter(Boolean).map(esc).join(" · ");
  return '' +
    '<section class="section container" data-theme="dark">' +
      '<div class="spotlight">' +
        '<div class="media media--parallax media--clip media--ratio-portrait" data-parallax="10">' +
          cover(src, p.title) +
          (kicker ? '<span class="media__caption">' + kicker + "</span>" : "") +
        "</div>" +
        "<div>" +
          '<p class="label" data-reveal><span class="num">(02)</span>Featured project</p>' +
          '<h2 class="h-1" data-split style="margin-top: 18px;">' + esc(p.title) + "</h2>" +
          (p.excerpt ? '<p class="body" data-reveal style="margin-top: 28px;">' + esc(p.excerpt) + "</p>" : "") +
          '<div style="margin-top: 40px;" data-reveal>' +
            '<a class="btn" href="project/' + esc(p.slug) + '" data-magnetic>View the project ' + ARROW + "</a>" +
          "</div>" +
        "</div>" +
      "</div>" +
    "</section>";
}
function homeSelected(items) {
  items = (items || []).filter(function (it) { return it && it.p; });
  if (!items.length) return "";
  var media = items.map(function (it, i) {
    var src = it.img || it.p.cover;
    var cap = [it.p.title, it.p.location].filter(Boolean).map(esc).join(" · ");
    return '' +
      '<div class="media media--parallax media--clip" data-parallax="' + (i === 0 ? 8 : 12) + '">' +
        cover(src, it.p.title) +
        '<span class="media__caption">' + cap + "</span>" +
      "</div>";
  }).join("\n");
  return '' +
    '<section class="container">' +
      '<div class="duo">' +
        '<div class="duo__lead">' +
          '<p class="lede" data-reveal>From coastal villas and urban residences to café interiors and wellness retreats, our projects are places shaped by a clear idea, and a considered response to place, climate and daily life.</p>' +
          '<a class="link" href="projects" data-reveal>Selected work</a>' +
        "</div>" +
        media +
      "</div>" +
    "</section>";
}

/* ---- Detail bodies ------------------------------------------------------- */
function projectDetail(p) {
  const facts = [
    ["Category", p.category], ["Location", p.location], ["Year", p.year], ["Status", p.status], ["Services", p.services]
  ].filter(function (f) { return f[1]; }).map(function (f) {
    return '<div class="fact"><p class="label">' + esc(f[0]) + '</p><p class="fact__v">' + esc(f[1]) + "</p></div>";
  }).join("");
  const gallery = (p.gallery || []).map(function (u) {
    return '<div class="media media--parallax media--clip media--ratio-landscape" data-parallax="8">' + cover(u, p.title) + "</div>";
  }).join("\n");
  return { title: p.title, cover: p.cover, kicker: [p.category, p.location].filter(Boolean).join(" · "),
    facts: facts, body: richBody(p.body), gallery: gallery, excerpt: p.excerpt || "" };
}
function insightDetail(a) {
  return { title: a.title, cover: a.cover, kicker: [a.category, a.date].filter(Boolean).join(" · "),
    body: richBody(a.body), excerpt: a.excerpt || "" };
}

module.exports = { BASE, esc, projectCards, hscrollPanels, insightSlides, serviceCards, serviceBlocks, homeFeatured, homeSelected, projectDetail, insightDetail, bodyHtml, cover };
