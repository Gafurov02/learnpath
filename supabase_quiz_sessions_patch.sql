-- Run in Supabase SQL Editor for existing projects

alter table quiz_attempts
  add column if not exists session_id uuid;

create index if not exists idx_quiz_attempts_session
  on quiz_attempts(user_id, session_id);
