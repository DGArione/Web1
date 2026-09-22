# Aathavan Availability & Construction Cost Calculator — integration notes

Two client tools were rebuilt **inside** the existing Excello website (not as
external links or iframes). They share the site's navigation, typography,
design system, buttons, colours, footer and WhatsApp/contact CTA style, and
are fully responsive (desktop / tablet / mobile) with a print-friendly
calculator summary.

Everything commercial (units, prices, rates, multipliers, room areas, copy)
is **configurable through the existing admin panel** (`/admin`) — no data or
pricing is hard-coded in the UI.

---

## 1. Files / components created

**Pages (public)**
- `availability.html` — Aathavan unit availability page shell.
- `calculator.html` — construction cost calculator (6-step wizard) shell.

**Front-end logic (reusable, config-driven)**
- `js/availability.js` — fetches units, computes prices, filters/sorts, renders
  the responsive table→cards, builds WhatsApp enquiries.
- `js/calculator.js` — the calculation engine + wizard flow + printable summary.

**Styling**
- `css/style.css` — appended “ADDENDUM 8” block: availability + calculator
  components, responsive rules, and `@media print` for the summary.
  (Also added shared helpers: `.btn--sm`, `.btn--ghost`, `.chip`, `.sr-only`,
  visible `:focus-visible` state.)

**Navigation**
- `js/layout.js` — added **Availability** and **Calculator** to the site nav,
  fullscreen menu and footer (one source of links).

**Seed data (client-editable)**
- `data/units.json` — the 9 published reference units (all *available*).
- `data/projecttypes.json`, `data/materials.json`, `data/rooms.json` —
  calculator configuration.

**Backend wiring**
- `server/store.js` — registered `units`, `projecttypes`, `materials`, `rooms`
  collections (same JSON-file store, atomic writes).
- `server/server.js` — public read APIs, clean-URL routes, route-name
  registration, and the new Site-settings keys.
- `admin/admin.js` — new admin tabs + fields for every new collection, plus the
  availability/calculator settings under **Site details**; added generic
  `select` and `number` field types (reusable for future collections).

---

## 2. Data structures created

**Unit** (`/api/units`, admin → *Aathavan Units*)
```json
{
  "title": "AATH-206",          // residence number
  "type": "Type 6",
  "floor": "2",
  "configuration": "3 Bedroom", // 2 Bedroom | 3 Bedroom | 3 Bedroom + Maid's
  "area": "1260",               // sq.ft
  "pricePerSqFt": "",           // blank => site standard rate
  "status": "available",        // available | reserved | sold
  "published": true
}
```
Price is **not stored** — it is computed (see formula). `status` supports
available / reserved / sold; only *available* units are counted in “Available
now”, and the page defaults to the Available filter (a status filter is provided
to view reserved/sold).

**Project type** (`/api/projecttypes`): `{ title, baseRate, note }` — base
construction rate per sq.ft.
**Finish level** (`/api/materials`): `{ title, multiplier, note }` — cost
multiplier.
**Room** (`/api/rooms`): `{ title, area, note }` — default area (sq.ft) per room.

---

## 3. Configurable values (admin, no code changes)

**Aathavan (Site details):** development name, location, heading, intro, daily
note, **standard price/sq.ft**, disclaimer, the 3 payment-structure lines, and
the “Need help choosing?” CTA copy. WhatsApp number is the site-wide
`whatsapp` field (single source — used by every Enquire button and the team CTA).

**Calculator (Site details):** heading, intro, currency code, estimate range ±%,
land-extent unit, **professional-fees %**, **contingency %**, area-basis note,
and disclaimer. Plus the three calculator collections (types / finishes / rooms).

---

## 4. Calculation formula (single source of truth)

**Aathavan price** — `js/availability.js`:
```
pricePerSqFt = unit.pricePerSqFt || site.aathavanPricePerSqFt   // default 40,000
price        = area × pricePerSqFt
// e.g. 1,260 × 40,000 = 50,400,000 → displayed "LKR 50.40M"
```

**Construction cost** — `js/calculator.js` → `computeEstimate()`:
```
constructionArea = Σ (room.area × qty)            // from the room programme
ratePerSqft      = projectType.baseRate × material.multiplier
base             = constructionArea × ratePerSqft
professionalFees = base × calcProfFeesPct / 100    // default 0
contingency      = base × calcContingencyPct / 100 // default 0
total            = base + professionalFees + contingency
range            = total × (1 ± calcRangePct/100)  // default ±10%
```
Land extent is captured for context and shown in the summary; it does **not**
affect the estimate unless the client confirms a land-based area rule.

---

## 5. Places where CLIENT CONFIRMATION is still required

These are isolated in configuration with clearly-flagged placeholder defaults —
replace them in `/admin` (no code change) once the client provides real values:

1. **Full Aathavan unit list.** Only the 9 units shown in the reference are
   seeded. The reference states **27 available** (7 × 2-Bed, 20 × 3-Bed) — the
   remaining units must be added in *Aathavan Units*. (We did not invent units.)
2. **Construction base rates** (`projecttypes.json`) — every `baseRate` is a
   PLACEHOLDER (LKR/sq.ft). Confirm real rates and the full project-type list.
3. **Finish multipliers** (`materials.json`) — Standard/Semi-luxury/Luxury
   multipliers are placeholders (1.00 / 1.20 / 1.45). Confirm.
4. **Room default areas** (`rooms.json`) — placeholder sq.ft per room. Confirm
   the room list and per-room areas.
5. **Professional fees % and contingency %** — default **0** (off). Confirm
   whether the calculator should add these and at what rate.
6. **Estimate range** — default **±10%**. Confirm.
7. **Land-extent role** — currently context only. Confirm whether land extent
   should drive construction area (e.g. coverage × floors) instead of/along with
   the room programme.
8. **The exact commercial formula** — the engine above is our best reasonable
   structure; confirm it matches the original calculator’s intended maths.

---

## 6. Future data sources

The front-end already consumes structured JSON over HTTP (`/api/units`, etc.),
so the JSON-file store can later be swapped for a CMS, database, Google Sheet or
external API by changing only `server/store.js` (or pointing the API routes at a
new source) — the pages need no changes.
