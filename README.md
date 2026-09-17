# Ceylon Private Traders — Private Buy & Sell Platform

A private, invitation-only web marketplace with a hierarchical seller/customer
network, configurable seller levels, commission settlement, bank-transfer &
crypto payment proof (no payment gateway), and temporary-visibility transaction
data. Built to the attached project proposal.

Public site is a premium, Sri‑Lankan‑tea‑inspired landing page. Authenticated
areas (admin / seller / customer) render in dark mode.

## Tech stack

- **Next.js 15** (App Router, React 19, Server Actions)
- **TypeScript**
- **Prisma ORM** + **SQLite** (swap `DATABASE_URL` for Postgres/MySQL in prod)
- **Tailwind CSS**
- Session auth via signed **JWT cookie** (`jose`) + **bcrypt** password hashing
- **Edge middleware** for route authorization

## Getting started

```bash
npm install               # install deps (also runs prisma generate)
cp .env.example .env      # then set a strong AUTH_SECRET
npx prisma db push        # create the SQLite schema
npm run db:seed           # seed admin, levels, settings + demo data
npm run dev               # http://localhost:3000
```

Useful scripts:

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (`prisma generate` + `next build`) |
| `npm run start` | Run the production build |
| `npm run db:push` | Apply the Prisma schema to the database |
| `npm run db:seed` | Seed baseline + demo data |
| `npm run db:reset` | Reset the database and re-seed |

## Demo accounts (from the seed)

| Role | Login | Password |
| --- | --- | --- |
| Administrator | `admin@teatraders.example` | `admin1234` |
| Seller (Gold master) | `gold@teatraders.example` | `seller1234` |
| Seller (Bronze) | `bronze@teatraders.example` | `seller1234` |
| Customer | `customer@example.com` | `customer1234` |

> Change these before any real deployment.

## How the flows work

- **Onboarding is invitation-only.** The public site has no registration button.
  A prospective seller submits a request at `/apply`; an admin reviews it and
  generates a one-time seller invitation. Sellers invite their own customers the
  same way. Invitation links are single-use and expire.
- **Order lifecycle:** customer places an order → seller sends payment
  instructions → customer uploads bank receipt / crypto tx hash → seller verifies
  → collection info is released (temporarily) → seller marks completed. Verifying
  a payment writes a commission entry to the settlement ledger.
- **Temporary data:** payment and collection info shown to customers carry an
  expiry; after it passes they are hidden. The financial ledger is retained.

## Security notes

- Authorization is enforced in **`src/middleware.ts`** (before rendering) *and*
  re-checked in each dashboard layout (`requireRole`). Middleware is essential:
  a layout-only `redirect()` still streams the page's rendered payload in the
  redirect body — middleware returns a clean redirect with no body.
- Passwords and seller recovery credentials are bcrypt-hashed, never stored in
  plain text.
- Uploaded files are validated by type/size and stored under `public/uploads`
  (dev). Use object storage (S3/GCS) in production.

## What is implemented vs. planned

See **[docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md)** for a section-by-section
map of the proposal to the code, and the remaining roadmap items.
