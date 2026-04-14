-- Выполни в Supabase → SQL Editor

-- Выбранные экзамены для бесплатного плана
create table if not exists user_exam_selection (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null unique,
  exams      text[] not null default '{}',  -- max 2 for free users
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table user_exam_selection enable row level security;

create policy "Users manage own exam selection"
  on user_exam_selection for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_exam_selection_user on user_exam_selection(user_id);
