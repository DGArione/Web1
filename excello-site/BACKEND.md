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
data/settings.json     admin user + hashed password (gitignored, never commit)
uploads/               uploaded images       (gitignored)
server/                the Express app
admin/                 the admin panel
```

## Hosting notes

- Run it behind HTTPS (a reverse proxy such as Nginx, or a host like Render/Railway/a VPS).
- Change the admin password and set `SESSION_SECRET` in production.
- Uploaded images and the JSON files are the state to back up.
- This is a lightweight single-instance backend (JSON store, in-memory sessions). It is ideal for a
  brochure site edited by a small team; for heavy concurrent editing move the store to a database.
