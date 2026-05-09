-- Add 'profile' to the readings.kind check constraint
-- Profile readings store per-expert birth interpretations keyed on birthDataHash.

alter table readings drop constraint readings_kind_check;
alter table readings add constraint readings_kind_check
  check (kind in ('daily', 'council', 'expert', 'chart', 'profile'));
