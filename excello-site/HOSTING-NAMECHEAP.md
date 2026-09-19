# Hosting on Namecheap (cPanel “Setup Node.js App”)

This site is a **Node.js / Express app** (it powers the admin panel, the
services/projects/insights pages, the chatbot, the contact form and the Site
Details). So it must run as a **Node.js application** — not uploaded as plain
HTML. Namecheap shared hosting (Stellar / cPanel plans) supports this through
**cPanel → Setup Node.js App** (Phusion Passenger).

> Requirement: your Namecheap plan must be a **cPanel** plan that shows
> **“Setup Node.js App”** under the *Software* section. Most Stellar / shared
> plans have it. (If it isn’t there, see “If Node isn’t available” at the end.)

---

## 1. Put the code on the server

**Option A — Git (recommended)**
cPanel → *Git™ Version Control* → **Create**:
- Clone URL: `https://github.com/sameera-gamage/Web.git`
- Branch: `claude/website-clone-gsap-animations-zxupx1`
- It clones into e.g. `/home/USER/Web`. The app itself lives in the
  **`excello-site`** subfolder, so the app root will be `Web/excello-site`.

**Option B — Upload ZIP**
Download the ZIP, upload via *File Manager*, and extract:
`https://github.com/sameera-gamage/Web/archive/refs/heads/claude/website-clone-gsap-animations-zxupx1.zip`
(The repo is large — ~100 MB — because of the hero frame images. That is normal.)

---

## 2. Create the Node.js app

cPanel → **Setup Node.js App** → **Create Application**:

| Field | Value |
|---|---|
| Node.js version | newest available (18 or 20) |
| Application mode | **Production** |
| Application root | the folder with `package.json`, e.g. `Web/excello-site` |
| Application URL | your domain (serve at the **root**, not a subfolder) |
| Application startup file | `server/server.js` |

Click **Create**.

> Serve it at the domain **root**. The site’s links are absolute (`/`,
> `/projects`, `/img/...`), so a subfolder would break them.

---

## 3. Install dependencies

On the app’s page, click **Run NPM Install** (it installs express,
express-session, multer). There are no native builds, so it just works.

*(If you prefer the terminal, the app page shows a “enter virtual environment”
command like `source /home/USER/nodevenv/Web/excello-site/20/bin/activate &&
cd /home/USER/Web/excello-site`, then run `npm install`.)*

---

## 4. Set an environment variable (recommended)

On the app’s page → **Environment variables** → add:
- `SESSION_SECRET` = a long random string (keeps admin logins stable across
  restarts).

Then click **Restart**.

---

## 5. Turn on HTTPS

cPanel → **SSL/TLS Status** → select your domain → **Run AutoSSL**
(free Let’s Encrypt certificate).

---

## 6. Go live & secure the admin

1. Open your domain — the site should load.
2. Go to `your-domain.com/admin`, sign in with `admin` / `excello-admin`,
   and **change the password immediately** (Password button).
3. Fill in **Site details** (phone, WhatsApp, email, socials) and start adding
   Projects / Insights / Services.

Your content and uploads are saved on the server in `data/*.json` and
`uploads/` and persist across restarts (shared hosting disk is permanent).

---

## Updating the site later

- **Git method:** cPanel → Git Version Control → **Pull**, then **Restart** the
  Node app.
- **ZIP method:** re-upload changed files, then **Restart**.
- Do **not** overwrite `data/*.json` or `uploads/` on update, or you’ll wipe
  the content you added through the admin. (Back them up first.)

---

## Troubleshooting

### “Cannot move a directory … into itself” (shutil.Error on Setup Node.js App)
This happens when you **edit the Application Root of an existing Node app to a
nested path** — CloudLinux tries to move the app’s virtualenv inside itself.
Your code is fine. Fix it by recreating the app, not editing it:

1. **Setup Node.js App → Destroy** the broken `excello-site` app.
2. In **File Manager**, delete the leftover virtualenv folders in your home dir:
   `nodevenv/excello-site/excello-site` and `nodevenv/excello-site`.
3. Find the folder that **directly** contains `package.json` and note its path
   relative to home. If it is double-nested (`excello-site/excello-site/…`),
   flatten it or use the inner folder as the root.
4. **Create a new** Node.js app pointing Application Root at that exact folder,
   startup file `server/server.js`. Get it right the first time.
5. Run NPM Install → set `SESSION_SECRET` → Restart.

**Golden rule:** never edit an existing app’s Application Root. If it’s wrong,
Destroy the app and create a new one.

## If Node isn’t available on your plan

Two fallbacks:
1. **Run the app elsewhere, point the domain here.** Deploy this repo to a
   Node host (Render, Railway, Fly.io, a small VPS), then in Namecheap set your
   domain’s DNS to that host. You keep the full admin/CMS.
2. **Static-only on Namecheap.** You could upload just the HTML/CSS/JS/images,
   but then the **admin panel, contact form, chatbot and dynamic pages stop
   working** (they need the server). Not recommended for this site.

Ask if you want help with any of these — especially pointing the Namecheap
domain at a Node host.
