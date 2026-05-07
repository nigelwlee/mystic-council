-- Enable UUID extension
create extension if not exists "pgcrypto";

-- profiles: 1:1 with auth.users, auto-created on signup
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table profiles enable row level security;
create policy "Users can read own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- birth_data: 1:1 with profiles
create table birth_data (
  user_id uuid primary key references profiles(id) on delete cascade,
  name text not null,
  birthdate date not null,
  birthtime time,
  birthplace text not null,
  timezone text,
  updated_at timestamptz not null default now()
);
alter table birth_data enable row level security;
create policy "Users can read own birth data" on birth_data for select using (auth.uid() = user_id);
create policy "Users can insert own birth data" on birth_data for insert with check (auth.uid() = user_id);
create policy "Users can update own birth data" on birth_data for update using (auth.uid() = user_id);

-- readings: one row per generated reading
create table readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('daily', 'council', 'expert', 'chart')),
  reading_date date not null,
  input jsonb not null,
  output jsonb not null,
  total_duration_ms int,
  created_at timestamptz not null default now()
);
alter table readings enable row level security;
create policy "Users can read own readings" on readings for select using (auth.uid() = user_id);
create policy "Users can insert own readings" on readings for insert with check (auth.uid() = user_id);
-- Unique daily reading per user per date
create unique index readings_daily_unique on readings (user_id, reading_date) where kind = 'daily';

-- daily_streaks: 1:1 with profiles
create table daily_streaks (
  user_id uuid primary key references profiles(id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_completed_date date,
  updated_at timestamptz not null default now()
);
alter table daily_streaks enable row level security;
create policy "Users can read own streaks" on daily_streaks for select using (auth.uid() = user_id);
create policy "Users can upsert own streaks" on daily_streaks for all using (auth.uid() = user_id);

-- tapestry_entries: journal entries per day
create table tapestry_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  reading_id uuid references readings(id) on delete set null,
  entry_date date not null,
  body text,
  mood text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table tapestry_entries enable row level security;
create policy "Users can manage own tapestry entries" on tapestry_entries for all using (auth.uid() = user_id);

-- Trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
