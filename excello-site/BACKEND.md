# Excello — content backend (Projects & Insights)

The site now runs on a small Node/Express server that serves the static site **and** provides
a friendly admin panel to upload, edit and delete Projects and Insights. Content lives in JSON
files and uploaded images on disk — no external database required.

## Run it

```
cd excello-site
npm install
npm start           # http://localhost:3000
```

Set a port or credentials with env vars if you like:

```
PORT=8080 ADMIN_USER=you ADMIN_PASSWORD='a-strong-secret' SESSION_SECRET='another-secret' npm start
```

## Admin panel

Open **http://localhost:3000/admin**

- Default login: user `admin`, password `excello-admin`. A banner reminds you to change it; click
  **Password** and set your own before going live.
- Two tabs, **Projects** and **Insights**. Each row has a Live/Draft toggle, Edit and Delete.
- **New** opens a slide-over editor: title, category, location/date, year, status, excerpt, body
  (a blank line starts a new paragraph), a cover image and, for projects, a gallery. Drag an image
  onto the drop zone or click to choose. Toggle **Published** to show or hide it on the site.
- Changes are live immediately — the public pages read the same data.

## What the public site does with it

- **/projects** renders the gallery from your published projects; each links to **/project/<slug>**.
- **/insights** shows the cinematic "theater" slider of published insights (autoplay, arrows, dots,
  keyboard and swipe), with a full index list beneath it; each links to **/insight/<slug>**.
- Detail pages are generated from your content.

## Data & files

```
data/projects.json     your projects        (safe to back up / edit by hand)
data/insights.json     your insights
data/services.json     your services        (edit in the Services admin tab)
data/enquiries.json    contact-form submissions (created at runtime, gitignored)
data/settings.json     admin user + hashed password (gitignored, never commit)
uploads/               uploaded images       (gitignored)
server/                the Express app
admin/                 the admin panel
```

## Contact form

The contact form posts to `POST /api/enquiry`, which validates and appends the
submission to `data/enquiries.json` (newest first, capped at 500). Submissions
are private: read them at `GET /api/admin/enquiries` while signed in to the
admin panel. If the page is opened without the server (e.g. as a plain file),
the form shows a fallback message with the phone and email instead of failing
silently. To also receive enquiries by email, point the form at a mail service
(Formspree, or an SMTP sender added to `/api/enquiry`) — ask and this can be
wired up.

## Hosting notes

- Run it behind HTTPS (a reverse proxy such as Nginx, or a host like Render/Railway/a VPS).
- Change the admin password and set `SESSION_SECRET` in production.
- Uploaded images and the JSON files are the state to back up.
- This is a lightweight single-instance backend (JSON store, in-memory sessions). It is ideal for a
  brochure site edited by a small team; for heavy concurrent editing move the store to a database.

---

## Update: header, WhatsApp + chat, map, watermark

- **Header** now stays visible on scroll and turns into a readable solid bar (blurred paper
  background, dark text) once you scroll past the top, so the nav is legible over any section.
- **Hero legibility**: added a soft text shadow and a stronger gradient so the label and copy read
  over bright frames.
- **WhatsApp button**: floating green button links to `wa.me/94770222000` (change the number in
  `js/layout.js`, `WA_NUMBER`).
- **Chat assistant**: a floating chat widget with quick replies and canned answers about services,
  Aathavan, booking and location. It's front-end only — wire the `respond()` function in
  `js/main.js` to a real backend, an LLM, or hand off to WhatsApp.
- **Working map**: the contact page now has a live Leaflet map (CARTO light tiles) with a pulsing
  marker on Mount Lavinia. Map tiles need internet access to load.
- **Hero watermark**: the AI-video sparkle was removed from all 720 hero frames with ffmpeg's
  `delogo` filter before upscaling.

---

## Update: optimisation, favicon, cover emblem, header, map, back-to-top

- **Optimised**: all hero and band frames converted to WebP at full 1920×1080 (every frame kept).
  The frame payload dropped from ~197MB to ~137MB. To go lighter still, lower the WebP quality in the
  conversion or reduce the frame rate; both keep full resolution optional.
- **Favicon**: a brand "E" monogram (`favicon.ico`, `img/favicon.svg`, `img/apple-touch-icon.png`)
  added to every page, template and the admin.
- **Hero watermark**: the AI-video mark was removed from the frames (ffmpeg delogo) AND a rotating
  brand emblem now sits over that corner as an extra cover and accent.
- **Header** stays visible and readable: white on a soft top scrim over the hero, and a solid blurred
  bar with dark text once scrolled.
- **Gallery titles** are no longer clipped — panels are sized by height so the captions always show.
- **Map**: uses OpenStreetMap tiles (no API key required).
- **Back-to-top** button added to the floating stack; appears once you scroll.

> Note: the real excello.lk content, logo, favicon and photos could not be fetched from this
> environment (outbound access to excello.lk is blocked by policy). Send the logo/photos or grant
> access and I'll drop in the originals; the current favicon is a brand monogram placeholder.
