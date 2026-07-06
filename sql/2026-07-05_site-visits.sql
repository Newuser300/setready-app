-- SetReady — site visit tracking (admin visit counter)
-- Run in the Supabase SQL editor. Safe to re-run.
--
-- One row per page view. Written only by the server (service role) via
-- /api/track-visit, read only by /api/admin/visits. RLS on with no policies
-- means the public/anon client can't touch it; the service role bypasses RLS.

create table if not exists public.site_visits (
  id         uuid primary key default gen_random_uuid(),
  path       text,
  created_at timestamptz not null default now()
);

create index if not exists idx_site_visits_created_at
  on public.site_visits (created_at desc);

alter table public.site_visits enable row level security;

-- OPTIONAL housekeeping: run occasionally (or as a scheduled job) to keep the
-- table small — deletes visits older than 90 days:
--   delete from public.site_visits where created_at < now() - interval '90 days';
