-- ============================================================================
-- SetReady — Casting search performance indexes
-- Created 2026-07-05. Run in the Supabase SQL editor (Dashboard → SQL Editor).
-- ============================================================================
--
-- WHY: app/api/casting/ai-search/route.ts filters performer_profiles in the DB on
--   is_public + gender + union_priority + date_of_birth (age window) + height_cm
--   (+ optional hair_color substring). Without indexes Postgres sequential-scans the
--   table on every search — fine up to a few thousand rows, slower beyond that.
--
-- Every casting search filters is_public = true, so these are PARTIAL indexes limited
-- to public profiles: smaller and faster than full-table indexes.
--
-- SAFE TO RUN ANYTIME: `IF NOT EXISTS` makes re-runs no-ops. This changes NO data and
-- NO schema — it only adds indexes, which Postgres can also drop harmlessly later.
-- On a small table these build instantly. On a large, live table, use the CONCURRENTLY
-- variants (see bottom) to avoid briefly locking writes.
-- ============================================================================

-- Base: supports the is_public filter + the ORDER BY user_id the search uses
CREATE INDEX IF NOT EXISTS idx_perf_public_userid
  ON public.performer_profiles (user_id)
  WHERE is_public = true;

-- Union tier filter (union_priority <= 2) and the union-priority sort
CREATE INDEX IF NOT EXISTS idx_perf_public_union
  ON public.performer_profiles (union_priority)
  WHERE is_public = true;

-- Age filter (date_of_birth window)
CREATE INDEX IF NOT EXISTS idx_perf_public_dob
  ON public.performer_profiles (date_of_birth)
  WHERE is_public = true;

-- Height range filter
CREATE INDEX IF NOT EXISTS idx_perf_public_height
  ON public.performer_profiles (height_cm)
  WHERE is_public = true;

-- Refresh planner statistics so Postgres starts using the new indexes immediately
ANALYZE public.performer_profiles;

-- ----------------------------------------------------------------------------
-- NOT indexed on purpose:
--   gender  -> only 2-4 distinct values (low cardinality); Postgres prefers a scan,
--              so an index would just add write overhead. The partial indexes above
--              already shrink the working set via bitmap AND.
-- ----------------------------------------------------------------------------

-- OPTIONAL — fuzzy hair-colour substring search (hair_color ILIKE '%...%').
-- Only worth it if hair-colour searches become common. Needs the pg_trgm extension:
--   CREATE EXTENSION IF NOT EXISTS pg_trgm;
--   CREATE INDEX IF NOT EXISTS idx_perf_public_hair_trgm
--     ON public.performer_profiles USING gin (hair_color gin_trgm_ops)
--     WHERE is_public = true;

-- OPTIONAL — only if location matching is ever pushed from app logic into SQL
-- (it currently runs in JS because of per-performer travel radius):
--   CREATE INDEX IF NOT EXISTS idx_perf_public_region
--     ON public.performer_profiles (film_region_code)
--     WHERE is_public = true;

-- ============================================================================
-- ZERO-DOWNTIME NOTE (large, live table):
-- CREATE INDEX briefly locks the table against writes while it builds. On a big table,
-- build each one with CONCURRENTLY instead. CONCURRENTLY cannot run inside a transaction,
-- so run these ONE STATEMENT AT A TIME (not as a single batch). Example:
--
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_perf_public_dob
--     ON public.performer_profiles (date_of_birth) WHERE is_public = true;
--
-- Repeat for each index above, one run each.
-- ============================================================================
