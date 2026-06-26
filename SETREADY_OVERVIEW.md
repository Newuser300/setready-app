# SetReady — Comprehensive Codebase Overview

> **Purpose of this document:** A self-contained reference for any developer or AI agent working on this codebase who has no prior access to the code. Everything here was derived from the actual source; nothing was guessed.

---

## 1. What the App Is

SetReady (`setready.site`) is a **Canadian background performer platform** — a web application (with optional mobile shell) designed to serve everyone in the background acting ecosystem:

- **Performers** — learn the craft, manage their career, get cast, track pay
- **Talent Agents / Agencies** — manage rosters, receive casting requests, submit performers
- **Casting Directors** — post requests, browse performer profiles, confirm bookings
- **Admins** — oversee the platform, moderate content, manage payments, send messages

**Core value proposition:** A one-stop tool for Canadian background performers and their agents to train for set work, track union eligibility, manage availability, log bookings, and connect with castings — all in one place.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js `^16.2.7` (App Router, React 19) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4, inline styles, `clsx`, `tailwind-merge`, `class-variance-authority` |
| Animation | Framer Motion |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (cookie-based for performers, custom JWT for agents/casting directors) |
| File Storage | Supabase Storage (buckets: `headshots`, `residency-documents`, `journal-photos`, `voucher-photos`) |
| Payments | Stripe (subscriptions + one-time payments) |
| Email | Resend (`notifications@setready.site`) |
| AI | Anthropic Claude (`claude-sonnet-4-6`) — headshot analysis, natural-language performer search |
| PDF Generation | `@react-pdf/renderer` |
| Calendar | `ics` (iCal export), `node-ical` |
| QR Codes | `qrcode` |
| Weather | Open-Meteo API (free, no key required) |
| CSV Import | `papaparse` |
| Error Monitoring | Sentry (`@sentry/nextjs`) |
| Mobile | Capacitor 8 (iOS + Android shell) |
| PWA | Web app manifest + service worker |
| Hosting | Vercel (implied by `VERCEL_ENV`, `output: 'standalone'`) |
| CI / Hooks | Husky |

---

## 3. Architecture

### Folder Structure

```
setready/
├── app/                         # Next.js App Router pages + API routes
│   ├── page.tsx                 # Landing / marketing page
│   ├── layout.tsx               # Root layout (Inter font, Toaster, PWA meta)
│   ├── globals.css
│   ├── dashboard/               # Performer main dashboard
│   ├── profile/                 # Performer profile editor
│   ├── module/[id]/             # Individual training module viewer
│   ├── availability/            # Performer availability calendar
│   ├── work-log/                # Booking / work history log
│   ├── voucher-wallet/          # Union voucher tracker
│   ├── journal/                 # Personal journal with photos
│   ├── contacts/                # Industry contact book
│   ├── headshot-analyzer/       # AI headshot critique tool
│   ├── rate-calculator/         # Pay calculator (UBCP/ACTRA rates)
│   ├── simulator/               # Set etiquette scenario quiz
│   ├── games/
│   │   ├── page.tsx             # Games hub
│   │   ├── film-trivia/         # Film trivia quiz game
│   │   ├── set-match/           # Candy-crush style match-3 game
│   │   └── studio-tycoon/       # Idle tycoon game
│   ├── glossary/                # Film set terminology reference
│   ├── clothing/                # What to wear on set guide
│   ├── residency/               # Residency document uploader
│   ├── referrals/               # Referral program dashboard
│   ├── whats-filming/           # Links to regional production lists
│   ├── agencies/                # Agency directory
│   ├── messages/                # In-app message center (performers)
│   ├── settings/                # Account settings
│   ├── goals/                   # Personal goal tracking
│   ├── donate/                  # Support/donation page
│   ├── redeem/                  # Voucher / promo code redemption
│   ├── claim/                   # Profile claim flow (for invited performers)
│   ├── casting-portal/          # Gate page → agent or casting director login
│   ├── signin/[token]/          # QR-code-based on-set sign-in page
│   ├── agent/
│   │   ├── login/               # Agent login
│   │   ├── register/            # Agency registration
│   │   ├── dashboard/           # Agent main dashboard
│   │   ├── about/               # Agent info page
│   │   ├── import/              # CSV roster import
│   │   ├── join/                # Join existing agency
│   │   ├── messages/            # Agent message center
│   │   └── settings/            # Agent settings
│   ├── casting/
│   │   ├── login/               # Casting director login
│   │   ├── register/            # Casting director registration
│   │   ├── dashboard/           # Casting director dashboard
│   │   ├── about/               # Casting director info page
│   │   └── messages/            # Casting director message center
│   ├── admin/                   # Admin panel (performers-only auth gate)
│   ├── auth/                    # Supabase auth callback/reset flows
│   │   ├── callback/
│   │   ├── sign-in/
│   │   ├── sign-up/
│   │   ├── sign-out/
│   │   ├── reset-password/
│   │   ├── update-password/
│   │   ├── refresh-session/
│   │   ├── delete/
│   │   ├── [token]/
│   │   └── token/
│   ├── payment-processing/      # Post-Stripe redirect handler
│   ├── privacy/                 # Privacy policy
│   ├── terms/                   # Terms of service
│   ├── rights/                  # Know your rights page
│   └── api/                     # All API route handlers (see Section 6)
├── lib/                         # Server-side utilities
│   ├── email.ts                 # Resend wrapper + email HTML templates
│   ├── casting-auth.ts          # JWT session management for agents/CDs
│   ├── casting-notify.ts        # Notification + message helpers
│   ├── messages.ts              # sendMessage / broadcastMessage / replyToMessage
│   ├── ai-casting.ts            # Scoring algorithm + AI performer search
│   ├── booking-weather.ts       # Open-Meteo weather fetch
│   ├── film-regions.ts          # Canadian film regions (codes, cities, coords)
│   ├── union-rules.ts           # Province-by-province union membership rules
│   ├── promo.ts                 # Promo code validation + application
│   ├── lessons.ts               # Training module lesson content
│   ├── questions.ts             # Training module quiz questions
│   ├── certificate-generator.tsx# PDF certificate generation
│   ├── compress-image.ts        # Client-side image compression
│   └── provinces.ts             # Province list
├── utils/
│   ├── supabase/
│   │   ├── client.ts            # Browser Supabase client (anon key)
│   │   ├── server.ts            # Server Supabase client (cookie-based)
│   │   ├── admin.ts             # Service-role Supabase client (bypasses RLS)
│   │   └── middleware.ts        # Session refresh middleware
│   └── isAdmin.ts               # Admin verification helpers
├── components/
│   ├── Logo.tsx
│   ├── Copyright.tsx
│   ├── LoadingScreen.tsx
│   ├── PWAInstaller.tsx
│   └── AvailabilityReminder.tsx
├── next.config.ts               # Next config (standalone output, unoptimized images)
├── package.json
├── .env.local                   # Environment variables (see Section 7)
└── capacitor.config.*           # Capacitor mobile config
```

### Authentication Architecture

There are **two separate auth systems** running side-by-side:

1. **Performer auth** — Supabase Auth with cookie sessions. All performer-facing pages use `createClient()` from `utils/supabase/server.ts` (reads `sb-*` cookies set by the Supabase SSR library). Auth callbacks go through `/auth/callback`.

2. **Agent + Casting Director auth** — Custom JWT system in `lib/casting-auth.ts`. Signs HS256 JWTs with `CASTING_JWT_SECRET`, stores live tokens in the `casting_sessions` Supabase table, and reads them from HTTP-only cookies (`agent_session` and `casting_session`). Logout deletes the DB row, immediately invalidating the token.

**Admin access** is controlled by `utils/isAdmin.ts`: a hardcoded `ADMIN_EMAILS` env var AND/OR a `admin_emails` Supabase table. Both are checked; either one grants access.

### Data Flow

```
Browser → Next.js API Route → supabaseAdmin (service-role) → PostgreSQL
                            ↘ Stripe API
                            ↘ Resend API
                            ↘ Anthropic API
                            ↘ Open-Meteo API
```

Client components use `utils/supabase/client.ts` for real-time subscriptions (e.g. `user_progress` Postgres changes channel on the dashboard) and for reading Supabase Storage URLs. All mutations go through Next.js API routes.

---

## 4. Features — Screen by Screen

### Performer-Facing

#### `/` — Landing Page
- Marketing page with feature highlights (free tools list, premium training pitch)
- Auto-redirects authenticated users to `/dashboard`
- Install-to-home-screen prompt

#### `/dashboard` — Main Dashboard
- Welcome header with user name + Verified Pro badge
- Section 1 progress bar (modules completed / total)
- Union progress card (voucher wallet summary, % toward union eligibility)
- PWA install banner
- Quick-action grid: Profile, Film Set Terms, What to Wear, Residency Docs, Work Log, Contacts, Set Etiquette Simulator, Rate Calculator, Know Your Rights (external UBCP link), My Referrals, What's Filming, Find Agencies, Agency Click (credential helper for agencyclick.com), SetReady Casting portal, Availability, Voucher Wallet, Headshot AI, Games, Messages, Support SetReady
- Getting-started checklist (dismissable, persisted in localStorage)
- Casting message alert (shows count of unread casting messages)
- Subscription upsell banners for Section 1 ($9.99/month) and Section 2 ($19.99 one-time)
- Promo/access code entry field
- Section 1 training modules list (5 modules; locked if unsubscribed)
- Section 2 "secret section" (4 modules; unlocked after completing Section 1 + purchasing)
- Certificates display (all earned certs, with scores and dates)
- Notification panel (casting notifications bell)
- Union milestone notification panel (voucher wallet bell)
- Admin link (visible only to admins)
- IOS install tip banner (Safari share button instructions)
- Subscription activation polling (after Stripe redirect with `?subscribed=true`)
- Referral code prompt before checkout

#### `/module/[id]` — Training Module
- Reads module content from `lib/lessons.ts`
- Quiz questions from `lib/questions.ts`
- Subscription gate for Section 1 modules (redirects to subscribe)
- Section 2 unlock gate
- Score tracking (out of 15 questions per module)
- On completion, marks `user_progress` record and issues a certificate
- Certificate download as PDF (via `lib/certificate-generator.tsx`)

#### `/profile` — Profile Editor
Full performer profile with collapsible sections:
- Personal: name, email, phone, date of birth, gender, headshot upload
- Physical: height (cm/feet), weight, hair color, length, texture, eye color, skin tone, facial hair, body type, ethnicity
- Union: union status (UBCP permit/apprentice/full, ACTRA apprentice/full, non-union)
- Sizes: shirt, jacket, dress, hat, shoe sizes
- Experience: experience level, training background
- Skills: accents, sports, dance, instruments, driving, swimming, languages, other skills
- Availability: travel willingness, region, travel radius
- Bio / notes
- Headshot upload (compressed client-side before upload; stored in Supabase `headshots` bucket)
- Home city / region (for geographic filtering by casting directors)

#### `/availability` — Availability Calendar
- Monthly grid calendar with per-day status: available (green), unavailable (red), booked (blue), morning only, afternoon only
- Click a day to toggle status with optional notes
- Integrated booking display: shows pending (purple) and confirmed (blue) bookings from agents/casting directors on the same calendar
- Performer can accept or decline pending bookings directly from the calendar
- Color legend

#### `/work-log` — Booking/Work Log
- Log entries for each booking: date, production name, location, role, character name, hours worked, lunch break, union/non-union flag, pay rate, gross pay, deductions, final pay, paid status, notes, production type, agency
- Voucher photo attachment per entry (stored in Supabase storage)
- Export to CSV
- Summary stats: total entries, total gross, total final pay, unpaid count

#### `/voucher-wallet` — Union Voucher Tracker
- Add union vouchers: production name, shoot date, role type, union type, days worked, qualifying flag, voucher number, photo upload
- Milestones display (percentage toward union entry)
- Filter tabs: all / qualifying / non-qualifying / in-window / outside-window
- Progress bar toward qualifying days requirement (province-specific rules from `lib/union-rules.ts`)
- "You qualify" banner when threshold is met
- Unread milestone notifications

#### `/headshot-analyzer` — AI Headshot Analyzer
- Upload a headshot photo (client-side compressed)
- Two-phase Claude analysis via `/api/headshot-analyzer/analyze`:
  - Phase 1: photo critique (lighting, composition, expression, background, professionalism; overall score 0–100)
  - Phase 2: casting profile (casting type, playable age range, character match suggestions, wardrobe notes, background work tips)
- Credit system: free credits (from DB) + paid credits via Stripe
- Credit balance shown; purchase more via `/api/checkout/headshot`

#### `/rate-calculator` — Pay Calculator
- Select province (province-specific tax rates from `lib/provinces.ts`)
- Select union/non-union
- Select role type: General Background Performer, Stand-in, Special Ability Background Performer, Photo Double
- Enter hours worked
- Shows: daily base, overtime rates, gross pay, deductions (CPP, EI, provincial tax), net pay
- UBCP/ACTRA 2025-2028 rates hardcoded

#### `/messages` — Message Center (Performers)
- Inbox: direct messages + broadcast messages (all_performers, all_users)
- Read receipts tracked separately (`message_read_receipts` table)
- Reply threading (`thread_id`, `parent_message_id`)
- Filter by message type, unread only
- Pagination (30 per page)

#### `/contacts` — Industry Contact Book
- CRUD for industry contacts (`film_contacts` table): name, role, company, phone, email, notes
- Alphabetically sorted

#### `/journal` — Personal Journal
- Private daily journal entries
- Photo attachments per entry (stored in `journal-photos` Supabase bucket; signed URLs fetched on demand)
- Date-ordered display

#### `/referrals` — Referral Program
- Each performer gets a unique referral code
- Referred user gets a benefit (stored in DB); referrer earns commissions
- Request payout (e-transfer): minimum $20 threshold
- Dashboard showing referral count, commission earned, payout history

#### `/simulator` — Set Etiquette Simulator
- Scenario-based multiple-choice quiz (about 10+ scenarios)
- "What would you do on set?" situational questions
- Instant correct/incorrect feedback with explanations
- No auth required (fully static)

#### `/glossary` — Film Set Terms
- Searchable glossary of film set terminology
- Static content

#### `/clothing` — What to Wear
- Guide on set wardrobe etiquette
- Static content

#### `/residency` — Residency Documents
- Upload work eligibility documents (SIN, PR card, work permit, etc.)
- Stored in `residency-documents` Supabase bucket
- Boolean flag `has_residency_docs` on performer profile

#### `/whats-filming` — Production Lists
- Links to regional ACTRA/UBCP production lists by province
- Embeds the respective union websites in a frame or opens externally

#### `/agencies` — Agency Directory
- Browse approved talent agencies
- Filter by region
- Links to agency websites

#### `/games` — Games Hub

Three games:
1. **Film Trivia** (`/games/film-trivia`) — Multiple-choice film industry trivia
2. **SetMatch** (`/games/set-match`) — Candy-crush style 8×8 match-3 puzzle with film-themed tiles. Lives system (max 5, refill every 20 min). Level progression, shuffle power-ups. In-app purchases: unlimited lives, +5 moves, Pro Player (via Stripe game_purchase session)
3. **Studio Tycoon** (`/games/studio-tycoon`) — Idle/clicker tycoon game. Buy generators (background performer → streaming platform), upgrades, offline income. IAP: permanent ×2 income boost, Tycoon Skip, Auto, Offline. Progress saved in localStorage + reconciled against `game_purchases` table on load

#### `/glossary`, `/clothing`, `/rights` — Static Reference Pages
- Static content pages; no auth required

#### `/settings` — Account Settings
- Change name, email, password
- Delete account (`/api/account/delete`)
- Notification preferences

#### `/donate` — Support SetReady
- Donation / support page (links or payment)

#### `/install` — App Install Page
- Instructions for adding to home screen

---

### Agent-Facing (`/agent/`)

#### `/agent/login` — Agent Login
- Email + password
- Issues `agent_session` cookie (custom JWT)

#### `/agent/register` — Agency Registration
- Submit agency name, contact info, phone, city, province, website
- Creates `agencies` record with `is_approved: false` — requires admin approval
- Agent account created linked to the agency

#### `/agent/dashboard` — Agent Dashboard
Large, feature-rich dashboard with multiple panels:

**Roster tab:**
- List all roster performers with headshots, union status, availability for current week
- Add performer to roster (by email), remove, manage status
- Performer detail modal: full profile, week availability
- Private notes and tags per performer
- Roster search and filter

**Requests tab:**
- View open casting requests from all casting directors
- Filter by status, date, region
- Per-request: submit performers from roster with optional notes
- AI-powered submission suggestions (scores performers against request criteria)
- View submission status (submitted → shortlisted → confirmed / rejected)

**Submissions tab:**
- All submissions made by the agency, with status
- Filter by request, performer, status

**Availability Checks tab:**
- Send bulk availability checks to performers or subsets (by tag)
- Tracks responses (available/unavailable/no response)

**Commissions tab:**
- Log booking commissions per performer
- Date-range filter
- Summary totals

**Calendar tab:**
- Monthly view of confirmed bookings across all roster performers
- Colour-coded by performer

**Messages tab:** (`/agent/messages`)
- Agent inbox (direct + broadcast)
- Send messages to performers

**Settings tab:** (`/agent/settings`)
- Email notification preferences (email on new requests)
- Team management: add/view other agents at the same agency (`agent_accounts` table)

**Pro status:** Free tier = 25 roster limit. Pro = unlimited (via promo code or admin grant)

#### `/agent/import` — CSV Roster Import
- Upload CSV of performer data (first_name, last_name, email, phone, gender, DOB, height, hair color, eye color, union_status, special_skills)
- Creates user accounts + performer profiles + roster entries
- Sends invite emails to new performers with a unique claim link
- Skips duplicates with reasons reported

#### `/agent/join` — Join Agency
- Performer or agent can request to join an existing agency
- Links to existing agency by invite token

---

### Casting Director-Facing (`/casting/`)

#### `/casting/login` — Casting Director Login
- Email + password
- Issues `casting_session` cookie (custom JWT)

#### `/casting/register` — Casting Director Registration
- Name, company, email, phone, description, heard-from
- Creates `casting_directors` record with `is_verified: false` — requires admin approval

#### `/casting/dashboard` — Casting Director Dashboard
Very large dashboard with multiple panels:

**Requests tab:**
- Create new casting requests: production name, project type, shoot date, call time, location (Canadian film region), role type, performers needed, gender, age range, union status, rate, scene description, wardrobe notes
- Template save/load for recurring requests
- Per-request: view submissions from all agencies + independent performers
- Kanban-style submission status board (submitted → in_review → shortlisted → confirmed / rejected / waitlisted)
- Confirm/reject individual performers (triggers notifications + emails)
- Filled count tracking (auto-updates when confirmations reach performers_needed)

**Performers tab:**
- Browse all public performer profiles
- Filter: date availability, gender, age range, hair color, eye color, union status, agency, skills, film region, union tier
- Sort: priority (union tier + profile boost), random, recently updated
- AI natural-language search (e.g. "tall redhead with driving experience, available June 15")
- Performer detail modal: full profile, headshot, bio, skills

**Shortlist tab:**
- Save performers to request-specific shortlists
- Shortlist notes per performer

**Calendar tab:**
- Monthly availability heatmap across all public performers
- Click a date to see how many performers are available

**Sign-in tab:**
- Create QR code sign-in sessions for on-set check-in
- QR code links to `/signin/[token]` (public page for on-set devices)
- Track who has scanned in

**Bookings tab:**
- View and manage bookings created by this casting director
- Accept / decline booking requests from performers

**Messages tab:** (`/casting/messages`)
- Casting director inbox
- Send messages to agents or performers

**Notifications:**
- Bell icon in header for real-time casting notifications

**Pro status:** `is_pro` flag on `casting_directors` table, controlled by admin or promo code

---

### Admin Panel (`/admin`)

Single-page admin panel with sidebar navigation; access requires matching `ADMIN_EMAILS` env var or `admin_emails` DB entry.

**Sections:**
- **Overview** — stats (total users, active subscribers, section 2 purchases, total certs, pending payouts, referral payout amount), recent signups table, module completion stats, Stripe mode indicator (TEST/LIVE)
- **Users** — recent user list with subscription status, progress, referral info; assign referral codes
- **Referrals** — payout requests (pending/paid), commission log, mark payouts as paid (e-transfer)
- **Certificates** — view all issued certificates, backfill missing certs
- **Tools** — admin utilities (backfill scripts, test routes)
- **Casting** — approve/reject casting director registrations and agency registrations; moderate casting requests; approve verified badge requests
- **Promos** — create/manage promo codes (types: training, agent_pro, casting_pro, press); manage tester codes; photo promo codes
- **Messages** — broadcast messages to performers, agents, casting directors; manage message center
- **Finance** — internal finance ledger (revenue/expense entries)
- **Verified Badges** — approve pending verified badge purchases

---

### Shared / Utility Pages

- `/casting-portal` — Landing gate page that routes to `/casting/login` or `/agent/login`
- `/signin/[token]` — On-set QR scan page: shows confirmed performers list, tap to check in (does not require performer auth)
- `/claim/[token]` — Invited performer claim flow: sets own password on a profile already created by an agent
- `/payment-processing` — Post-Stripe redirect page; polls `/api/subscription/verify` until active
- `/redeem` — Promo/voucher code redemption page

---

## 5. Data Model (Supabase Tables)

### Performer Data

**`users`** (extends Supabase auth.users via DB trigger)
- `id` (uuid, FK auth.users)
- `email`, `name`
- `subscription_status` (active / inactive / canceled)
- `stripe_customer_id`, `stripe_subscription_id`
- `section1_completed` (bool)
- `section2_unlocked` (bool)
- `photos_unlocked` (bool)
- `insights_unlocked` (bool)
- `referral_code`, `referred_by`
- `promo_training_expires_at`
- `subscription_started_at`, `subscription_updated_at`
- `headshot_credits` (int)
- `home_city`, `home_region_code`, `home_lat`, `home_lng`
- `raw_user_meta_data` (jsonb — used for full_name, province, etc.)
- `created_at`

**`performer_profiles`**
- `user_id` (uuid, FK users)
- `headshot_url`
- `bio`
- `gender`, `date_of_birth`, `age` (computed or stored)
- `height_cm`, `weight_kg`
- `hair_color`, `hair_length`, `hair_texture`
- `eye_color`, `skin_tone`, `body_type`, `facial_hair`, `ethnicity`
- `union_status`, `union_priority` (1=Full, 2=Apprentice, 3=BG, 4=NonUnion)
- `shirt_size`, `jacket_size`, `dress_size`, `hat_size`, `shoe_size`
- `experience_level`
- `training` (text[] or jsonb)
- `accents`, `sports`, `dance`, `instruments`, `driving`, `swimming`, `languages` (text[])
- `special_skills`, `other_skills` (text[])
- `film_region_code`, `city`, `travel_willingness`, `travel_radius_km`, `travel_costs_required`
- `agency_id` (FK agencies, nullable)
- `is_public` (bool)
- `boost_expires_at` (for profile boost feature)
- `verified_badge` (bool), `verified_badge_pending` (bool)
- `updated_at`

**`performer_availability`**
- `id`, `user_id` (FK users)
- `date` (date)
- `status` (available / unavailable / booked / morning / afternoon)
- `notes`

**`user_progress`**
- `id`, `user_id` (FK users), `module_id` (FK modules)
- `completed` (bool), `score` (int, percentage 0–100)
- `section2_popup_shown` (bool)

**`certificates`**
- `id`, `user_id` (FK users)
- `certificate_type` (module / section1 / section2)
- `module_id` (int), `module_name`, `section_name`
- `score` (int)
- `issued_at`, `created_at`
- `pdf_url`

**`modules`**
- `id`, `title`, `section` (1 or 2), `module_number` (1–9), `order_index`

**`work_log`** (inferred from page.tsx)
- `id`, `user_id`
- `work_date`, `production_name`, `location`, `role`, `character_name`
- `hours_worked`, `lunch_break` (bool), `is_union` (bool)
- `pay_rate`, `gross_pay`, `deductions`, `final_pay`, `paid` (bool)
- `notes`, `production_type`, `agency`
- `voucher_url`, `voucher_filename`
- `created_at`

**`journal_entries`**
- `id`, `user_id`
- `date`, `title`, `body`
- `created_at`

**`journal_photos`**
- `id`, `journal_entry_id` (FK journal_entries)
- `filename`, `photo_url`
- `created_at`

**`film_contacts`**
- `id`, `user_id`
- `name`, `role`, `company`, `phone`, `email`, `notes`

**`union_vouchers`**
- `id`, `user_id`
- `voucher_number`, `production_name`, `production_type`
- `shoot_date`, `role_type`, `union_type`
- `is_qualifying` (bool), `days_worked` (int)
- `photo_url`, `photo_filename`
- `status`, `notes`
- `created_at`

**`union_notifications`**
- `id`, `user_id`
- `type`, `title`, `message`
- `is_read` (bool)
- `created_at`

**`residency_documents`**
- `id`, `user_id`
- `filename`, `document_url`
- `created_at`

---

### Casting / Booking Data

**`agencies`**
- `id`, `name`, `contact_name`, `email`, `phone`, `city`, `province`, `website`
- `is_approved` (bool)
- `is_pro` (bool), `pro_expires_at`
- `created_at`

**`agent_accounts`**
- `id`, `agency_id` (FK agencies)
- `name`, `email`, `password_hash` (bcrypt)
- `role` (owner / agent)
- `is_active` (bool)
- `email_on_request` (bool — opt-out from new request emails)
- `last_login`

**`casting_directors`**
- `id`, `name`, `company`, `email`, `phone`
- `password_hash` (bcrypt)
- `heard_from`, `description`
- `is_verified` (bool), `is_active` (bool)
- `is_pro` (bool), `pro_expires_at`
- `created_at`

**`casting_sessions`**
- `id`, `account_type` (agent / casting_director), `account_id`
- `token`, `expires_at`
- (Used by the custom JWT session system for immediate logout revocation)

**`agency_roster`**
- `id`, `agency_id` (FK agencies), `user_id` (FK users), `performer_user_id`
- `status` (active / pending / inactive)
- `joined_at`

**`casting_requests`**
- `id`, `casting_director_id` (FK casting_directors)
- `production_name`, `project_type`
- `shoot_date`, `call_time`, `location`, `shoot_region_code`
- `role_type`, `number_needed` (aliased as `performers_needed`)
- `filled_count`
- `gender_needed`, `age_min`, `age_max`
- `union_status`, `rate`, `rate_notes`
- `scene_description` (aliased as `description`), `wardrobe_notes`
- `status` (open / filled / closed / cancelled)
- `moderation_status` (pending / approved / rejected)
- `created_at`

**`casting_submissions`**
- `id`, `casting_request_id` (FK casting_requests)
- `performer_id` (FK users), `agency_id` (FK agencies)
- `status` (submitted / in_review / shortlisted / confirmed / rejected / waitlisted)
- `is_waitlisted` (bool)
- `notes`, `submitted_at`, `updated_at`

**`casting_shortlists`**
- `id`, `casting_director_id`, `request_id`, `performer_id`
- `notes`, `created_at`

**`casting_notifications`**
- `id`
- `recipient_type` (performer / agent / casting_director / admin)
- `recipient_id`
- `type`, `title`, `message`
- `is_read` (bool)
- `action_url`
- `related_request_id`, `related_submission_id`
- `created_at`

**`casting_notification_exclusions`**
- `user_id` — performers opted out of independent performer notifications

**`casting_templates`**
- `id`, `casting_director_id`
- `name`, `template_data` (jsonb)
- `created_at`

**`bookings`**
- `id`, `performer_id` (FK users)
- `created_by_id` (agent_accounts.id or casting_directors.id)
- `created_by_type` (agent / casting_director), `created_by_name`
- `start_date`, `end_date`
- `status` (pending / confirmed / declined / cancelled)
- `production`, `note`

**`production_signin_sessions`**
- `id`, `casting_director_id`
- `request_id` (FK casting_requests, nullable)
- `shoot_date`, `location_name`
- `qr_token`, `is_active`
- `expires_at`

**`production_signins`**
- `id`, `session_id` (FK production_signin_sessions)
- `performer_id` (FK users)
- `signed_in` (bool), `signed_in_at`

---

### Agency Sub-features

**`agency_commissions`**
- `id`, `agency_id`
- `booking_date`, `production_name`, `performer_name`
- `gross_pay`, `commission_rate`, `commission_amount`
- `paid` (bool), `notes`

**`performer_roster_tags`**
- `id`, `user_id`, `agency_id`
- `tag`

**`agency_roster_notes`** (inferred)
- Private notes per performer per agency

**`availability_checks`**
- `id`, `check_id` (random hex), `agency_id`
- `date`, `message`
- `recipient_ids` (jsonb array), `responses` (jsonb)

---

### Messaging

**`messages`**
- `id`
- `sender_type`, `sender_id`, `sender_name`
- `recipient_type` (performer / agent / casting_director / all_performers / all_agents / all_casting_directors / all_users)
- `recipient_id` (nullable for broadcasts)
- `subject`, `body`
- `message_type` (general / casting_request / booking_confirmed / announcement / system)
- `priority` (normal / high / urgent)
- `action_url`, `action_label`
- `related_id`
- `metadata` (jsonb)
- `parent_message_id`, `thread_id`, `is_reply`
- `reply_count`
- `is_read`, `is_deleted`
- `email_to`, `email_sent`, `email_sent_at`
- `created_at`

**`message_read_receipts`**
- `id`, `message_id`, `reader_id`
- `read_at`

---

### Payments & Referrals

**`stripe_webhook_events`** — idempotency table; stores processed Stripe event IDs

**`referral_commissions`**
- `id`, `referrer_id`, `referred_id`, `amount`, `created_at`

**`referral_payout_requests`**
- `id`, `user_id`, `amount`, `status` (pending / paid), `requested_at`

**`game_purchases`**
- `id`, `user_id`, `game`, `item`, `stripe_session_id`, `created_at`

---

### Admin & Promo

**`admin_emails`** — extra admin email addresses beyond the env var

**`admin_settings`**
- `key`, `value` (e.g. `notify_independent_performers` = 'true'/'false')

**`promo_codes`**
- `id`, `code`, `type` (training / agent_pro / casting_pro / press)
- `description`, `discount_percent`
- `max_uses`, `uses_count`, `expires_at`, `is_active`
- `created_by`, `created_at`

**`promo_code_uses`**
- `id`, `code_id`, `user_id`, `used_at`

**`photo_promo_codes`**
- `id`, `code`, `max_uses`
- `allowed_types` (jsonb: photo / insights / verified_badge)
- `created_at`

**`tester_codes`** — one-time access codes for testers

**`finance_entries`** — internal admin revenue/expense ledger

---

## 6. Key Files Map

| File | Purpose |
|---|---|
| `app/layout.tsx` | Root HTML shell, PWA meta, Toaster setup |
| `app/page.tsx` | Marketing/landing page |
| `app/dashboard/page.tsx` | Main performer dashboard (1932 lines, most complex page) |
| `app/profile/page.tsx` | Full performer profile editor |
| `app/module/[id]/page.tsx` | Training module viewer + quiz engine |
| `app/availability/page.tsx` | Calendar availability editor (shows bookings inline) |
| `app/work-log/page.tsx` | Booking work log CRUD |
| `app/voucher-wallet/page.tsx` | Union voucher tracker with milestones |
| `app/headshot-analyzer/page.tsx` | AI headshot upload + analysis UI |
| `app/games/studio-tycoon/page.tsx` | Idle tycoon game with IAP |
| `app/games/set-match/page.tsx` | Match-3 puzzle game with IAP |
| `app/agent/dashboard/page.tsx` | Agent main dashboard (roster, requests, submissions) |
| `app/casting/dashboard/page.tsx` | Casting director dashboard (requests, performers, kanban) |
| `app/admin/page.tsx` | Admin control panel |
| `app/casting-portal/page.tsx` | Portal gate page (agent or casting director entry) |
| `app/signin/[token]/page.tsx` | On-set QR scan check-in page |
| `app/api/profile/route.ts` | GET + POST performer profile (joins performer_profiles + users) |
| `app/api/bookings/route.ts` | Bookings CRUD (agent/casting scoped) |
| `app/api/availability/route.ts` | Performer availability CRUD |
| `app/api/casting/requests/route.ts` | Casting requests CRUD (casting director scoped) |
| `app/api/casting/performers/route.ts` | Performer search for casting directors |
| `app/api/casting/submissions/route.ts` | Update submission status (PATCH) |
| `app/api/casting/kanban/route.ts` | Kanban status transitions (triggers notifications) |
| `app/api/casting/signin/route.ts` | QR sign-in session creation + token resolution |
| `app/api/casting/ai-search/route.ts` | NL performer search via Anthropic |
| `app/api/casting/shortlist/route.ts` | Shortlist management |
| `app/api/casting/templates/route.ts` | Request template save/load |
| `app/api/casting/calendar/route.ts` | Availability heatmap data |
| `app/api/casting/messages/route.ts` | Casting director message inbox |
| `app/api/casting/notifications/route.ts` | Casting director notification inbox |
| `app/api/casting/auth/` | Login/logout for casting directors |
| `app/api/agent/roster/route.ts` | Agency roster with week availability |
| `app/api/agent/import/route.ts` | CSV bulk import with invite emails |
| `app/api/agent/commissions/route.ts` | Agency commissions ledger |
| `app/api/agent/availability-check/route.ts` | Bulk availability check to performers |
| `app/api/agent/team/route.ts` | List all agents at same agency |
| `app/api/agent/auth/` | Login/logout for agents |
| `app/api/checkout/section1/route.ts` | Stripe subscription checkout ($9.99/mo) |
| `app/api/checkout/section2/route.ts` | Stripe one-time payment checkout ($19.99) |
| `app/api/checkout/headshot/route.ts` | Headshot credits purchase |
| `app/api/checkout/boost/route.ts` | Profile boost purchase |
| `app/api/checkout/set-match/route.ts` | SetMatch IAP |
| `app/api/checkout/studio-tycoon/route.ts` | Studio Tycoon IAP |
| `app/api/checkout/insights/route.ts` | Pro Insights unlock |
| `app/api/checkout/verified-badge/route.ts` | Verified badge purchase |
| `app/api/webhooks/stripe/route.ts` | Stripe webhook handler (idempotent; handles all event types) |
| `app/api/subscription/verify/route.ts` | Post-checkout subscription verification |
| `app/api/headshot-analyzer/analyze/route.ts` | Claude-powered headshot analysis (two-phase) |
| `app/api/messages/route.ts` | Performer message inbox |
| `app/api/messages/unread-count/route.ts` | Unread message count badge |
| `app/api/notifications/casting/route.ts` | Performer casting notification inbox |
| `app/api/voucher-wallet/summary/route.ts` | Union progress summary |
| `app/api/referral/apply/route.ts` | Apply referral code before checkout |
| `app/api/promo/apply/route.ts` | Apply promo code (all user types) |
| `app/api/admin/stats/route.ts` | Admin overview stats |
| `app/api/admin/casting/route.ts` | Admin casting moderation (approve/reject CDs, agencies, requests, badges) |
| `app/api/admin/referrals/route.ts` | Admin referral payout management |
| `app/api/admin/finance/route.ts` | Internal finance ledger CRUD |
| `app/api/admin/messages/route.ts` | Admin broadcast messaging |
| `app/api/performer/booking-weather/route.ts` | Weather forecast for confirmed bookings |
| `lib/email.ts` | Resend wrapper + all HTML email templates |
| `lib/casting-auth.ts` | Custom JWT auth for agents/casting directors |
| `lib/casting-notify.ts` | Notification helpers (notifyAllAgents, notifyIndependentPerformers, etc.) |
| `lib/messages.ts` | sendMessage / broadcastMessage / replyToMessage |
| `lib/ai-casting.ts` | Performer scoring + AI natural-language search |
| `lib/booking-weather.ts` | Open-Meteo weather fetch (no API key needed) |
| `lib/film-regions.ts` | Canadian film region definitions (codes, cities, lat/lng) |
| `lib/union-rules.ts` | Province-by-province union entry rules |
| `lib/promo.ts` | Promo code validation + application logic |
| `lib/lessons.ts` | All training module lesson content |
| `lib/questions.ts` | All training module quiz questions |
| `lib/certificate-generator.tsx` | React-PDF certificate generation |
| `utils/supabase/admin.ts` | Service-role Supabase client (bypasses RLS, server-only) |
| `utils/supabase/client.ts` | Browser Supabase client |
| `utils/supabase/server.ts` | Cookie-based server Supabase client |
| `utils/isAdmin.ts` | Admin email check + request verification |
| `next.config.ts` | Next.js config (standalone, unoptimized images, React Compiler) |

---

## 7. Integrations & Config

### Environment Variables

All read from `.env.local`:

**Supabase**
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (also used in `next.config.ts` image remotePatterns; hostname is `yvrbydctibybhwnbjztu.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (server-only, bypasses RLS)
- `DATABASE_URL` — Direct Postgres connection string (used by migrations/scripts)

**Stripe**
- `STRIPE_SECRET_KEY` — Server-side Stripe key (`sk_test_*` or `sk_live_*`)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Client-side publishable key
- `STRIPE_WEBHOOK_SECRET` — For webhook signature verification
- `NEXT_PUBLIC_STRIPE_SECTION_1_PRICE_ID` / `STRIPE_SECTION_1_PRICE_ID` — Monthly subscription price
- `NEXT_PUBLIC_STRIPE_SECTION_2_PRICE_ID` / `STRIPE_SECTION_2_PRICE_ID` — Section 2 one-time price
- `NEXT_PUBLIC_STRIPE_HEADSHOT_PRICE_ID` — Headshot credit price
- `STRIPE_BOOST_1MO_PRICE_ID`, `STRIPE_BOOST_3MO_PRICE_ID`, `STRIPE_BOOST_6MO_PRICE_ID`, `STRIPE_BOOST_12MO_PRICE_ID` — Profile boost duration prices
- `STRIPE_TYCOON_BOOST2_PRICE_ID`, `STRIPE_TYCOON_SKIP_PRICE_ID`, `STRIPE_TYCOON_AUTO_PRICE_ID`, `STRIPE_TYCOON_OFFLINE_PRICE_ID` — Studio Tycoon IAP prices
- `STRIPE_SETMATCH_LIVES_PRICE_ID`, `STRIPE_SETMATCH_MOVES_PRICE_ID`, `STRIPE_SETMATCH_PRO_PRICE_ID` — SetMatch IAP prices
- `STRIPE_INSIGHTS_PRICE_ID` — Pro Insights unlock price
- `STRIPE_VERIFIED_BADGE_PRICE_ID` — Verified Badge price

**Authentication**
- `CASTING_JWT_SECRET` — Minimum 32-char secret for signing agent/CD JWTs

**Admin**
- `ADMIN_EMAILS` — Comma-separated list of admin email addresses

**App**
- `NEXT_PUBLIC_APP_URL` — Full app URL (e.g. `https://www.setready.site`)

**Email**
- `RESEND_API_KEY` — Resend API key (from address: `notifications@setready.site`)

**AI**
- `ANTHROPIC_API_KEY` — Anthropic API key for Claude (headshot analyzer + AI performer search)

### External Services Summary

| Service | Usage |
|---|---|
| Supabase | Database (PostgreSQL), Auth, Storage |
| Stripe | Subscriptions, one-time payments, customer portal, webhook |
| Resend | Transactional email |
| Anthropic (Claude) | Headshot analysis, AI performer search |
| Open-Meteo | Weather forecasts for confirmed bookings (free, no key) |
| UBCP/ACTRA websites | External links for production lists, rights info |
| AgencyClick.com | External link (credentials helper in localStorage) |
| Vercel | Hosting (inferred from `VERCEL_ENV`) |
| Sentry | Error monitoring (`@sentry/nextjs`) |
| Capacitor | iOS + Android native shell |

### Stripe Webhook Events Handled

In `app/api/webhooks/stripe/route.ts`:
- `checkout.session.completed` — activates subscription, unlocks section2/photo_slots/headshot_credits/boost/insights/verified_badge/game_purchase
- `invoice.paid` — sets subscription active, records period end
- `invoice.payment_failed` — sets subscription inactive
- `customer.subscription.deleted` — sets subscription inactive
- `customer.subscription.updated` — syncs subscription status changes

Webhook uses an idempotency table (`stripe_webhook_events`) to deduplicate retries.

---

## 8. Current State

### Finished and Shipped
- Full performer training system (Section 1: 5 modules, Section 2: 4 modules)
- Quiz engine and certificate generation (PDF download)
- Stripe subscription + one-time payment flows
- Stripe webhook handler (idempotent, handles all relevant events)
- Performer profile (complete with all physical/skills attributes)
- Performer availability calendar
- Work log with voucher photo attachment
- Voucher wallet with union eligibility tracking
- Casting system end-to-end: request creation → agent submission → kanban review → confirmation
- Agent dashboard: roster management, week availability view, submission workflow, AI suggestions
- Casting director dashboard: performer search (structured + AI), shortlist, kanban, QR sign-in
- JWT-based agent and casting director auth (with immediate-revoke logout)
- In-app message center (performers, agents, casting directors)
- Email notifications via Resend
- Admin panel (users, certs, referrals, casting moderation, promo codes, messages, finance)
- Referral program with commission tracking + payout requests
- AI headshot analyzer (two-phase Claude analysis)
- Games: Studio Tycoon, SetMatch, Film Trivia
- Voucher wallet with milestones + notifications
- Booking calendar (performer sees pending/confirmed bookings with accept/decline)
- Booking weather feature (Open-Meteo 16-day forecast for confirmed shoots)
- Profile boost (pay to appear higher in search)
- Verified Pro badge (pay → admin approves → badge on profile)
- Pro Insights (locked premium analytics feature)
- Photo slots (extra profile photos, one-time unlock)
- CSV roster import with invite emails
- QR on-set sign-in system
- PWA manifest + iOS/Android install flows
- Capacitor mobile build scripts

### Known Architecture Notes / TODOs (from code comments)
- `app/api/casting/ai-search/route.ts`: "This loads up to 500 profiles into memory and sends them all to the AI. Fine at current scale, but does NOT scale. Before the public performer count approaches this cap, matching should move into the DB query."
- Admin section coverage: some admin sub-pages may be incomplete or stub
- `pro_status` routes exist for both agents and casting directors but the Pro tier feature's full scope may not be fully surfaced in all parts of the UI
- `casting_notification_exclusions` table exists but the UI for opting in/out is not confirmed in the reviewed files

---

## 9. How to Run It

### Prerequisites
- Node.js (LTS)
- A Supabase project with the required tables (no migration files were found in the reviewed directory; tables were created manually or via Supabase dashboard)
- A Stripe account with the relevant products/prices created
- A Resend account
- An Anthropic API account

### Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local  # or create from scratch using the variable list in Section 7

# Fill in all values in .env.local
```

### Development

```bash
npm run dev
```

Runs Next.js dev server at `http://localhost:3000`.

For Stripe webhooks in development, use the Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Production Build

```bash
npm run build
npm run start
```

The project uses `output: 'standalone'` in `next.config.ts`, so the build output is a self-contained Node server suitable for Docker or Vercel.

### Mobile (Capacitor)

```bash
# Build Next.js and sync to Capacitor
npm run mobile:sync

# Open in Xcode
npm run mobile:ios

# Open in Android Studio
npm run mobile:android
```

### Deployment

The app is deployed to Vercel (inferred from `VERCEL_ENV` usage and `output: 'standalone'`). Production domain is `www.setready.site`.

The Stripe webhook endpoint is: `https://www.setready.site/api/webhooks/stripe`

---

## Appendix: Route → Auth Guard Map

| Route prefix | Auth system | Guard method |
|---|---|---|
| `/dashboard`, `/profile`, `/work-log`, etc. | Supabase Auth | Client-side: checks `supabase.auth.getSession()`, redirects to `/auth/sign-in` |
| `/api/profile`, `/api/availability`, etc. | Supabase Auth | Server: `createClient()` → `auth.getUser()` |
| `/agent/dashboard` and all agent pages | Custom JWT | `getAgentSession()` → reads `agent_session` cookie |
| `/casting/dashboard` and all casting pages | Custom JWT | `getCastingSession()` → reads `casting_session` cookie |
| `/api/agent/**` | Custom JWT | `getAgentSession()` at route start |
| `/api/casting/**` | Custom JWT | `getCastingSession()` at route start |
| `/api/admin/**` | Supabase Auth + admin check | `verifyAdminRequest()` → checks email against `ADMIN_EMAILS` or `admin_emails` table |
| `/api/webhooks/stripe` | Stripe signature | `stripe.webhooks.constructEvent()` |
| `/signin/[token]` | None (public QR page) | Token validated against `production_signin_sessions` table |
| `/claim/[token]` | None (invite link) | Token validated against invite token in performer profile |
