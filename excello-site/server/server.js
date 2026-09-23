const express = require("express");
const session = require("express-session");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const store = require("./store");
const auth = require("./auth");
const render = require("./render");

const ROOT = path.join(__dirname, "..");
const UPLOADS = path.join(ROOT, "uploads");
const TPL = path.join(__dirname, "templates");
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });

const app = express();
const PORT = process.env.PORT || 3000;
const COLLS = { projects: 1, insights: 1, services: 1, chatbot: 1, units: 1, projecttypes: 1, finishes: 1, materials: 1, rooms: 1 };

/* Base path so the whole app can run under a sub-folder (e.g. served at
   rapidsolutions.live/excello-site). Set BASE_PATH=excello-site to enable it;
   leave it unset to serve at the domain root. render.js reads it too. */
const BASE = render.BASE; // "" or "/excello-site"

/* Force every URL under a sub-path prefix even when the host mounts the app at
   the domain root. Set FORCE_PREFIX=excello-site (an environment variable in
   the cPanel Node app) to turn it on. Any top-level GET/HEAD request whose path
   isn't already under the prefix is 302-redirected to the prefixed URL, so the
   browser always shows rapidsolutions.live/excello-site/... — home, every page,
   and /admin included. The auto-strip middleware below peels the prefix back
   off for routing, so nothing else needs to change. Unset it (or clear it) to
   serve at the domain root again — e.g. once the app moves to its own domain. */
const FORCE_PREFIX = (process.env.FORCE_PREFIX || "").replace(/^\/+|\/+$/g, "");
if (FORCE_PREFIX) {
  const FP = "/" + FORCE_PREFIX;
  app.use(function (req, res, next) {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    const qi = req.url.indexOf("?");
    const pth = qi >= 0 ? req.url.slice(0, qi) : req.url;
    if (pth === FP || pth.indexOf(FP + "/") === 0) return next(); // already prefixed — avoid a loop
    return res.redirect(302, FP + (req.url === "/" ? "/" : req.url));
  });
}

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  name: "excello.sid",
  secret: process.env.SESSION_SECRET || crypto.randomBytes(24).toString("hex"),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", maxAge: 1000 * 60 * 60 * 8 }
}));

/* ---- Uploads (images only) ---------------------------------------------- */
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, UPLOADS); },
  filename: function (req, file, cb) {
    const ext = (path.extname(file.originalname) || ".jpg").toLowerCase().replace(/[^.a-z0-9]/g, "");
    cb(null, Date.now().toString(36) + "-" + crypto.randomBytes(4).toString("hex") + ext);
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    cb(null, /^image\/(jpe?g|png|webp|avif|gif)$/.test(file.mimetype));
  }
});

/* Everything hangs off this router, which is mounted at BASE (or root). */
const r = express.Router();

/* Inject a <base> tag that is computed IN THE BROWSER from the real URL, so
   every relative link/asset/fetch resolves correctly no matter what sub-path
   the host serves the app under (Passenger mount, nested folder, root — all
   work). `logical` is this page's path inside the app (e.g. "/", "/about.html",
   "/project/slug"); the script strips that suffix off location.pathname to find
   the true base. Falls back gracefully if anything is unexpected. */
function withBase(html, logical) {
  const lp = logical || "/";
  const s = '<script>(function(){try{' +
    'var lp=' + JSON.stringify(lp) + ',p=location.pathname;' +
    'function t(s){return s.length>1?s.replace(/\\/+$/,""):s;}' +
    'var P=t(p),L=t(lp),base;' +
    'if(L==="/"){base=(!P||P==="/")?"/":P+"/";}' +
    'else if(P.length>=L.length&&P.slice(-L.length)===L){base=P.slice(0,P.length-L.length)+"/";}' +
    'else{base=p.replace(/[^\\/]*$/,"");}' +
    'if(!base)base="/";' +
    'document.write(\'<base href="\'+base+\'">\');' +
    '}catch(e){document.write(\'<base href="./">\');}})();</script>';
  return String(html).replace(/<head([^>]*)>/i, '<head$1>' + s);
}
/* Per-page hero images are editable in the admin. Pages carry a {{HERO_X}}
   token; we swap in the configured image. No hardcoded defaults — a page shows
   a hero image only once one is set in the admin (Site details). */
const HERO_DEFAULTS = {};
function applyHeroImages(html) {
  if (html.indexOf("{{HERO_") === -1) return html;
  const site = readSite();
  return html.replace(/\{\{HERO_([A-Z]+)\}\}/g, function (_, name) {
    const key = "hero" + name.charAt(0) + name.slice(1).toLowerCase();
    return render.esc(site[key] || HERO_DEFAULTS[name] || "");
  });
}
function sendPage(res, html, req) { res.type("html").send(withBase(applyHeroImages(html), req && req.path)); }

/* ---- Block sensitive paths --------------------------------------------- */
r.use(function (req, res, next) {
  if (/^\/(server|data|node_modules)(\/|$)/.test(req.path) ||
      req.path === "/package.json" || req.path === "/package-lock.json" ||
      req.path.indexOf("/.") !== -1) return res.status(404).end();
  next();
});

function tpl(name, tokens) {
  let html = fs.readFileSync(path.join(TPL, name), "utf8");
  Object.keys(tokens).forEach(function (k) { html = html.split("{{" + k + "}}").join(tokens[k]); });
  return html;
}
function injectPage(file, marker, html) {
  const src = fs.readFileSync(path.join(ROOT, file), "utf8");
  return src.replace(marker, html);
}
/* Serve a static page file through sendPage (so <base> + hero images inject). */
function servePage(file) {
  return function (req, res, next) {
    fs.readFile(path.join(ROOT, file), "utf8", function (err, html) {
      if (err) return next();
      sendPage(res, html, req);
    });
  };
}

/* ---- Public dynamic pages (before static) ------------------------------- */
r.get(["/", "/index.html"], function (req, res) {
  const site = readSite();
  const projects = store.list("projects", { publishedOnly: true });
  const bySlug = function (slug) { return projects.filter(function (p) { return p.slug === slug; })[0]; };
  const cards = render.serviceCards(store.list("services", { publishedOnly: true }));
  let html = injectPage("index.html", "<!--HOME_SERVICES-->", cards);
  /* Horizontal "selected projects" scroller — first six published projects. */
  html = html.replace("<!--HOME_HSCROLL-->", render.hscrollPanels(projects.slice(0, 6)));
  /* Highlighted project (falls back to the first project). */
  const feat = bySlug(site.homeFeatured) || projects[0];
  html = html.replace("<!--HOME_FEATURED-->", render.homeFeatured(feat, site.homeFeaturedImage));
  /* Two selected-work projects (fall back to the next projects). */
  const selA = bySlug(site.homeSelectedA) || projects[1] || projects[0];
  const selB = bySlug(site.homeSelectedB) || projects[2] || projects[1] || projects[0];
  html = html.replace("<!--HOME_SELECTED-->", render.homeSelected([
    { p: selA, img: site.homeSelectedImageA }, { p: selB, img: site.homeSelectedImageB }
  ]));
  sendPage(res, html, req);
});
r.get(["/services", "/services.html"], function (req, res) {
  const blocks = render.serviceBlocks(store.list("services", { publishedOnly: true }));
  sendPage(res, injectPage("services.html", "<!--SERVICES-->", blocks), req);
});
r.get(["/projects", "/projects.html"], function (req, res) {
  const cards = render.projectCards(store.list("projects", { publishedOnly: true }));
  sendPage(res, injectPage("projects.html", "<!--PROJECTS-->", cards), req);
});
r.get(["/insights", "/insights.html"], function (req, res) {
  const slides = render.insightSlides(store.list("insights", { publishedOnly: true }));
  sendPage(res, injectPage("insights.html", "<!--INSIGHTS-->", slides), req);
});
/* Clean URLs for the static pages (also served with the .html alias). */
r.get(["/about", "/about.html"], servePage("about.html"));
r.get(["/contact", "/contact.html"], servePage("contact.html"));
/* Unit availability + cost calculator: data-driven pages that render client-side
   from /api/units and /api/rates, so the shells are served like the other pages
   (the <base> tag + hero-image injection apply). */
r.get(["/availability", "/availability.html"], servePage("availability.html"));
r.get(["/calculator", "/calculator.html"], servePage("calculator.html"));
r.get("/project/:slug", function (req, res, next) {
  const p = store.getBySlug("projects", req.params.slug);
  if (!p || p.published === false) return next();
  const d = render.projectDetail(p);
  sendPage(res, tpl("project.html", {
    TITLE: render.esc(d.title), KICKER: render.esc(d.kicker), EXCERPT: render.esc(d.excerpt),
    COVER: render.cover(d.cover, d.title), FACTS: d.facts, BODY: d.body, GALLERY: d.gallery
  }), req);
});
r.get("/insight/:slug", function (req, res, next) {
  const a = store.getBySlug("insights", req.params.slug);
  if (!a || a.published === false) return next();
  const d = render.insightDetail(a);
  sendPage(res, tpl("insight.html", {
    TITLE: render.esc(d.title), KICKER: render.esc(d.kicker), EXCERPT: render.esc(d.excerpt),
    COVER: render.cover(d.cover, d.title), BODY: d.body
  }), req);
});

/* ---- Public API ---------------------------------------------------------- */
r.get("/api/projects", function (req, res) { res.json(store.list("projects", { publishedOnly: true })); });
r.get("/api/insights", function (req, res) { res.json(store.list("insights", { publishedOnly: true })); });
r.get("/api/services", function (req, res) { res.json(store.list("services", { publishedOnly: true })); });
r.get("/api/chatbot", function (req, res) { res.json(store.list("chatbot", { publishedOnly: true })); });
r.get("/api/units", function (req, res) { res.json(store.list("units", { publishedOnly: true })); });
r.get("/api/projecttypes", function (req, res) { res.json(store.list("projecttypes", { publishedOnly: true })); });
r.get("/api/finishes", function (req, res) { res.json(store.list("finishes", { publishedOnly: true })); });
r.get("/api/materials", function (req, res) { res.json(store.list("materials", { publishedOnly: true })); });
r.get("/api/rooms", function (req, res) { res.json(store.list("rooms", { publishedOnly: true })); });

/* ---- Site settings (company details, socials, form endpoint, SEO) -------- */
const SITE = path.join(ROOT, "data", "site.json");
const SITE_KEYS = ["companyName", "tagline", "phone", "whatsapp", "whatsappText", "email",
  "addressLine1", "addressLine2", "addressLine3", "facebook", "linkedin", "instagram",
  "formEndpoint", "seoTitleSuffix", "seoDescription",
  /* Home page: highlighted project + two selected-work projects (slugs) with
     optional image overrides; and each page's hero image. */
  "homeFeatured", "homeFeaturedImage", "homeSelectedA", "homeSelectedImageA",
  "homeSelectedB", "homeSelectedImageB",
  "heroAbout", "heroServices", "heroProjects", "heroContact",
  /* Aathavan unit-availability page (all copy + the standard price/sq.ft). */
  "heroAvailability", "availabilityProject", "availabilityLocation",
  "availabilityHeading", "availabilityIntro", "availabilityNote",
  "aathavanPricePerSqFt", "availabilityDisclaimer",
  "availabilityPay1", "availabilityPay2", "availabilityPay3",
  "availabilityCtaTitle", "availabilityCtaLead", "availabilityCtaText",
  /* Construction cost calculator (copy + global, configurable factors). */
  "heroCalculator", "calcHeading", "calcIntro", "calcCurrency", "calcRangePct",
  "calcLandUnit", "calcCoverage", "calcProfFeesPct", "calcContingencyPct",
  "calcAreaNote", "calcDisclaimer",
  "calcSplitSubstructure", "calcSplitStructure", "calcSplitRoof", "calcSplitFinishes", "calcSplitMEP",
  "calcSavingsMin", "calcSavingsMax", "calcSavingsText"];
function readSite() { try { return JSON.parse(fs.readFileSync(SITE, "utf8")) || {}; } catch (e) { return {}; } }
function writeSite(obj) {
  const tmp = SITE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, SITE);
}
r.get("/api/site", function (req, res) { res.json(readSite()); });
r.get("/api/admin/site", auth.requireAuth, function (req, res) { res.json(readSite()); });
r.put("/api/admin/site", auth.requireAuth, function (req, res) {
  const cur = readSite(), body = req.body || {};
  SITE_KEYS.forEach(function (k) { if (typeof body[k] === "string") cur[k] = body[k].slice(0, 2000); });
  writeSite(cur);
  res.json(cur);
});

/* ---- Contact form: capture enquiries to data/enquiries.json -------------- */
const ENQUIRIES = path.join(ROOT, "data", "enquiries.json");
function readEnquiries() {
  try { return JSON.parse(fs.readFileSync(ENQUIRIES, "utf8")); } catch (e) { return []; }
}
function clip(v, max) { return String(v == null ? "" : v).slice(0, max).trim(); }
r.post("/api/enquiry", function (req, res) {
  const b = req.body || {};
  const name = clip(b.name, 120), email = clip(b.email, 160), message = clip(b.message, 4000);
  if (!name || !email || !message) return res.status(400).json({ error: "Please add your name, email and a message." });
  const list = readEnquiries();
  list.unshift({
    id: Date.now().toString(36) + crypto.randomBytes(3).toString("hex"),
    at: new Date().toISOString(),
    name: name, email: email, phone: clip(b.phone, 60),
    service: clip(b.service, 120), message: message
  });
  const tmp = ENQUIRIES + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(list.slice(0, 500), null, 2));
  fs.renameSync(tmp, ENQUIRIES); /* atomic write */
  res.json({ ok: true });
});
r.get("/api/admin/enquiries", auth.requireAuth, function (req, res) { res.json(readEnquiries()); });

/* ---- Calculator: capture estimate leads to data/estimates.json ----------- */
const ESTIMATES = path.join(ROOT, "data", "estimates.json");
function readEstimates() { try { return JSON.parse(fs.readFileSync(ESTIMATES, "utf8")); } catch (e) { return []; } }
r.post("/api/estimate", function (req, res) {
  const b = req.body || {};
  const name = clip(b.name, 120), email = clip(b.email, 160), phone = clip(b.phone, 60);
  if (!name || !phone || !email) return res.status(400).json({ error: "Please add your name, contact number and email." });
  const list = readEstimates();
  list.unshift({
    id: Date.now().toString(36) + crypto.randomBytes(3).toString("hex"),
    at: new Date().toISOString(),
    name: name, email: email, phone: phone, location: clip(b.location, 160),
    projectType: clip(b.projectType, 120), finish: clip(b.finish, 120),
    area: clip(b.area, 40), total: clip(b.total, 60),
    summary: clip(b.summary, 4000)
  });
  const tmp = ESTIMATES + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(list.slice(0, 500), null, 2));
  fs.renameSync(tmp, ESTIMATES);
  res.json({ ok: true });
});
r.get("/api/admin/estimates", auth.requireAuth, function (req, res) { res.json(readEstimates()); });

/* ---- Auth --------------------------------------------------------------- */
r.post("/admin/login", function (req, res) {
  const { user, pass } = req.body || {};
  if (auth.verify(user, pass)) { req.session.user = user; return res.json({ ok: true, user: user, usesDefaultPassword: auth.usesDefaultPassword() }); }
  return res.status(401).json({ error: "Invalid username or password" });
});
r.post("/admin/logout", function (req, res) { req.session.destroy(function () { res.json({ ok: true }); }); });
r.get("/api/admin/me", auth.requireAuth, function (req, res) {
  res.json({ user: req.session.user, usesDefaultPassword: auth.usesDefaultPassword() });
});
r.post("/api/admin/password", auth.requireAuth, function (req, res) {
  const pw = (req.body || {}).password || "";
  if (pw.length < 6) return res.status(400).json({ error: "Use at least 6 characters." });
  auth.setPassword(pw); res.json({ ok: true });
});

/* ---- Admin: image upload (declared before :coll so it is not shadowed) --- */
r.post("/api/admin/upload", auth.requireAuth, upload.single("file"), function (req, res) {
  if (!req.file) return res.status(400).json({ error: "No image uploaded (jpg, png, webp, avif or gif, max 12MB)." });
  /* Relative so it resolves under BASE (via <base>) on every page. */
  res.json({ url: "uploads/" + req.file.filename });
});

/* ---- Admin CRUD --------------------------------------------------------- */
function coll(req, res, next) { if (COLLS[req.params.coll]) return next(); return res.status(404).json({ error: "Unknown collection" }); }
r.get("/api/admin/:coll", auth.requireAuth, coll, function (req, res) { res.json(store.list(req.params.coll)); });
r.post("/api/admin/:coll", auth.requireAuth, coll, function (req, res) { res.json(store.create(req.params.coll, req.body || {})); });
r.put("/api/admin/:coll/:id", auth.requireAuth, coll, function (req, res) {
  const item = store.update(req.params.coll, req.params.id, req.body || {});
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(item);
});
r.delete("/api/admin/:coll/:id", auth.requireAuth, coll, function (req, res) {
  res.json({ ok: store.remove(req.params.coll, req.params.id) });
});
r.post("/api/admin/:coll/reorder", auth.requireAuth, coll, function (req, res) {
  res.json(store.reorder(req.params.coll, (req.body || {}).ids || []));
});

/* ---- Admin app + static site -------------------------------------------- */
r.get("/admin", function (req, res) {
  sendPage(res, fs.readFileSync(path.join(ROOT, "admin", "index.html"), "utf8"), req);
});
r.use("/uploads", express.static(UPLOADS, { maxAge: "7d" }));
/* Static HTML pages need the <base> tag injected, so handle them before the
   generic static middleware (which streams files unchanged). */
r.get(/\.html$/, function (req, res, next) {
  const file = path.join(ROOT, req.path.replace(/^\/+/, ""));
  if (file.indexOf(ROOT) !== 0) return res.status(404).end();
  fs.readFile(file, "utf8", function (err, html) {
    if (err) return next();
    sendPage(res, html, req);
  });
});
/* maxAge 0 + etag: browsers revalidate every load, so edits and redeploys show
   immediately (a 304 is returned when a file is unchanged, so it stays fast). */
r.use(express.static(ROOT, { extensions: ["html"], etag: true, maxAge: 0 }));

/* Strip the mount prefix before routing. Passenger (and a nested app folder)
   can prepend the base one or more times, so requests may arrive as
   /excello-site/... or even /excello-site/excello-site/... . We collapse any
   number of leading BASE segments down to the app-relative path, so every
   route and static file matches regardless of how the host mounts us.
   When BASE is unset the app serves at the domain root exactly as before. */
if (BASE) {
  app.use(function (req, res, next) {
    const qi = req.url.indexOf("?");
    let pth = qi >= 0 ? req.url.slice(0, qi) : req.url;
    const q = qi >= 0 ? req.url.slice(qi) : "";
    while (pth === BASE || pth.indexOf(BASE + "/") === 0) pth = pth.slice(BASE.length) || "/";
    req.url = pth + q;
    next();
  });
}

/* Auto-detect and peel any sub-folder mount prefix the host didn't strip (e.g.
   "/excello-site" or a doubled "/excello-site/excello-site"). Any leading path
   segment that is NOT one of the app's real routes is removed when what follows
   IS a real route — so the app works at the domain root OR under any sub-folder
   with no BASE_PATH configuration. */
const KNOWN_FIRST = {
  "": 1, "index.html": 1, "about": 1, "about.html": 1, "services": 1, "services.html": 1,
  "projects": 1, "projects.html": 1, "insights": 1, "insights.html": 1, "contact": 1,
  "contact.html": 1, "availability": 1, "availability.html": 1, "calculator": 1,
  "calculator.html": 1, "project": 1, "insight": 1, "admin": 1, "api": 1, "js": 1, "css": 1,
  "img": 1, "uploads": 1, "favicon.ico": 1, "favicon.svg": 1, "robots.txt": 1, "sitemap.xml": 1,
  "apple-touch-icon.png": 1
};
function firstSeg(p) { const m = /^\/([^\/?#]*)/.exec(p); return m ? m[1] : ""; }
function isKnown(seg) { return Object.prototype.hasOwnProperty.call(KNOWN_FIRST, seg) || /\.[a-z0-9]+$/i.test(seg); }
app.use(function (req, res, next) {
  let guard = 0;
  while (guard++ < 6) {
    const qi = req.url.indexOf("?");
    const pth = qi >= 0 ? req.url.slice(0, qi) : req.url;
    const qs = qi >= 0 ? req.url.slice(qi) : "";
    const m = /^\/([^\/]+)(\/.*)?$/.exec(pth);
    if (!m) break;                            // "/" (root) — nothing to peel
    const first = m[1], rest = m[2];
    if (isKnown(first)) break;                // already at a real route
    if (rest === undefined) break;            // bare "/prefix" with no remainder — 404
    req.url = rest + qs;                       // peel this unknown mount segment and retry
  }
  next();
});
app.use("/", r);

app.listen(PORT, function () {
  console.log("Excello site + admin running on http://localhost:" + PORT + (BASE || "") + "/");
  if (auth.usesDefaultPassword()) console.log("  Admin: " + (BASE || "") + "/admin  (user: " + auth.currentUser() + ", default password 'excello-admin' — change it in the panel)");
});
