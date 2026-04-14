-- Выполни в Supabase → SQL Editor

create table if not exists quiz_attempts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  exam        text not null,
  topic       text,
  correct     boolean not null,
  difficulty  text default 'medium',
  created_at  timestamptz default now()
);

-- Index for fast user queries
create index idx_quiz_attempts_user on quiz_attempts(user_id);
create index idx_quiz_attempts_exam  on quiz_attempts(user_id, exam);

-- Row Level Security — users see only their own data
alter table quiz_attempts enable row level security;

create policy "Users can insert own attempts"
  on quiz_attempts for insert
  with check (auth.uid() = user_id);

create policy "Users can read own attempts"
  on quiz_attempts for select
  using (auth.uid() = user_id);
