-- Add coordinates to birth_data (geocoded by the prototype form, used for chart calc)
alter table birth_data
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

-- Replace partial daily-unique index with composite unique constraint matching the upsert's onConflict
drop index if exists readings_daily_unique;

alter table readings
  add constraint readings_user_kind_date_unique unique (user_id, kind, reading_date);
