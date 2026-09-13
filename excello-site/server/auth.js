/* Minimal auth: scrypt password hash stored in data/settings.json. */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { DATA_DIR } = require("./store");

const SETTINGS = path.join(DATA_DIR, "settings.json");
const DEFAULT_USER = process.env.ADMIN_USER || "admin";
const DEFAULT_PASS = process.env.ADMIN_PASSWORD || "excello-admin";

function hash(pw, salt) { return crypto.scryptSync(pw, salt, 64).toString("hex"); }

function loadSettings() {
  if (!fs.existsSync(SETTINGS)) {
    const salt = crypto.randomBytes(16).toString("hex");
    const s = { user: DEFAULT_USER, salt: salt, pass: hash(DEFAULT_PASS, salt), seededDefault: true };
    fs.writeFileSync(SETTINGS, JSON.stringify(s, null, 2));
    return s;
  }
  return JSON.parse(fs.readFileSync(SETTINGS, "utf8"));
}

function verify(user, pw) {
  const s = loadSettings();
  if (user !== s.user) return false;
  const a = Buffer.from(hash(pw, s.salt), "hex");
  const b = Buffer.from(s.pass, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function setPassword(newPw) {
  const s = loadSettings();
  s.salt = crypto.randomBytes(16).toString("hex");
  s.pass = hash(newPw, s.salt);
  s.seededDefault = false;
  fs.writeFileSync(SETTINGS, JSON.stringify(s, null, 2));
}

function usesDefaultPassword() { return loadSettings().seededDefault === true; }
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

module.exports = { verify, setPassword, requireAuth, usesDefaultPassword, currentUser: function () { return loadSettings().user; } };
