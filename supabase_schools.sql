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

-- RLS
alter table schools enable row level security;
alter table school_members enable row level security;
alter table custom_questions enable row level security;

create policy "Owner manages school" on schools for all using (auth.uid() = owner_id);
create policy "Members read school" on schools for select using (
                                                              exists(select 1 from school_members where school_id = id and user_id = auth.uid())
                                                              );

create policy "Members see own membership" on school_members for select using (auth.uid() = user_id);
create policy "Teachers manage members" on school_members for all using (
  exists(select 1 from school_members where school_id = school_members.school_id and user_id = auth.uid() and role = 'teacher')
  or auth.uid() = (select owner_id from schools where id = school_members.school_id)
);
create policy "Students join school" on school_members for insert with check (auth.uid() = user_id);

create policy "Teachers manage questions" on custom_questions for all using (
  auth.uid() = created_by
  or auth.uid() = (select owner_id from schools where id = school_id)
);
create policy "Students read questions" on custom_questions for select using (
                                                                                         exists(select 1 from school_members where school_id = custom_questions.school_id and user_id = auth.uid())
                                                                                         );

-- Indexes
create index idx_school_members_school on school_members(school_id);
create index idx_school_members_user on school_members(user_id);
create index idx_custom_questions_school on custom_questions(school_id);