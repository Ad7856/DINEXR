# DINEXR — Scan. See. Experience. Order.

AR restaurant ordering platform: Next.js 14 (App Router), TypeScript, Tailwind, Supabase.

## Status: Phase 5 audit done. Code complete for the MVP, NEVER RUN (see "What is verified")
Nothing has been installed, compiled, run or tested. The authoring environment had no network.
Package versions in `package.json` were chosen from memory and not checked against the registry.
Expect to fix small type/build errors on first `npm run typecheck`.

## Manifest
**Phase 1 (done)**
- [x] `supabase/migrations/0001_init.sql` schema + RLS (money in paise)
- [x] `src/server/orders/pricing.ts` + `pricing.test.ts` (tests written, never run)
- [x] `tailwind.config.ts` chalkboard/butter-yellow/teal/wood theme

**Phase 2 (done)**
- [x] Config: `package.json`, `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`, `vitest.config.ts`, `.env.example`, `.gitignore`
- [x] `src/lib/env.ts` validated server env; `src/lib/money.ts`
- [x] `src/lib/supabase/{browser,server,admin,middleware}.ts` (service-role key only in server-only `admin.ts`)
- [x] `src/middleware.ts` session refresh, anonymous redirect for `/admin`, `/kitchen`
- [x] `src/server/auth/guards.ts` `requireRole()` server-side authorization, `safeNext()`
- [x] `src/server/restaurants/lookup.ts` validated restaurant + table lookup
- [x] `src/app/` layout, home, loading, error, not-found, `/forbidden`, `/login` (server action)
- [x] `/admin` and `/kitchen` layouts (role-guarded) with placeholder pages
- [x] `/r/[restaurantSlug]/t/[tableSlug]` layout, home, `/menu` (read-only list)

**Phase 3 (done)**
- [x] `supabase/migrations/0002_order_creation.sql` atomic `create_order()` RPC (service_role only), public customization read policy, total check, unique token hash
- [x] `src/server/orders/`: `schemas.ts` (zod), `snapshot.ts` (price + immutable item snapshots), `create.ts` (quote/create), `token.ts` (HMAC tracking token, hash stored); `pricing.ts` gained `lineUnitPrice` (existing logic untouched)
- [x] `src/server/rate-limit.ts` (in-memory, per instance)
- [x] API: `POST /api/quote`, `POST /api/orders`, `GET /api/track/[token]`
- [x] `src/features/cart/` CartProvider (per-restaurant localStorage), CartLink, CartView (server quote, checkout, idempotency key, clear confirm)
- [x] `src/features/dish/` DishMedia, ModelViewer (`@google/model-viewer`, loaded on demand), DishDetail
- [x] Routes: `/r/.../menu/[dishId]`, `/r/.../cart`, `/track/[token]` (5s polling)
- [x] Tests written (never run): `token`, `schemas`, `snapshot`, `rate-limit`, plus Phase 1 `pricing`

**Phase 4A (done)**
- [x] `supabase/migrations/0003_order_status_staff.sql`: `update_order_status()` RPC (row lock, transition check, history, optimistic `expected` status), direct staff UPDATE on orders removed, kitchen can read table labels, realtime publication for `orders`
- [x] `src/server/auth/roles.ts` (pure role matching), `guards.ts` now has non-redirecting `getStaff()` for APIs; `requireRole()` behaviour unchanged
- [x] `src/server/orders/status.ts` role-aware transitions + search sanitizer
- [x] API: `GET /api/staff/orders` (filters, search, restaurant-scoped, kitchen gets no phone/totals), `POST /api/staff/orders/[id]/status`
- [x] `src/features/orders/OrderBoard.tsx` + `/kitchen` page (filters, search, sound toggle, 8s polling + realtime nudge, reject/cancel with reason)
- [x] `scripts/seed.ts` demo restaurant "The Royal Kitchen" (slug `demo-restaurant`), `npm run seed -- --yes`
- [x] Tests written (never run): `status.test.ts`, `roles.test.ts`

**Phase 4B (done)**
- [x] `src/lib/qr.ts` (`tableUrl`, PNG buffer, data URL via `qrcode`), `src/lib/time.ts` (IST day start), `parseRupees`/`parsePercentToBps` in `money.ts`
- [x] `GET /api/admin/tables/[id]/qr` downloadable PNG (admin roles, scoped to own restaurant)
- [x] `/admin` layout + nav, Overview (real metrics), `/admin/orders` (shared OrderBoard), `/admin/menu` (categories, availability), `/admin/menu/new` and `/admin/menu/[dishId]` (dish form, options, 3D preview, delete), `/admin/tables` (create, edit, activate, QR download, preview), `/admin/tables/[id]/print` (printable DINEXR card), `/admin/settings` (owner-only edits)
- [x] `src/app/admin/actions.ts` server actions (role re-check, restaurant scoping, zod, category ownership check)
- [x] Tests written (never run): `qr.test.ts`, `money.test.ts` (rupees, percent, IST day)

**Remaining**
- [ ] Phase 5: more tests (lookup, authorization, order creation, duplicates), deploy docs

## Setup
1. `npm install`
2. Create a Supabase project. Run `0001_init.sql`, `0002_order_creation.sql`, `0003_order_status_staff.sql` in order in the SQL editor (or `supabase db push`).
3. `cp .env.example .env.local` and fill in values. `SUPABASE_SERVICE_ROLE_KEY` must never be exposed to the browser or committed.
4. `npm run typecheck && npm test && npm run dev` (see Phase 5 section for the full command list)

## Create the first owner (no default credentials exist)
1. Supabase dashboard → Authentication → Users → add a user with your own email and a strong password.
2. In the SQL editor, create your restaurant and link yourself as owner:
```sql
insert into restaurants (slug, name) values ('my-restaurant', 'My Restaurant') returning id;
insert into restaurant_members (restaurant_id, user_id, role)
values ('<restaurant id>', '<auth user id>', 'owner');
insert into restaurant_tables (restaurant_id, code, label) values ('<restaurant id>', 'table-01', 'Table 1');
```
3. Sign in at `/login`, then open `/admin`. Kitchen staff are added the same way with role `kitchen` and use `/kitchen`.

## Known gaps
- The login redirect defaults to `/admin`; kitchen-only users must open `/kitchen` directly until Phase 4 routes by role.
- Table lookup uses the service-role client server-side because `restaurant_tables` has no public RLS policy (intentional).
- No rate limiting yet (planned with order creation in Phase 3).

## Phase 3 behaviour and gaps
- Prices shown in the cart come from `/api/quote`; the order is priced again on the server at submit. Browser prices are never trusted.
- Duplicate submits: same cart + same idempotency key returns the same order and tracking link. Editing the cart creates a new key.
- Tracking: link `/track/<token>` is the only access path; token is HMAC-signed, only its SHA-256 is stored, phone is never returned. Anyone holding the link can view that order.
- Customizations are optional multi-select checkboxes (the schema has no required/single-choice flags).
- Dine-in only; takeaway is not implemented. Cash only; no payment provider is wired.
- AR is unverified on real devices. "Place on table" appears only when model-viewer reports AR support. iOS Quick Look works best with a `model_usdz_url`.
- If `restaurant_settings` has no row for a restaurant, tax and service charge are treated as 0 (the seed script in Phase 4 will create it).
- Supabase Realtime is not used yet; tracking uses polling. The in-memory rate limiter is per instance.
- Tests actually executed: none.

## Phase 4A notes
- Kitchen role: accept, start preparing, mark ready. Owner/manager/platform admin: also serve and reject/cancel (reason required). Enforced in the API and again in SQL.
- Seed: `npm run seed -- --yes` (Node 20+, uses `.env.local`). Demo has no images and no 3D models (none were invented). Tax is a demo 5%.
- Realtime relies on the `orders` publication from migration 0003 and was not tested; polling every 8s is the fallback.
- Sound alerts are off until the staff member turns them on (browsers require a click).

## Phase 4B notes and gaps
- Table codes can be edited, which invalidates the old printed QR (the form warns). Tables with orders can be deactivated, not deleted.
- Deleting a category leaves its dishes uncategorized. Deleting a dish keeps past orders intact (snapshots).
- Not implemented: image/GLB upload to Supabase Storage (URL fields only), logo, opening hours, theme, takeaway toggle, user/staff invitation UI, featured-dish and search UI on the customer home.
- Settings edits are owner-only; managers can edit menu and tables.
- Access control is covered by unit tests of the pure role logic only. No test exercises RLS or the routes against a real database.

# Phase 5: audit, deployment, verification

## What is verified (and how)
Run in the authoring sandbox, which has Node and a global TypeScript but **no ability to install packages**:
- **Import audit (script):** all 77 `.ts/.tsx` files: every `@/` and relative import resolves; no client component imports a `server-only` module. Clean.
- **Syntax scan (`tsc`, TS1xxx errors only):** no syntax or JSX errors in any source file. This is NOT a type check: types for React, Next and Supabase could not be loaded.
- **Pure-logic tests executed with a small stand-in harness (not vitest):** pricing, snapshot, status/roles, token, rate limit, money/time, `postLoginPath`, CSRF origin check: all assertions passed. Files that need packages (`schemas.test.ts` needs zod, `qr.test.ts` needs qrcode) were not run.
- **Not verified at all:** `npm install`, `next build`, `tsc` type check, the real vitest run, any SQL against Postgres, Supabase auth/RLS/realtime, any browser behaviour, model-viewer/AR on a device, QR scanning.

## Files added in Phase 5
`src/server/csrf.ts`, `src/types/react-canary.d.ts`, tests: `csrf.test.ts`, `project-checks.test.ts`, and extra cases in `roles.test.ts`.

## Fixes made in the audit
- Middleware now runs only for `/admin`, `/kitchen`, `/api/staff`, `/api/admin` (customer pages no longer make a Supabase auth call per request). Authorization never depended on middleware: layouts and APIs re-check roles.
- Login routes by role (kitchen-only users go to `/kitchen`, not "no access"); tested.
- Same-origin check added to the cookie-authenticated status-change POST.
- `package.json`: removed the `lint` script (ESLint was never installed), added `engines` (Node >= 20.6), seed script now `node --env-file=.env.local --import tsx`, Next range raised to `^14.2.25` (14.2.15 predates a published middleware-bypass fix; run `npm audit` and take the latest 14.2.x).
- Added canary React type references for `useFormState`.
- Added static tests over migrations (RLS on every table, RPCs locked to service_role, no public order policies) and env docs.

## Environment variables
| Name | Where | Secret? | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | no | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | no (RLS protects data) | public client key |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | **YES** | bypasses RLS; table lookup, order creation, status RPC |
| `ORDER_TOKEN_SECRET` | server only | **YES** | signs order tracking links; 32+ random chars (`openssl rand -base64 48`); changing it breaks existing tracking links |
| `NEXT_PUBLIC_SITE_URL` | server (QR URLs) | no | exact production origin, e.g. `https://dinexr.example.com`, no trailing slash. Printed QRs embed it. |

Rules: never prefix secrets with `NEXT_PUBLIC_`; never commit `.env.local`; set values in Vercel (Project > Settings > Environment Variables) per environment; use different Supabase projects for dev and production. All five are required: the server refuses to start requests without them and shows a setup error.

## Supabase setup
1. Create a project (choose a region near your users, e.g. Mumbai).
2. SQL editor: run `0001_init.sql`, `0002_order_creation.sql`, `0003_order_status_staff.sql` in this order (or `supabase link` then `supabase db push`). Run each once. Check the Table editor shows all 11 tables with RLS enabled.
3. Authentication > Providers/Sign-in: **disable "Allow new users to sign up"** (staff are added by you; customers never sign in). Set Site URL to your production URL.
4. Create the first owner: Authentication > Users > Add user, then run the owner SQL from "Create the first owner" above.
5. Database > Replication: confirm `orders` is in the `supabase_realtime` publication (migration 0003 attempts this). Tracking and kitchen work via polling even if not.
6. Optional demo data: `npm run seed -- --yes` (writes SAMPLE data for "The Royal Kitchen", slug `demo-restaurant`; only against a dev project unless you want the demo in production). Remove demo data before launch.

## Vercel
1. Push the repo to GitHub (check `.env.local` is not committed).
2. Vercel > New Project > import. Framework: Next.js (auto). Node 20+.
3. Add the five env vars for Production (and Preview if you use a separate Supabase project).
4. Deploy. Set `NEXT_PUBLIC_SITE_URL` to the final domain (add the custom domain first), then redeploy so QR codes use it.
5. Set the function region close to the Supabase region.
6. Open `/r/<slug>/t/<table-code>` on a phone, then sign in at `/login`.

## Commands to run in a normal environment (in order)
```
npm install
npm run typecheck        # expect to fix some type errors on first run
npm test                 # vitest: all test files incl. schemas and qr
npm run build
npm run dev              # then walk the manual checklist below
```

## Issues that still require running the app
1. `npm install` resolves; versions in `package.json` were never checked against the registry.
2. `tsc` type check (Supabase untyped client returns `any`, `useFormState` types, model-viewer custom element typing, `Map<string, DishFull>` assignability).
3. `next build` (tailwind classes, server/client boundaries, `next/font` needs network at build).
4. Real vitest run, especially `schemas.test.ts` and `qr.test.ts`.
5. SQL: all three migrations apply cleanly in order; `create_order` and `update_order_status` behave under concurrency; policies give the intended access (test as anon, kitchen, manager, owner, and a user from a second restaurant).
6. Auth: sign-in, cookie refresh via middleware, sign-out, `/forbidden`.
7. PostgREST embeds (`restaurant_tables(label)`, `restaurants(name,...)`, `orders!inner(...)`) return the shapes the code expects.
8. Supabase Realtime subscription for kitchen (RLS-filtered). Polling is the fallback.
9. Customer flow: QR URL > menu > dish > cart > quote > place order > tracking; double-tap on "Place order" yields one order; editing the cart after a failure creates a new order key.
10. 3D/AR on real devices: model-viewer loads, "Place on table" appears only when AR is supported (Android Scene Viewer, iOS Quick Look needs a USDZ for best results). The "AR isn't supported" message may flash for about a second before AR support is detected.
11. QR PNG scans correctly from a printed card; print layout fits the page.
12. Admin forms (create/edit dish, options, tables, settings), including owner-only settings for a manager account.
13. Browser behaviour: localStorage cart persistence, offline messaging, keyboard and screen-reader use.

## Known limitations before a public launch
- **Rate limiting is in-memory per serverless instance** and keys off `x-forwarded-for`. On Vercel it is only a soft brake. Add a shared limiter (e.g. Upstash Redis) or Vercel WAF rules before public launch.
- Customers can place orders for any active table with no proof of presence (anyone with a table URL). Staff must accept or reject orders; consider a table PIN later.
- No image/GLB upload (https URLs only), logo, opening hours, theme editor, staff invitation UI, takeaway, online payment, customer-home featured/search.
- No security review or penetration test has been done. This is not production-ready until the items above are run and reviewed.

## Deployment checklist
- [ ] `npm install`, `npm run typecheck`, `npm test`, `npm run build` all pass locally
- [ ] Supabase project created; 3 migrations applied in order; RLS shows enabled on all tables
- [ ] Public sign-ups disabled; Site URL set
- [ ] First owner created via SQL (strong password, no shared credentials)
- [ ] Five env vars set in Vercel; secrets not prefixed `NEXT_PUBLIC_`; `.env.local` not in git
- [ ] `NEXT_PUBLIC_SITE_URL` equals the production origin; redeployed after setting
- [ ] Demo seed removed or intentionally kept; real menu, tables, tax rates entered
- [ ] Test order end-to-end on a phone; kitchen account sees it and moves it to ready
- [ ] Cross-restaurant check: a second restaurant's staff cannot see the first's orders or tables
- [ ] QR cards printed from `/admin/tables/<id>/print` and scanned from paper
- [ ] Shared rate limiter or WAF rules in place
- [ ] `npm audit` reviewed; Next on the latest 14.2.x patch
