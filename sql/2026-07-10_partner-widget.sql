-- SetReady embeddable Training & Certificates widget
-- Run in Supabase SQL editor. Adds partner accounts + widget enrollment records.
-- Self-contained: does NOT touch existing users/certificates tables, so it can't
-- break current data. Widget users/subscribers are recorded here and surfaced in
-- the admin console (/admin/widget).

-- 1) Partner accounts (one row per portal that embeds the widget) --------------
create table if not exists partner_accounts (
  id            uuid primary key default gen_random_uuid(),
  partner_key   text unique not null,               -- goes in the embed snippet
  name          text not null,                       -- e.g. "1ov1 Talent Portal"
  mode          text not null default 'free'         -- 'free' (promo-funded) | 'paid'
                  check (mode in ('free','paid')),
  price_cents   integer not null default 999,        -- talent-paid price (Option B)
  promo_code    text,                                -- Option A promo code (nullable)
  promo_cap     integer not null default 0,          -- max free redemptions / month (0 = unlimited within tier)
  referral_cents integer not null default 300,       -- partner's cut per paid cert (Option B)
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- 2) Widget enrollments (every user / subscriber the widget records) -----------
create table if not exists widget_enrollments (
  id            uuid primary key default gen_random_uuid(),
  partner_id    uuid not null references partner_accounts(id) on delete cascade,
  name          text not null,
  email         text not null,
  status        text not null default 'enrolled'     -- enrolled | in_progress | completed
                  check (status in ('enrolled','in_progress','completed')),
  paid          boolean not null default false,
  amount_cents  integer not null default 0,
  promo_used    text,
  modules_done  integer not null default 0,
  cert_id       text,
  cert_issued_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (partner_id, email)
);

create index if not exists idx_widget_enr_partner on widget_enrollments(partner_id);
create index if not exists idx_widget_enr_status  on widget_enrollments(status);
create index if not exists idx_widget_enr_created on widget_enrollments(created_at desc);

-- 3) Seed a demo/first partner. CHANGE the key before going live. --------------
insert into partner_accounts (partner_key, name, mode, price_cents, promo_code, referral_cents)
values ('pk_1ov1_demo_change_me', '1ov1 Talent Portal', 'free', 999, 'ONEOV1FREE', 300)
on conflict (partner_key) do nothing;

-- RLS: these tables are only ever read/written by the service-role key in the
-- Next API routes, so RLS stays off (service role bypasses it). Do NOT expose an
-- anon policy on partner_accounts (it holds keys).
