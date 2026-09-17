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
const COLLS = { projects: 1, insights: 1, services: 1, chatbot: 1 };

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

/* ---- Block sensitive paths, then serve the static site ------------------ */
app.use(function (req, res, next) {
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

/* ---- Public dynamic pages (before static) ------------------------------- */
app.get(["/", "/index.html"], function (req, res) {
  const cards = render.serviceCards(store.list("services", { publishedOnly: true }));
  res.type("html").send(injectPage("index.html", "<!--HOME_SERVICES-->", cards));
});
app.get(["/services", "/services.html"], function (req, res) {
  const blocks = render.serviceBlocks(store.list("services", { publishedOnly: true }));
  res.type("html").send(injectPage("services.html", "<!--SERVICES-->", blocks));
});
app.get(["/projects", "/projects.html"], function (req, res) {
  const cards = render.projectCards(store.list("projects", { publishedOnly: true }));
  res.type("html").send(injectPage("projects.html", "<!--PROJECTS-->", cards));
});
app.get(["/insights", "/insights.html"], function (req, res) {
  const slides = render.insightSlides(store.list("insights", { publishedOnly: true }));
  res.type("html").send(injectPage("insights.html", "<!--INSIGHTS-->", slides));
});
app.get("/project/:slug", function (req, res, next) {
  const p = store.getBySlug("projects", req.params.slug);
  if (!p || p.published === false) return next();
  const d = render.projectDetail(p);
  res.type("html").send(tpl("project.html", {
    TITLE: render.esc(d.title), KICKER: render.esc(d.kicker), EXCERPT: render.esc(d.excerpt),
    COVER: render.cover(d.cover, d.title), FACTS: d.facts, BODY: d.body, GALLERY: d.gallery
  }));
});
app.get("/insight/:slug", function (req, res, next) {
  const a = store.getBySlug("insights", req.params.slug);
  if (!a || a.published === false) return next();
  const d = render.insightDetail(a);
  res.type("html").send(tpl("insight.html", {
    TITLE: render.esc(d.title), KICKER: render.esc(d.kicker), EXCERPT: render.esc(d.excerpt),
    COVER: render.cover(d.cover, d.title), BODY: d.body
  }));
});

/* ---- Public API ---------------------------------------------------------- */
app.get("/api/projects", function (req, res) { res.json(store.list("projects", { publishedOnly: true })); });
app.get("/api/insights", function (req, res) { res.json(store.list("insights", { publishedOnly: true })); });
app.get("/api/services", function (req, res) { res.json(store.list("services", { publishedOnly: true })); });
app.get("/api/chatbot", function (req, res) { res.json(store.list("chatbot", { publishedOnly: true })); });

/* ---- Site settings (company details, socials, form endpoint, SEO) -------- */
const SITE = path.join(ROOT, "data", "site.json");
const SITE_KEYS = ["companyName", "tagline", "phone", "whatsapp", "whatsappText", "email",
  "addressLine1", "addressLine2", "addressLine3", "facebook", "linkedin", "instagram",
  "formEndpoint", "seoTitleSuffix", "seoDescription"];
function readSite() { try { return JSON.parse(fs.readFileSync(SITE, "utf8")) || {}; } catch (e) { return {}; } }
function writeSite(obj) {
  const tmp = SITE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, SITE);
}
app.get("/api/site", function (req, res) { res.json(readSite()); });
app.get("/api/admin/site", auth.requireAuth, function (req, res) { res.json(readSite()); });
app.put("/api/admin/site", auth.requireAuth, function (req, res) {
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
app.post("/api/enquiry", function (req, res) {
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
app.get("/api/admin/enquiries", auth.requireAuth, function (req, res) { res.json(readEnquiries()); });

/* ---- Auth --------------------------------------------------------------- */
app.post("/admin/login", function (req, res) {
  const { user, pass } = req.body || {};
  if (auth.verify(user, pass)) { req.session.user = user; return res.json({ ok: true, user: user, usesDefaultPassword: auth.usesDefaultPassword() }); }
  return res.status(401).json({ error: "Invalid username or password" });
});
app.post("/admin/logout", function (req, res) { req.session.destroy(function () { res.json({ ok: true }); }); });
app.get("/api/admin/me", auth.requireAuth, function (req, res) {
  res.json({ user: req.session.user, usesDefaultPassword: auth.usesDefaultPassword() });
});
app.post("/api/admin/password", auth.requireAuth, function (req, res) {
  const pw = (req.body || {}).password || "";
  if (pw.length < 6) return res.status(400).json({ error: "Use at least 6 characters." });
  auth.setPassword(pw); res.json({ ok: true });
});

/* ---- Admin: image upload (declared before :coll so it is not shadowed) --- */
app.post("/api/admin/upload", auth.requireAuth, upload.single("file"), function (req, res) {
  if (!req.file) return res.status(400).json({ error: "No image uploaded (jpg, png, webp, avif or gif, max 12MB)." });
  res.json({ url: "/uploads/" + req.file.filename });
});

/* ---- Admin CRUD --------------------------------------------------------- */
function coll(req, res, next) { if (COLLS[req.params.coll]) return next(); return res.status(404).json({ error: "Unknown collection" }); }
app.get("/api/admin/:coll", auth.requireAuth, coll, function (req, res) { res.json(store.list(req.params.coll)); });
app.post("/api/admin/:coll", auth.requireAuth, coll, function (req, res) { res.json(store.create(req.params.coll, req.body || {})); });
app.put("/api/admin/:coll/:id", auth.requireAuth, coll, function (req, res) {
  const item = store.update(req.params.coll, req.params.id, req.body || {});
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(item);
});
app.delete("/api/admin/:coll/:id", auth.requireAuth, coll, function (req, res) {
  res.json({ ok: store.remove(req.params.coll, req.params.id) });
});
app.post("/api/admin/:coll/reorder", auth.requireAuth, coll, function (req, res) {
  res.json(store.reorder(req.params.coll, (req.body || {}).ids || []));
});

/* ---- Admin app + static site -------------------------------------------- */
app.get("/admin", function (req, res) { res.sendFile(path.join(ROOT, "admin", "index.html")); });
app.use("/uploads", express.static(UPLOADS, { maxAge: "7d" }));
app.use(express.static(ROOT, { extensions: ["html"], maxAge: "1h" }));

app.listen(PORT, function () {
  console.log("Excello site + admin running on http://localhost:" + PORT);
  if (auth.usesDefaultPassword()) console.log("  Admin: /admin  (user: " + auth.currentUser() + ", default password 'excello-admin' — change it in the panel)");
});
