-- Add oracle and experts columns to chat_messages so assistant replies survive app restart
alter table public.chat_messages
  add column if not exists oracle jsonb,
  add column if not exists experts jsonb;
