-- Engine run telemetry: persists per-expert and per-judge call outcomes
-- so failures are queryable instead of evaporating into Vercel logs.
create table if not exists public.engine_runs (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  user_id      uuid references auth.users(id) on delete set null,
  route        text not null,        -- 'daily' | 'profile' | 'council' | 'chart'
  phase        text not null,        -- 'expert' | 'judge' | 'route'
  expert_id    text,
  tradition_id text,
  attempt      int default 1,
  ok           bool not null,
  duration_ms  int,
  model        text,
  error        text,                 -- truncated to 500 chars
  meta         jsonb
);

create index if not exists engine_runs_recent_failures
  on public.engine_runs (created_at desc) where ok = false;

create index if not exists engine_runs_user_recent
  on public.engine_runs (user_id, created_at desc);

alter table public.engine_runs enable row level security;

-- Users may read their own run rows (useful for debugging in Supabase UI)
create policy "users read own engine runs"
  on public.engine_runs for select
  using (auth.uid() = user_id);

-- Service role writes (never exposed to clients)
grant select, insert on public.engine_runs to service_role;
