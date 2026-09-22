# Aathavan Availability & Construction Cost Planner — integration notes

Two client tools built **inside** the Excello site, sharing its navigation,
design system, footer and WhatsApp/contact CTA style, fully responsive, with a
print-friendly calculator summary. All commercial data is **admin-editable**
(`/admin`) — nothing is hard-coded in the UI.

---

## 1. Files / components

**Pages:** `availability.html`, `calculator.html`
**Front-end:** `js/availability.js`, `js/calculator.js`
**Styling:** `css/style.css` (ADDENDUM 8 = availability, ADDENDUM 9 = planner + print)
**Nav:** `js/layout.js` (Availability + Calculator added to nav/menu/footer)
**Data (admin-editable):** `data/units.json`, `data/projecttypes.json`,
`data/finishes.json`, `data/rooms.json`, `data/materials.json`
**Backend:** `server/store.js` + `server/server.js` (collections, read APIs,
`/api/estimate` lead capture, Site-settings keys); `admin/admin.js` (tabs,
fields, `select`/`number` field types)

---

## 2. Aathavan Unit Availability (`/availability`)

- Consumes `/api/units`. **Price is computed** (`area × pricePerSqFt`), shown as
  `LKR 50.40M`; `pricePerSqFt` falls back to the site standard rate.
- All **27 residences** loaded (client-supplied): 7 × 2-Bed, 20 × 3-Bed
  (incl. 6 “3 Bedroom + Maid’s Room”), floors 1–5.
- Config chips + Floor/Status/Sort filters, responsive table→cards, empty state
  + reset, disclaimer, payment structure, help CTA. Enquiry uses one
  configurable WhatsApp number (`site.whatsapp`).

**Unit shape:** `{ title(unit no), type, floor, configuration, area, pricePerSqFt, status(available|reserved|sold), published }`

---

## 3. Construction Cost Planner (`/calculator`)

Rebuilt to match the client’s reference: a **7-step guided planner** (site
header/footer kept), with a **default selection pre-chosen on every step**.

1. **Project direction** — House / Mini apartment (calculator) · Mid-size
   apartment (→ WhatsApp) · Custom (→ Call). *(`projecttypes`)*
2. **Specification** — finish level → **base LKR/sq.ft** *(`finishes`)*
3. **Site** — land extent slider + floors + roof + 65% capacity check
4. **Rooms** — per-floor programme, Small/Medium/Large allowance + qty *(`rooms`)*
5. **Materials** — Walling/Windows/Doors/Floor/Fittings + Finished ceilings *(`materials`)*
6. **Your details** — lead capture (POST `/api/estimate`, stored in `data/estimates.json`)
7. **Estimate** — indicative result + printable summary (browser print/PDF)

“Save locally” persists progress to `localStorage`. Validation + accessible
controls throughout.

**Real finish rates (from the reference):** Essential 18,500 · Modern 24,000 ·
Premium 35,000 · Traditional 28,000 · Bespoke 45,000 (LKR/sq.ft).

---

## 4. Calculation formula (single source of truth — `computeEstimate()`)

```
constructionArea = Σ room[size] × qty          (across floors; size = S/M/L allowance)
ratePerSqft      = finish.rate × (1 + Σ material.adjustPct/100)
base             = constructionArea × ratePerSqft
total            = base + base×profFees% + base×contingency%
range            = total × (1 ± calcRangePct%)
landArea         = landExtent(perches) × 272.25
capacityCheck    = landArea × coverage% × floors      (advisory only)
```
Material adjustments default to **0** (transparent) until confirmed.

---

## 5. Configurable values (admin → Site details, no code)

Availability: development name, location, heading, intro, note, **standard
price/sq.ft**, disclaimer, 3 payment lines, help-CTA copy.
Calculator: currency, **range ±%**, land unit, **site coverage %**,
**professional fees %**, **contingency %**, area note, disclaimer.
Plus the five calculator collections (project direction, finishes, rooms, materials).

---

## 6. Still needs CLIENT CONFIRMATION (isolated as config, flagged)

1. **Room S/M/L areas** (`rooms`) — placeholder sq.ft per size; confirm.
2. **Material adjustments** (`materials.adjustPct`) — default 0; the reference
   says selections “apply adjustments”, but the exact %s are unknown. Set them
   per influence when confirmed. (Option lists beyond those seen in the video —
   Walling/Doors/Floor extras — are editable too.)
3. **Site coverage %** — default 65 (from the reference note). Confirm.
4. **Professional fees % / contingency %** — default 0 (off). Confirm.
5. **Estimate range** — default ±10%. Confirm.
6. **Area basis** — construction area comes from the room programme; the site
   capacity is advisory only. Confirm whether land/floors should instead drive
   the costed area.
7. **Finish rates** are taken from the reference video — confirm they are current.

---

## 7. Future data sources

The front-end consumes structured JSON over HTTP (`/api/units`, `/api/finishes`,
…), so the JSON-file store can be swapped for a CMS / database / Google Sheet /
API by changing only `server/store.js` — the pages need no changes.
