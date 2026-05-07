-- Cache for daily readings keyed by stable hash of (birthData, date).
-- No user_id dependency — same birth data on same date always gives the same reading.
-- Accessed via service_role only (adminClient). No RLS needed.

create table public.daily_reading_cache (
  cache_key   text        primary key,
  reading_date text        not null,
  content     jsonb       not null,
  created_at  timestamptz not null default now()
);

create index daily_reading_cache_date_idx on public.daily_reading_cache (reading_date);

grant select, insert, update, delete on public.daily_reading_cache to service_role;
