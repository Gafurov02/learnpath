-- achievements.sql

create table if not exists public.achievements (
                                                   id text primary key,

                                                   title text not null,

                                                   description text not null,

                                                   icon text not null,

                                                   xp_reward integer not null default 0,

                                                   rarity text not null default 'common',

                                                   created_at timestamptz default now()
    );

create table if not exists public.user_achievements (
                                                        id uuid primary key default gen_random_uuid(),

    user_id uuid not null references auth.users(id) on delete cascade,

    achievement_id text not null references achievements(id) on delete cascade,

    unlocked_at timestamptz default now(),

    unique(user_id, achievement_id)
    );

alter table public.user_achievements enable row level security;

create policy "Users can view own achievements"
on public.user_achievements
for select
               using (auth.uid() = user_id);