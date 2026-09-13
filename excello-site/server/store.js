/* Tiny JSON-file data store — no native deps, atomic writes. */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "..", "data");
const FILES = {
  projects: path.join(DATA_DIR, "projects.json"),
  insights: path.join(DATA_DIR, "insights.json")
};

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  for (const f of Object.values(FILES)) if (!fs.existsSync(f)) fs.writeFileSync(f, "[]");
}
ensure();

function read(coll) {
  try { return JSON.parse(fs.readFileSync(FILES[coll], "utf8")) || []; }
  catch (e) { return []; }
}
function write(coll, arr) {
  const tmp = FILES[coll] + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(arr, null, 2));
  fs.renameSync(tmp, FILES[coll]);
}

function slugify(s) {
  return String(s || "").toLowerCase().trim()
    .replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80) || "item";
}
function uniqueSlug(coll, base, ignoreId) {
  const items = read(coll);
  let slug = slugify(base), n = 1;
  while (items.some(function (x) { return x.slug === slug && x.id !== ignoreId; })) slug = slugify(base) + "-" + (++n);
  return slug;
}

function list(coll, opts) {
  opts = opts || {};
  let items = read(coll).slice();
  if (opts.publishedOnly) items = items.filter(function (x) { return x.published !== false; });
  items.sort(function (a, b) { return (a.order || 0) - (b.order || 0) || (b.createdAt || 0) - (a.createdAt || 0); });
  return items;
}
function get(coll, id) { return read(coll).find(function (x) { return x.id === id; }) || null; }
function getBySlug(coll, slug) { return read(coll).find(function (x) { return x.slug === slug; }) || null; }

function create(coll, data) {
  const items = read(coll);
  const now = Date.now();
  const item = Object.assign({}, data, {
    id: crypto.randomUUID(),
    slug: uniqueSlug(coll, data.slug || data.title, null),
    order: typeof data.order === "number" ? data.order : items.length,
    createdAt: now,
    updatedAt: now
  });
  items.push(item);
  write(coll, items);
  return item;
}
function update(coll, id, data) {
  const items = read(coll);
  const i = items.findIndex(function (x) { return x.id === id; });
  if (i < 0) return null;
  const merged = Object.assign({}, items[i], data, { id: id, updatedAt: Date.now() });
  if (data.title && !data.slug) merged.slug = uniqueSlug(coll, data.title, id);
  if (data.slug) merged.slug = uniqueSlug(coll, data.slug, id);
  items[i] = merged;
  write(coll, items);
  return merged;
}
function remove(coll, id) {
  const items = read(coll);
  const next = items.filter(function (x) { return x.id !== id; });
  write(coll, next);
  return next.length !== items.length;
}
function reorder(coll, ids) {
  const items = read(coll);
  ids.forEach(function (id, idx) { const it = items.find(function (x) { return x.id === id; }); if (it) it.order = idx; });
  write(coll, items);
  return list(coll);
}

module.exports = { list, get, getBySlug, create, update, remove, reorder, slugify, DATA_DIR };
