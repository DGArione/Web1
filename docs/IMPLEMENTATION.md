# Implementation map

This maps the project proposal (§ sections) to the code, and records what is
fully built, partially built, or planned. This is **Phase 1**: a runnable
foundation with the core network, order and payment flows working end-to-end.

Legend: ✅ implemented · 🟡 partial / foundation present · ⬜ planned

## Roles, access & privacy

| § | Area | Status | Where |
| --- | --- | --- | --- |
| §3 | Administrator control | ✅ | `src/app/admin/*` |
| §3 | Roles (admin/seller/customer) | ✅ | `prisma/schema.prisma` `Role`; `src/lib/auth.ts` |
| §31 | Auth: hashed passwords, sessions | ✅ | `src/lib/password.ts`, `src/lib/session.ts` |
| §31 | Email **or** phone login | ✅ | `src/app/login/actions.ts` |
| §31 | Two-factor auth | ⬜ | — |
| §32 | Role- & relationship-based access control | ✅ | `src/middleware.ts` + per-query `masterId` scoping |
| §26 | Separate recovery credential (hashed) | 🟡 | captured at seller registration; reactivation request UI planned |

## Seller network, levels & progression

| § | Area | Status | Where |
| --- | --- | --- | --- |
| §4 | Hierarchical seller structure | ✅ | `User.masterId` self-relation |
| §4 | Unlimited configurable levels | ✅ | `SellerLevel` (no max); `src/app/admin/levels` |
| §5 | Ranking (sales/points requirements) | ✅ | `SellerLevel.minSales/minPoints`; points on verified sale |
| §6 | Promotion eligibility + policy acknowledgement | ✅ | `src/app/seller/level` + `acknowledgePolicy` |
| §6 | Automatic demotion | 🟡 | requirements stored; auto-demotion job planned |
| §7 | Level-based visibility | 🟡 | permissions modelled; visibility screens planned |
| §11 | Customer → seller promotion | 🟡 | modelled via application/invitation; dedicated flow planned |
| §12 | Master/subordinate sourcing rules | 🟡 | `canRecruit`, hierarchy present; sourcing enforcement planned |

## Onboarding (invitation-only)

| § | Area | Status | Where |
| --- | --- | --- | --- |
| §9 | Customer invitation (one-time, expiring) | ✅ | `src/app/seller/customers` + `Invitation` |
| §10 | Seller invitation by admin | ✅ | `src/app/admin/invitations` |
| §10 | Public seller **request** (no public signup) | ✅ | `src/app/apply` + `SellerApplication` |
| §9/§10 | One-time-use + expiry enforcement | ✅ | `src/lib/invitations.ts` (lazy-expire, transactional single use) |

## Products, orders & payments

| § | Area | Status | Where |
| --- | --- | --- | --- |
| §13 | Seller product management | ✅ | `src/app/seller/products` |
| §14 | Commission brackets by price | ✅ | `CommissionBracket`; `src/lib/commission.ts` |
| §14 | Level + price → commission | ✅ | `resolveCommissionPct` (bracket, else level %) |
| §15 | Full order lifecycle | ✅ | `src/app/seller/orders`, `src/app/customer/orders` |
| §16 | Bank transfer receipt upload | ✅ | `PaymentProofForm` + `src/lib/uploads.ts` |
| §17 | Crypto proof (tx hash / screenshot) | ✅ | `PaymentProofForm`, `Payment.txHash` |
| §18 | Payment method config (bank/crypto/both, terms) | ✅ | `src/app/admin/settings` |
| §18 | Credit terms | 🟡 | settings + level flags present; credit enforcement planned |

## Finance & settlement

| § | Area | Status | Where |
| --- | --- | --- | --- |
| §19 | Per-sale commission → ledger | ✅ | `CommissionEntry` created on payment verify |
| §20 | Scheduled/periodic settlement | 🟡 | due dates + statuses present; settlement submission/confirm UI planned |
| §21 | Non-payment escalation | 🟡 | statuses (DUE/OVERDUE/RESTRICTED) present; auto-escalation job planned |
| §24 | Retention split (account / temporary / financial) | ✅ | schema separates these; ledger retained past expiry |

## Temporary data, notifications, policies

| § | Area | Status | Where |
| --- | --- | --- | --- |
| §22 | Temporary transaction info | ✅ | `Order.expiresAt` + `relativeExpiry` |
| §23 | Customer-side data expiration | ✅ | `src/app/customer/orders` hides expired info |
| §27 | Internal notifications (targeted) | ✅ | `src/lib/notify.ts`; per-user + per-level |
| §28 | Policy versioning + acknowledgement | ✅ | `Policy.version`, `PolicyAcknowledgement` |

## Admin operations

| § | Area | Status | Where |
| --- | --- | --- | --- |
| §29 | Admin dashboard (overview/sellers/customers/levels/products/orders/finance/settings) | ✅ | `src/app/admin/*` |
| §25 | Account inactivity rules | 🟡 | `inactivityDays` + `lastActiveAt` stored; auto-deactivation job planned |
| §26 | Account reactivation workflow | ⬜ | recovery credential captured; approval flow planned |
| §30 | Emergency data purge (guarded) | ✅ | `emergencyPurge` (temporary data only; ledger protected) |

## Notable engineering decisions

- **Authorization in middleware.** `src/middleware.ts` verifies the session JWT
  and the required role for `/admin`, `/seller`, `/customer` *before* rendering.
  This is not redundant with the layout guard: a `redirect()` in a layout still
  lets Next.js render the page and stream its data in the redirect body. This was
  found and fixed during testing (an admin settings page leaked bank details to a
  non-following HTTP client until middleware was added).
- **One-time invitations** are enforced inside a transaction so a link cannot be
  redeemed twice under a race.
- **Commission** is resolved as *price bracket first, else seller-level rate*, and
  the amount owed is snapshotted into the ledger so it survives order-data expiry.

## Suggested next phase

1. Settlement submission + admin confirmation UI (§20) and non-payment escalation
   job (§21).
2. Scheduled jobs: temporary-data purge (§22/§23), inactivity deactivation (§25).
3. Account reactivation via recovery credential (§26).
4. Level visibility screens and master/subordinate sourcing enforcement (§7/§12).
5. Two-factor auth (§31) and move uploads to object storage.
