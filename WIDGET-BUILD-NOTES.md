# SetReady Training-&-Certificates Widget — build notes (owner)

Embeddable widget that lets a partner portal (e.g. 1ov1 / ShowCatcher) offer SetReady's **Training Modules + Certificates**. Every user/subscriber is recorded and shown in the SetReady admin. Partner installs one snippet.

## Files added

| File | Purpose |
|---|---|
| `public/widget/index.html` | The widget UI (static, framework-free). Runs a self-contained **DEMO** when opened directly; talks to the API when embedded. |
| `public/widget/embed.js` | The loader the partner pastes (one line). Injects a responsive, auto-resizing iframe. |
| `public/widget/INSTALL.md` | Copy/paste install guide for the partner. |
| `app/api/embed/config/route.ts` | Validates the partner key, returns modules + mode (free/paid). |
| `app/api/embed/enroll/route.ts` | **Records a user/subscriber** (upsert into `widget_enrollments`). |
| `app/api/embed/complete/route.ts` | Marks completion + issues a verifiable certificate ID. |
| `app/api/embed/checkout/route.ts` | Option B: Stripe Checkout for the $9.99 talent fee. |
| `app/api/admin/widget/route.ts` | Admin-only: lists partners + all enrollments. |
| `app/admin/widget/page.tsx` | Admin page: partners, subscribers, certified counts, revenue. |
| `sql/2026-07-10_partner-widget.sql` | Creates `partner_accounts` + `widget_enrollments`. |

Nothing touches existing `users` / `certificates` tables, so it can't break current data.

## Go-live checklist

1. **Run the SQL** — paste `sql/2026-07-10_partner-widget.sql` into the Supabase SQL editor. It creates the two tables and seeds one demo partner.
2. **Create the partner's real key** — in Supabase, insert a row into `partner_accounts` (or edit the seeded one):
   - `partner_key`: a random unguessable string, e.g. `pk_1ov1_9f3k2xQ7`
   - `name`: "1ov1 Talent Portal"
   - `mode`: `free` (Option A) or `paid` (Option B)
   - `price_cents`: `999` for $9.99
   - `promo_code`: set for Option A (e.g. `ONEOV1FREE`), leave null for pure paid
3. **Deploy** — push to Vercel as usual. Widget is then live at `https://www.setready.site/widget/index.html` and `.../widget/embed.js`.
4. **Send the partner** the snippet from `INSTALL.md` with their `partner_key` filled in.
5. **View subscribers** — SetReady admin → `/admin/widget`.

## Env already present (reused)
`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` (Option B), `NEXT_PUBLIC_APP_URL`.

## How control is kept
- Partner only ever gets a **key** + an **iframe**. No code, no data, no DB.
- Key is validated on every call; set `active=false` to switch a partner off instantly.
- Widget is feature-flagged to training + certificates — no roster/casting/messaging.
- "Powered by SetReady" shown in the widget footer.

## Not yet wired (intentional next steps)
- **Stripe webhook** to flip `paid=true`/`amount_cents` on `widget_enrollments` after a successful $9.99 payment (Option B). Today the checkout redirects back with `?paid=1`; add a webhook handler (mirror an existing one in `app/api/`) that updates the row for airtight accounting.
- **Emailing the certificate PDF** — reuse `lib/email.ts` + the existing certificate generator to send the PDF on completion.
- **Promo cap enforcement** — `partner_accounts.promo_cap` exists; enforce the monthly free-redemption limit in `config`/`enroll` when you want a hard cap.

## Verify locally
Open `public/widget/index.html` in a browser → it runs in **DEMO MODE** (offline, mock data) so you can click the full flow: enroll → modules → quiz → certificate.
