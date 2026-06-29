# SetReady — Project Handoff & State
*A complete context document for resuming SetReady work in a new conversation.*
*Owner: Mike (admin: mikebhangu@gmail.com). Status: live, in active development.*

> **How to use this in the new chat:** paste this file (or its key sections) at the start so
> Claude has full context. Claude does NOT carry memory between conversations — this file IS
> the memory. The full turn-by-turn history lives in `/mnt/transcripts/` (22 transcripts) and is
> cataloged in `/mnt/transcripts/journal.txt`. All delivered code files are in
> `/mnt/user-data/outputs/`.

---

## 1. WHAT SETREADY IS

A web platform for **Canadian film/TV background performers** (extras), connecting performers,
talent agents, and casting directors. Also includes a games/retention hub and several paid
features. 18+, Canada-only.

**User roles:** performer, agent (talent agency), casting_director, admin.

---

## 2. STACK & ENVIRONMENT

- **Framework:** Next.js 16.2.9, App Router, Turbopack.
- **Backend:** Supabase (Postgres + Auth + Row Level Security). SQL run manually in the Supabase
  web editor.
- **Payments:** Stripe (currently TEST mode for newer features; some live). Prices created in the
  Stripe dashboard; price IDs wired via Vercel env vars.
- **Email:** Resend (custom SMTP wired into Supabase Auth for confirmations).
- **Hosting:** Vercel (auto-deploys on git push to main).
- **Auth note:** email confirmation is ON; `public.users` mirrors `auth.users` (a recurring bug
  source — see §6).

---

## 3. WORKING METHOD (important — keep this)

- The user (Mike) is a self-described **rookie**, on **Windows / PowerShell**, using **Claude Code
  in VS Code** to apply edits.
- **Claude cannot see the live codebase.** The user pastes a file; Claude returns either exact
  **find/replace edit blocks** or full file contents, or **Claude Code paste-prompts**. Browser
  downloads have been unreliable — find/replace via Claude Code is the proven delivery method.
- The user runs **SQL in the Supabase web editor**, manages **Vercel/Stripe/Resend dashboards**
  manually.
- **`npm run build`** is the fast full-app typecheck/compile; it won't catch missing env vars,
  third-party failures, or logic errors.
- **VERSION every delivered file; never reuse a filename.** Match env var names EXACTLY.
- **RECURRING LESSON:** Claude Code frequently **misreports/summarizes tool output** (especially
  greps and file reads). Always demand RAW output and verify before committing. Don't let Claude
  Code auto-commit before the user reviews.

---

## 4. WHAT'S BEEN BUILT (cumulative, all delivered & largely live)

**Core platform & remediation:**
- Completed an original 13-item security/correctness audit, then a second full BUILD_REVIEW
  security audit (fixed: broken account-deletion/Stripe-cancel, dead payout route,
  unauthenticated check-in endpoint, Stripe webhook idempotency; deferred a forgeable
  quiz→certificate chain).
- Referral-code signup bug fixed. Privacy/Terms rewritten, age-gated 18+/Canada-only.
- Self-serve password reset (agents + casting directors) with show/hide toggle.
- Settings tabs (change name/password) for agent + casting dashboards.
- Fixed many route-vs-DB schema-mismatch 500s (recurring root cause across the app).
- Fixed the systemic `public.users` mirror bug (auth users not mirrored after confirmation
  was enabled).

**Booking & casting:**
- 5-phase agent/casting booking-hold feature (performer accept; agent place/confirm/cancel;
  casting place/cancel; iCal busy-marking).
- Casting-request moderation system (per-director trust + global review override + admin
  approve/reject/pull/pause/resume + CD trust/suspend + "who was cast" analytics + agent
  report button).
- Agent roster (add/list/names/profile) fully repaired.
- Messaging/message-center (save + soft-delete; read-state; admin all-platform-messages view;
  system/welcome message handling).
- "What's Filming" province page.

**Paid features (monetization):**
- **Paid Profile Boost** (one-time tiered, search-ranking uplift).
- **Pro Insights** — Profile View Analytics ($4.99).
- **Verified Badge** ($9.99) with admin review tab + "Verified Pro" green-pill across
  dashboard/profile/search.
- **Promo-code system** (type column: %/fixed/free-trial) for paid features.
- Admin email notifications (pending CD/agency applications + casting requests needing approval).
- Per-agent email notification toggle.

**Games / retention hub (`/games`):**
- **Studio Tycoon** (idle game) + **Set Match** (Match-3) — localStorage state, daily streak,
  offline earnings, prestige, 4-chapter Ambitions.
- **Set Crashers** — Angry-Birds-style matter-js slingshot physics game. Heavily developed:
  limited-use ammo economy, milestone/escalating jackpot rewards, sound engine, combos,
  perfect-clear, daily streak, badges, Director's Cut boss levels, power-ups (stackable buffs +
  super power-ups), boomerang projectile, bounce/deadfall mechanics, Box Office scoring,
  **cross-user leaderboard** (Supabase table + API), sequential level unlock, and **182 unique
  levels across 5 packs**. **Key architecture win:** levels were extracted into a data file
  (`setcrashers-levels.ts`) so adding content is zero-risk.
- **A-List Interactive Scenes** — an AI acting game built from scratch (page + AI route + Stripe
  checkout; paid 20-scene model; voice input; tutorial). Uses Anthropic API server-side with
  **Haiku for cheap calls / Sonnet for heavy** + strict JSON (cost control).
- Reusable Stripe purchase layer for games (`/api/game-purchases` + webhook branch); all game
  pack price IDs created (test mode).

**Admin oversight:**
- Full admin console: agency + casting-director detail/edit/roster routes, drill-down UI,
  dedicated /admin Oversight tab, **`admin_audit_log`**, PIPEDA privacy disclosure.
- Helpers: `verifyAdminRequest`/`isAdminUser`/`supabaseAdmin` (from `@/utils/isAdmin`).

**Conceptual (NOT built):**
- A digital BG-talent **voucher/work-log system** — full blueprint only
  (`SetReady-Vouchers-Circus-System-BUILD-SPEC.md`), with industry research. Decided NOT to
  consolidate with the pre-existing voucher feature.

---

## 5. KEY DELIVERED FILES IN `/mnt/user-data/outputs/`

Game: `set-crashers-page-v6.tsx` (latest), `setcrashers-levels.ts` (182 levels),
`setcrashers-Leaderboard.tsx`, `setcrashers-leaderboard-route.ts`,
`setcrashers-leaderboard-table.sql`, `setcrashers-score-route.ts`, `setcrashers-scoring.js`,
phase install/edit notes (`setcrashers-PHASE1..4`, `setcrashers-PAGE-EDITS.txt`).
A-List: `alist-page-v3.tsx` (latest), `alist-route-v2.ts`, `alist-checkout-route-v2.ts`.
Admin: `AdminDetailPanels.tsx`, `admin-agency-detail-route.ts`, `admin-casting-detail-route.ts`,
`admin-access-privacy-disclosure.md`.
Platform: `page.tsx` (dashboard), `availability-page.tsx`, `bookings-route.ts`,
`bookings-id-route.ts`, `casting-auth.ts`, `game-purchases-route.ts`, `stripe-webhook-route.ts`,
`privacy-page.tsx`, `terms-page.tsx`, `unsubscribe-route.ts`, `route.ts`, `analyze-route.ts`,
`headshot-analyzer-page.tsx`, `availability-reminder-route.ts`, `AvailabilityReminder.tsx`,
`next.config.ts`.
Spec: `SetReady-Vouchers-Circus-System-BUILD-SPEC.md`.

*(Many have versioned predecessors v1–v5; always use the highest version unless told otherwise.)*

---

## 6. RECURRING BUG PATTERNS (check these first when something 500s)

1. **Route-vs-DB schema mismatches** — code references column/table names that don't exist, or
   CHECK constraints too narrow, or missing nullable. The #1 cause of agent/casting route 500s.
   Fix by dumping the actual schema first.
2. **`public.users` mirror gaps** — auth users not mirrored after email confirmation was enabled.
3. **Stripe live-vs-test price mode** mismatches; `id` vs `user_id` in webhooks.
4. **Env var name mismatches** between code and Vercel (silent breakage).
5. **Corrupted `.next`/PWA dev freeze** — clear `.next` to resolve.
6. **Claude Code misreporting tool output** — verify RAW output before acting.

---

## 7. LIKELY RESUME POINTS / OPEN THREADS

- Set Crashers: power-up/economy polish was iterative; confirm current state in the live build
  before adding more. The 182-level data file is the place to add/edit content.
- A-List: paid scene model live in test mode; could expand scenes or move to live Stripe.
- Stripe: several features in TEST mode — going live means recreating prices in live mode +
  swapping env vars.
- Voucher system: spec exists, never built — decide build vs shelve.
- General: continue the schema-mismatch hardening; any new route should be checked against the
  real Supabase schema first.

---

## 8. RELATED PROJECT (separate, conceptual)

**CouncilReady** — a Canada-wide learning app for municipal elected officials, conceptualized by
re-skinning the SetReady engine. CONCEPTUAL ONLY (no code). Its full state is in
`CouncilReady-Project-State.md` + `CouncilReady-Master-Blueprint.md` +
`CouncilReady-dashboard-current.html`. Keep it separate from SetReady work unless the user
bridges them.

---

*To resume SetReady in the new chat: paste this file, state which feature/bug you're tackling,
and paste the current version of the relevant file(s). Reminder to Claude: demand raw tool
output, version every file, match env var names exactly, and check the real schema before
writing any route.*
