-- Выполни в Supabase → SQL Editor

-- Schools table
create table if not exists schools (
                                       id          uuid primary key default gen_random_uuid(),
    owner_id    uuid references auth.users(id) on delete cascade not null,
    name        text not null,
    slug        text unique not null,
    description text,
    invite_code text unique not null default substr(md5(random()::text), 1, 8),
    plan        text not null default 'school',
    max_students integer not null default 100,
    created_at  timestamptz default now()
    );

-- School members
create table if not exists school_members (
                                              id         uuid primary key default gen_random_uuid(),
    school_id  uuid references schools(id) on delete cascade not null,
    user_id    uuid references auth.users(id) on delete cascade not null,
    role       text not null default 'student', -- 'teacher' | 'student'
    joined_at  timestamptz default now(),
    unique(school_id, user_id)
    );

-- Custom questions by teachers
create table if not exists custom_questions (
                                                id           uuid primary key default gen_random_uuid(),
    school_id    uuid references schools(id) on delete cascade not null,
    created_by   uuid references auth.users(id) not null,
    exam         text not null,
    topic        text not null,
    question     text not null,
    options      jsonb not null,  -- ["A","B","C","D"]
    correct_index integer not null,
    explanation  text,
    difficulty   text default 'medium',
    active       boolean default true,
    created_at   timestamptz default now()
    );

do $$
begin
  alter table school_members
    add constraint school_members_role_check check (role in ('teacher', 'student'));
exception
  when duplicate_object then null;
end $$;

-- RLS
alter table schools enable row level security;
alter table school_members enable row level security;
alter table custom_questions enable row level security;

drop policy if exists "Owner manages school" on schools;
drop policy if exists "Members read school" on schools;
drop policy if exists "Members see own membership" on school_members;
drop policy if exists "Teachers manage members" on school_members;
drop policy if exists "Students join school" on school_members;
drop policy if exists "Owner manages school members" on school_members;
drop policy if exists "Teachers manage questions" on custom_questions;
drop policy if exists "Students read questions" on custom_questions;
drop policy if exists "School members read questions" on custom_questions;
drop policy if exists "Teachers insert questions" on custom_questions;
drop policy if exists "Teachers update questions" on custom_questions;
drop policy if exists "Teachers delete questions" on custom_questions;

create policy "Owner manages school" on schools
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Members read school" on schools for select using (
  exists(
    select 1
    from school_members sm
    where sm.school_id = schools.id
      and sm.user_id = auth.uid()
  )
);

create policy "Members see own membership" on school_members for select using (auth.uid() = user_id);

create policy "Owner manages school members" on school_members
  for all
  using (
    exists(
      select 1
      from schools s
      where s.id = school_members.school_id
        and s.owner_id = auth.uid()
    )
  )
  with check (
    exists(
      select 1
      from schools s
      where s.id = school_members.school_id
        and s.owner_id = auth.uid()
    )
  );

create policy "School members read questions" on custom_questions
  for select
  using (
    exists(
      select 1
      from schools s
      where s.id = custom_questions.school_id
        and s.owner_id = auth.uid()
    )
    or exists(
      select 1
      from school_members sm
      where sm.school_id = custom_questions.school_id
        and sm.user_id = auth.uid()
    )
  );

create policy "Teachers insert questions" on custom_questions
  for insert
  with check (
    created_by = auth.uid()
    and (
      exists(
        select 1
        from schools s
        where s.id = custom_questions.school_id
          and s.owner_id = auth.uid()
      )
      or exists(
        select 1
        from school_members sm
        where sm.school_id = custom_questions.school_id
          and sm.user_id = auth.uid()
          and sm.role = 'teacher'
      )
    )
  );

create policy "Teachers update questions" on custom_questions
  for update
  using (
    exists(
      select 1
      from schools s
      where s.id = custom_questions.school_id
        and s.owner_id = auth.uid()
    )
    or exists(
      select 1
      from school_members sm
      where sm.school_id = custom_questions.school_id
        and sm.user_id = auth.uid()
        and sm.role = 'teacher'
    )
  )
  with check (
    exists(
      select 1
      from schools s
      where s.id = custom_questions.school_id
        and s.owner_id = auth.uid()
    )
    or exists(
      select 1
      from school_members sm
      where sm.school_id = custom_questions.school_id
        and sm.user_id = auth.uid()
        and sm.role = 'teacher'
    )
  );

create policy "Teachers delete questions" on custom_questions
  for delete
  using (
    exists(
      select 1
      from schools s
      where s.id = custom_questions.school_id
        and s.owner_id = auth.uid()
    )
    or exists(
      select 1
      from school_members sm
      where sm.school_id = custom_questions.school_id
        and sm.user_id = auth.uid()
        and sm.role = 'teacher'
    )
  );

-- Indexes
create index idx_school_members_school on school_members(school_id);
create index idx_school_members_user on school_members(user_id);
create index idx_custom_questions_school on custom_questions(school_id);
