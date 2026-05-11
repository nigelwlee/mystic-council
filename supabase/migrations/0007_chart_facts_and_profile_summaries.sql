-- Persist birth chart facts on birth_data (one per user, recomputed when birth data changes).
-- Also add per-tradition profile summaries table so a single expert failure doesn't poison the whole cache.

-- Chart facts stored alongside birth_data. Nullable — populated lazily on first /api/profile call.
alter table public.birth_data add column if not exists chart_facts jsonb;

-- Per-tradition "at a glance" birth readings.
-- Keyed by (user_id, tradition_id) so each tradition is cached independently.
create table if not exists public.profile_summaries (
  user_id        uuid        not null references auth.users(id) on delete cascade,
  tradition_id   text        not null,
  at_glance      text        not null,
  birth_data_hash text       not null,
  generated_at   timestamptz not null default now(),
  primary key (user_id, tradition_id)
);

alter table public.profile_summaries enable row level security;

create policy "Users can read own summaries"
  on public.profile_summaries for select
  using (user_id = auth.uid());

create policy "Users can insert own summaries"
  on public.profile_summaries for insert
  with check (user_id = auth.uid());

create policy "Users can update own summaries"
  on public.profile_summaries for update
  using (user_id = auth.uid());

-- Service-role bypasses RLS, but explicit grant is consistent with other tables.
grant select, insert, update, delete on public.profile_summaries to service_role;
