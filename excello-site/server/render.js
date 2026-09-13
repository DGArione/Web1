/* Server-side HTML fragment builders (all user content is escaped). */
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
      '<a class="card ' + size + '" href="/project/' + esc(p.slug) + '" data-cursor="view">' +
        '<div class="media media--parallax media--clip ' + ratio + '" data-parallax="8">' + cover(p.cover, p.title) + "</div>" +
        '<div class="card__meta"><span class="card__title">' + esc(p.title) + '</span><span class="card__tag">' + tag + "</span></div>" +
        excerpt +
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
          '<a class="btn btn--solid" href="/insight/' + esc(a.slug) + '" data-magnetic>Read insight <svg class="arrow" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M1 13 13 1M4 1h9v9"/></svg></a>' +
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

/* ---- Detail bodies ------------------------------------------------------- */
function projectDetail(p) {
  const facts = [
    ["Category", p.category], ["Location", p.location], ["Year", p.year], ["Status", p.status]
  ].filter(function (f) { return f[1]; }).map(function (f) {
    return '<div class="fact"><p class="label">' + esc(f[0]) + '</p><p class="fact__v">' + esc(f[1]) + "</p></div>";
  }).join("");
  const gallery = (p.gallery || []).map(function (u) {
    return '<div class="media media--parallax media--clip media--ratio-landscape" data-parallax="8">' + cover(u, p.title) + "</div>";
  }).join("\n");
  return { title: p.title, cover: p.cover, kicker: [p.category, p.location].filter(Boolean).join(" · "),
    facts: facts, body: bodyHtml(p.body), gallery: gallery, excerpt: p.excerpt || "" };
}
function insightDetail(a) {
  return { title: a.title, cover: a.cover, kicker: [a.category, a.date].filter(Boolean).join(" · "),
    body: bodyHtml(a.body), excerpt: a.excerpt || "" };
}

module.exports = { esc, projectCards, insightSlides, projectDetail, insightDetail, bodyHtml, cover };
