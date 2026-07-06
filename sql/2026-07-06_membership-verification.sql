-- SetReady — ACTRA membership verification
-- Members submit their tier + number + a proof document. An admin reviews and
-- approves/rejects. Only an approved tier is shown on the member's profile.
-- Run in the Supabase SQL editor. Safe to re-run.

-- 1) Submissions table (written/read by the server via service role only)
create table if not exists public.membership_verifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  tier          text not null,                 -- 'full' | 'apprentice' | 'aabp' | 'permittee'
  member_number text,                           -- e.g. 05-12345, AM-12345, EX-054321 (null for permittee)
  file_url      text not null,                  -- storage path in the membership_docs bucket
  filename      text,
  file_type     text,
  status        text not null default 'pending',-- 'pending' | 'approved' | 'rejected'
  review_notes  text,
  reviewed_by   uuid,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists idx_membership_verifications_status
  on public.membership_verifications (status, created_at desc);
create index if not exists idx_membership_verifications_user
  on public.membership_verifications (user_id, created_at desc);

alter table public.membership_verifications enable row level security;

-- 2) Denormalised result on the user profile (what the profile displays)
alter table public.users add column if not exists membership_tier        text;
alter table public.users add column if not exists membership_number      text;
alter table public.users add column if not exists membership_verified     boolean not null default false;
alter table public.users add column if not exists membership_verified_at  timestamptz;
alter table public.users add column if not exists membership_expires_at   date;

-- 3) Private storage bucket for the proof documents
insert into storage.buckets (id, name, public)
values ('membership_docs', 'membership_docs', false)
on conflict (id) do nothing;

-- Authenticated users may upload to / read only their own folder (uid/...).
-- The admin review reads via the service role, which bypasses these policies.
drop policy if exists "membership upload own" on storage.objects;
create policy "membership upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'membership_docs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "membership read own" on storage.objects;
create policy "membership read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'membership_docs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "membership delete own" on storage.objects;
create policy "membership delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'membership_docs' and (storage.foldername(name))[1] = auth.uid()::text);
