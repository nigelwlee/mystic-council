-- Grant table privileges to Supabase roles. RLS policies still gate row access for
-- authenticated/anon; service_role bypasses RLS entirely.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on
  public.profiles,
  public.birth_data,
  public.readings,
  public.daily_streaks,
  public.tapestry_entries
to authenticated, service_role;

-- Default privileges so future tables in public schema get the same treatment
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;
