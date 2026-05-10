-- user_streaks.sql

create table if not exists public.user_streaks (
                                                   user_id uuid primary key references auth.users(id) on delete cascade,

    streak_count integer not null default 0,

    best_streak integer not null default 0,

    last_activity_date date,

    streak_freezes integer not null default 0,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
    );

alter table public.user_streaks enable row level security;

create policy "Users can view own streak"
on public.user_streaks
for select
               using (auth.uid() = user_id);

create policy "Users can update own streak"
on public.user_streaks
for update
               using (auth.uid() = user_id);

create policy "Users can insert own streak"
on public.user_streaks
for insert
with check (auth.uid() = user_id);