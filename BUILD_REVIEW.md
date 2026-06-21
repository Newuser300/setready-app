# SetReady Codebase Audit — 2026-06-19

---

## CRITICAL (money / security / data loss)

---

**CLIENT-SIDE supabase.auth.admin.deleteUser() CALL**
- File: `app/settings/page.tsx:243`
- What: `supabase.auth.admin.deleteUser(user.id)` is called from a `'use client'` component using the browser-anon client (`createBrowserClient`). The `.admin` namespace is server-only and requires the service-role key; the browser client does not have it. This call silently fails (or throws) in production.
- Why: Account deletion appears to succeed to the user (it deletes DB rows first, then signs out), but the Supabase Auth user record is never removed. The user can sign back in and their data (minus the rows deleted) may be in an inconsistent state. An orphaned auth user also pollutes the auth user count.
- Fix: Move the delete logic into a new server route (`/api/account/delete`), perform all DB deletes there using `supabaseAdmin`, call `supabaseAdmin.auth.admin.deleteUser(userId)`, and have the client just call that route.

---

**DEAD LEMON SQUEEZY CALL IN SETTINGS — subscription_id COLUMN QUERIED**
- File: `app/settings/page.tsx:131-154` and `app/settings/page.tsx:201`
- What: `cancelLemonSqueezySubscription()` POSTs to `/api/lemon/cancel-subscription`, which does not exist (no `app/api/lemon/` directory was found). Additionally, `deleteAccount()` at line 201 queries `.select('subscription_id, subscription_status')` — the column `subscription_id` is a Lemon Squeezy legacy column. The current schema uses `stripe_subscription_id`. So the query returns `null` for `subscription_id` even for active Stripe subscribers, meaning the LS cancellation path (which itself hits a dead route) is never triggered for any real subscriber.
- Why: When a Stripe subscriber deletes their account, their Stripe subscription is never cancelled. They continue to be billed. This is a financial and contractual failure.
- Fix: Replace `cancelLemonSqueezySubscription` with a call to a server route that calls `stripe.subscriptions.cancel(user.stripe_subscription_id)`. Change the query to `select('stripe_subscription_id, subscription_status')` and guard on `userData?.stripe_subscription_id`.

---

**DEAD PAYOUT ROUTE — affiliate/request-payout**
- File: `app/components/PayoutRequestForm.tsx:26`
- What: POSTs to `/api/affiliate/request-payout`. No such route exists in `app/api/affiliate/`. The affiliate directory has `register-click`, `track-signup`, and `qualify` — not `request-payout`. The referral payout path uses `/api/referral/request-payout` (which does exist).
- Why: Every payout request submitted through `PayoutRequestForm` gets a network 404. Affiliates cannot request payouts.
- Fix: Either create `app/api/affiliate/request-payout/route.ts` or change the fetch URL to `/api/referral/request-payout`.

---

**STRIPE WEBHOOK — NO IDEMPOTENCY GUARD**
- File: `app/api/webhooks/stripe/route.ts:60-374`
- What: The webhook handler has no event-level idempotency check. Stripe can and does replay webhook events (retries on timeout, explicit test replays, potential queue bugs). For `invoice.paid` (line 147), this is partially mitigated by the `existingCommissions` count check (lines 256-262), but `subscription_status`, `stripe_subscription_id`, and `subscription_ends_at` are overwritten unconditionally on every replay. For `checkout.session.completed` there is no guard at all — a replayed `section2` event would write `section2_unlocked: true` again (harmless), but a replayed subscription checkout would re-upsert status blindly. More importantly, a race between two concurrent deliveries of the same event (Stripe's at-least-once guarantee) could create duplicate rows or inconsistent states.
- Why: Medium business-logic risk; low immediate financial risk given the writes are mostly idempotent in effect, but the pattern is fragile.
- Fix: Store processed event IDs in a `stripe_webhook_events` table and check for `event.id` before processing. Return 200 immediately for duplicates.

---

**CLIENT WRITES TO PROGRESS COLUMN VIA BROWSER CLIENT (RLS-ONLY)**
- File: `app/dashboard/page.tsx:664-667` and `app/dashboard/page.tsx:708-712`
- What: `supabase.from('users').update({ section1_completed: true }).eq('id', session.user.id)` is called directly from the client `'use client'` component using the browser anon client. This write goes through RLS, not via `supabaseAdmin`. `section1_completed` is a progress/entitlement gate (it controls when Section 2 becomes visible).
- Why: If RLS for the `users` table is not correctly scoped to allow self-updates of `section1_completed`, this silently fails and the section does not unlock. More importantly, any user can forge a direct Supabase anon-key request setting `section1_completed: true` for any user ID that RLS permits — bypassing actual completion. This should be a server-side write validated against real completion state.
- Fix: Move the `section1_completed` write to an API route that validates all section-1 module completions in `user_progress` before setting the flag, using `supabaseAdmin`.

---

## HIGH (broken core flow)

---

**DEAD ROUTE: /api/lemon/cancel-subscription**
- File: `app/settings/page.tsx:133`
- What: The route `app/api/lemon/cancel-subscription` does not exist. The fetch at line 133 will always get a 404. This is a secondary call from `cancelLemonSqueezySubscription()` which is itself called from `deleteAccount()`. The response-not-ok branch at line 141-144 catches the failure and prompts the user to continue anyway, so account deletion still proceeds — but subscription is never cancelled.
- Why: Covered in the CRITICAL finding above but listed separately as a route contract failure.
- Fix: Remove the function; replace with a Stripe cancellation server route.

---

**checkout/section2 USES supabase.auth.getUser(token) ON COOKIE CLIENT**
- File: `app/api/checkout/section2/route.ts:22-23`
- What: The route creates a cookie-based `createClient()` then calls `supabase.auth.getUser(token)` with a Bearer token extracted from the `Authorization` header. The `createServerClient` from `@supabase/ssr` does not accept a raw access token in `getUser()` in the same way as the admin client — the token argument to `getUser()` in the SSR client is not an officially documented pattern and may silently resolve from the cookie instead, or fail inconsistently.
- Why: Authentication may work in some environments and fail in others. `app/api/checkout/section1/route.ts` correctly uses `supabaseAdmin.auth.getUser(token)` for Bearer token fallback (line 25). Section 2 should do the same.
- Fix: When a Bearer token is present, validate it with `supabaseAdmin.auth.getUser(token)` (as section1 does). Remove `const supabase = await createClient()` from that code path.

---

**UNAUTHENTICATED QR SIGN-IN ENDPOINT**
- File: `app/api/casting/signin/checkin/route.ts:4-71`
- What: The endpoint accepts a QR token, performer ID and performer name with zero authentication. Anyone who knows (or guesses) a valid `qr_token` can sign any performer into any production session. The performer name path (line 23-29) even accepts an `ilike` search that can match partial email addresses.
- Why: An unauthorized actor can mark performers as present/absent, manipulate production attendance records, and enumerate performer emails via the name search.
- Fix: Require the performer to be authenticated via Supabase auth (cookie session) before allowing the check-in. Validate that `resolvedPerformerId` matches the authenticated user's ID. The name-search fallback should be removed or restricted to casting-session callers only.

---

**DOUBLE DELETE PAGE — app/settings/delete/page.tsx**
- File: `app/settings/delete/page.tsx:1-57`
- What: A second, separate account-deletion page exists at `/settings/delete` that deletes from `user_progress`, `certificates`, and `users` via the browser client (RLS only), without cancelling any subscription and without the auth.admin.deleteUser call. This shadow page has no confirmation beyond the text-input guard.
- Why: Two different code paths for the same destructive operation, both broken in different ways — this one misses the auth user deletion entirely and leaves a dangling Supabase Auth account. An active Stripe subscription is not cancelled.
- Fix: Remove this page (or redirect to `/settings`) and funnel deletion through the single server-side route described in the CRITICAL fix above.

---

## MEDIUM (correctness / UX)

---

**Legacy subscription_id COLUMN SELECT IN settings**
- File: `app/settings/page.tsx:201`
- What: `.select('subscription_id, subscription_status')` — the column `subscription_id` is the old Lemon Squeezy field. All active billing uses `stripe_subscription_id`.
- Why: The query returns `null` for `subscription_id` on all current subscribers, so the subscription-cancellation guard (`userData?.subscription_id`) at line 210 is always falsy. Current Stripe subscribers will have their account deleted without subscription cancellation even after the dead-route issue is fixed.
- Fix: Change to `.select('stripe_subscription_id, subscription_status')` and update the guard accordingly.

---

**CASTING AI-SEARCH CLIENT CALL TO EXISTING SERVER ROUTE (minor)**
- File: `app/casting/dashboard/page.tsx:511`
- What: `fetch('/api/casting/ai-search', ...)` is called from the casting dashboard. The route does exist at `app/api/casting/ai-search/route.ts`. This is NOT a dead route. Noted here because the route was not in the initial Glob listing (truncated); confirmed via separate glob search.
- Why: No issue — route exists.
- Fix: No action needed.

---

**ADMIN CHECK ROUTE — EMPTY CATCH SWALLOWS ERRORS**
- File: `app/api/admin/check/route.ts:18`
- What: `catch { return NextResponse.json(...)` — the catch block is empty of any logging. This is consistent across several admin routes. If `supabaseAdmin.auth.getUser(token)` throws a network error, the 500 response is returned without any error being logged or surfaced.
- Why: Makes debugging auth failures silently difficult in production.
- Fix: Add `console.error(e)` in catch blocks that return 500s.

---

**WEBHOOK RACE: checkout.session.completed SETS subscription_status = active BEFORE invoice.paid**
- File: `app/api/webhooks/stripe/route.ts:127-132`
- What: For subscription sessions, `checkout.session.completed` immediately sets `subscription_status = 'active'` (line 128). `invoice.paid` then also sets it (line 225). This is intentional per the inline comment, but if `checkout.session.completed` arrives after `invoice.paid` fails or is never delivered (e.g., during local dev), the user gets access based solely on the checkout session without confirmed payment.
- Why: In normal Stripe flows these always fire together, so risk is low in production; however, a one-time section2 `checkout.session.completed` with mode `payment` correctly does NOT pre-activate (only unlocks after the event). The inconsistency between subscription vs payment treatment is intentional but worth noting.
- Fix: Low priority. The current behavior is a conscious design choice (see inline comment). Document it.

---

**MISSING REFERRAL COLUMN VALIDATION IN referral/apply**
- File: `app/settings/page.tsx:165-182`
- What: The client POSTs to `/api/referral/apply` with `{ code: referralInput.trim() }`. The route exists and the server validates the code. This is fine. However, after the server responds OK, the client sets `referredBy` to the raw input (line 172) rather than a normalized server-returned value. A user who types `abc12345` would see `ABC12345` shown (because input is uppercased at line 409 on change) — this is cosmetic only.
- Why: Minor UX cosmetic.
- Fix: Return and display the normalized code from the server response.

---

**DUPLICATE supabase CLIENT INSTANCES IN SETTINGS PAGE**
- File: `app/settings/page.tsx:9` and `app/settings/page.tsx:51`
- What: The module-level `const supabase = createClient()` (line 9) is used for DB queries; then inside `loadUserAndProfile()`, a second `const bc = createClient()` is created just for `bc.auth.getUser()`. Two separate browser clients are alive simultaneously.
- Why: Not a correctness bug (both clients share the same underlying token), but wasteful and confusing.
- Fix: Use one module-level client consistently.

---

**CASTING/SIGNIN/CHECKIN — PERFORMER NAME SEARCH PARTIAL EMAIL DISCLOSURE**
- File: `app/api/casting/signin/checkin/route.ts:24-29`
- What: The `performerName` parameter is used in an `ilike` search against `email` and `full_name`. Because this endpoint has no auth gate, an attacker can enumerate whether emails containing a substring exist in the `users` table.
- Why: Partial email enumeration via an unauthenticated endpoint. Data exposure risk.
- Fix: Add authentication gate (see HIGH finding above). Restrict name search to authenticated callers.

---

**DASHBOARD CLIENT WRITES section1_completed WITHOUT SUPABASE ADMIN**
- File: `app/dashboard/page.tsx:664`
- What: Already listed in CRITICAL. Repeated here to note that the second occurrence at line 710 is in `loadModules()`, which runs on initial page load — so the write could be triggered multiple times if the user refreshes while all section-1 modules are completed.
- Why: If RLS allows self-write, this is merely redundant. If RLS is strict, the first refresh might fail to unlock Section 2 visibility persistently.
- Fix: See CRITICAL finding — route-ify this write.

---

## LOW (cleanup)

---

**LARGE DUMP FILES IN GIT HISTORY**
- File: `setready-dump.txt`, `setready-dump-safe.txt` (git-tracked)
- What: Two large text dumps (~30,000+ lines each) are committed to the repository. They are snapshots of the codebase at a point in time and duplicate code already in source files.
- Why: They bloat the repo, slow clones, may cause confusion about canonical source of truth, and could inadvertently expose old code versions.
- Fix: Add them to `.gitignore`, remove from git tracking (`git rm --cached`), and delete them locally if no longer needed.

---

**NEXT_PUBLIC_ PRICE IDs IN .env.local**
- File: `.env.local:31,35,39` (not git-tracked)
- What: Stripe Price IDs (`NEXT_PUBLIC_STRIPE_SECTION_1_PRICE_ID`, `_SECTION_2_PRICE_ID`, `_HEADSHOT_PRICE_ID`) are defined with the `NEXT_PUBLIC_` prefix, exposing them to the browser bundle. The live API routes (`checkout/section1`, `checkout/section2`) correctly use `STRIPE_SECTION_1_PRICE_ID` and `STRIPE_SECTION_2_PRICE_ID` (no `NEXT_PUBLIC_`), so there is no current server-side leakage from this. However, the NEXT_PUBLIC_ variants could be accidentally used in a future route, or they could leak Stripe price identifiers to end users via the JS bundle.
- Why: Price IDs are not secrets (they don't allow charges on their own), but leaking them is unnecessary and could inform competitors or bad actors about pricing structure. More importantly, the inconsistency between env variable names (`NEXT_PUBLIC_` in .env.local vs server-only in routes) risks a future developer accidentally wiring the wrong variable.
- Fix: Remove the `NEXT_PUBLIC_` variants from `.env.local` (and from any production env config). Use only `STRIPE_SECTION_*_PRICE_ID`.

---

**MANY : any USAGES IN API ROUTES**
- File: Multiple files under `app/api/` (see grep results)
- What: Extensive use of `: any`, `as any`, and `let body: any` throughout API routes and webhook handlers.
- Why: Removes TypeScript protection from JSON shapes. Errors like accessing `invoiceAny.parent?.subscription_details?.subscription` (webhook, line 153) rely on correct runtime shapes with no compile-time safety.
- Fix: Define typed interfaces for Supabase row shapes and Stripe event shapes. Incremental improvement.

---

**DEBUG PAGE ACCESSIBLE IN PRODUCTION**
- File: `app/debug-auth/page.tsx`
- What: A server-rendered page at `/debug-auth` dumps full user and session objects into the HTML. No auth gate — any authenticated user can visit it and see their own auth state exposed as JSON.
- Why: Low risk (only shows the requesting user's own data), but exposes session internals unnecessarily in production.
- Fix: Remove this page or gate it behind `isAdmin`.

---

**EMPTY catch{} IN dashboard POLL LOOP**
- File: `app/dashboard/page.tsx:568`
- What: `try { await fetch('/api/subscription/activate', ...) } catch {}` — a blank catch that swallows all errors silently.
- Why: If the activate call throws, no error is logged or surfaced to the user. Low severity since this is a fallback path.
- Fix: Add `console.error(err)` at minimum.

---

## Overall Assessment

The core billing/auth plumbing (Stripe webhook writes via `supabaseAdmin`, casting/agent JWT sessions, admin whitelist verification) is generally sound. However, the `app/settings/page.tsx` file contains three compounding bugs that make account deletion functionally broken and financially dangerous: it queries a legacy Lemon Squeezy column (`subscription_id`) instead of `stripe_subscription_id`, calls a dead route (`/api/lemon/cancel-subscription`), and invokes `supabase.auth.admin.deleteUser()` from the browser client where it cannot work. Together, a Stripe subscriber who deletes their account will have their DB rows removed and be signed out, but their Stripe subscription will keep billing them and their Auth user record will persist as an orphan. Additionally, `app/api/casting/signin/checkin/route.ts` is a zero-auth endpoint that allows anyone with a QR token to forge production attendance and enumerate emails. These two families of bugs should be treated as immediate-priority fixes before shipping to additional users.

---

## Top 5 Fixes (priority order)

1. **Rewrite deleteAccount() as a server route** — Fix `app/settings/page.tsx` to POST to a new `/api/account/delete` route. In that route: query `stripe_subscription_id` (not `subscription_id`), cancel the Stripe subscription via `stripe.subscriptions.cancel()`, delete all user DB rows via `supabaseAdmin`, and call `supabaseAdmin.auth.admin.deleteUser(userId)`. Remove the dead LS function.

2. **Add auth gate to /api/casting/signin/checkin** — Require the calling performer to present a valid Supabase session cookie or Bearer token. Verify that `resolvedPerformerId === authenticatedUserId`. Remove or restrict the name-search enumeration path.

3. **Fix affiliate payout dead route** — Either create `app/api/affiliate/request-payout/route.ts` or change `PayoutRequestForm.tsx:26` to call `/api/referral/request-payout`. This is the only user-facing payout path and currently returns 404 every time.

4. **Move section1_completed write to a server route** — Remove `supabase.from('users').update({ section1_completed: true })` from `app/dashboard/page.tsx` (lines 664 and 710). Create a server route that verifies all section-1 modules are completed in `user_progress` before writing the flag with `supabaseAdmin`.

5. **Add webhook event idempotency** — In `app/api/webhooks/stripe/route.ts`, create a `stripe_webhook_events` table (columns: `event_id TEXT PRIMARY KEY`, `processed_at TIMESTAMPTZ`). At the top of the POST handler, check if `event.id` already exists; return 200 immediately if so. Insert the event ID before processing each case.
