-- Выполни в Supabase → SQL Editor

-- Уровни пользователя (XP + level)
alter table subscriptions add column if not exists xp integer not null default 0;
alter table subscriptions add column if not exists level text not null default 'beginner';

-- Достижения
create table if not exists achievements (
  id          serial primary key,
  code        text unique not null,
  name        text not null,
  description text not null,
  icon        text not null,
  xp_reward   integer not null default 0
);

insert into achievements (code, name, description, icon, xp_reward) values
  ('first_answer',    'First Step',    'Answer your first question',          '🎯', 10),
  ('streak_3',        'On a Roll',     '3-day streak',                        '🔥', 30),
  ('streak_7',        'On Fire',       '7-day streak',                        '🔥', 50),
  ('streak_30',       'Iron Will',     '30-day streak',                       '🏅', 200),
  ('correct_10',      'Sharp Shooter', '10 correct in a row',                 '⚡', 50),
  ('correct_100',     'Bookworm',      'Answer 100 questions',                '📚', 100),
  ('perfect_session', 'Perfectionist', '100% accuracy in a session (10+)',    '🎯', 75),
  ('all_exams',       'Globetrotter',  'Practice all 6 exams',                '🌍', 150),
  ('xp_500',          'Rising Star',   'Earn 500 XP',                         '⭐', 50),
  ('xp_1500',         'Advanced',      'Reach Advanced level',                '💜', 100),
  ('xp_3000',         'Master',        'Reach Master level',                  '👑', 300),
  ('streak_rocket',   'Rocket',        'Earn 500 XP in one week',             '🚀', 100)
on conflict (code) do nothing;

-- Достижения пользователей
create table if not exists user_achievements (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  achievement  text references achievements(code) not null,
  earned_at    timestamptz default now(),
  unique(user_id, achievement)
);

create index idx_ua_user on user_achievements(user_id);

alter table user_achievements enable row level security;
drop policy if exists "Users read own achievements" on user_achievements;
create policy "Users read own achievements" on user_achievements for select using (auth.uid() = user_id);
drop policy if exists "Service role writes achievements" on user_achievements;
-- Service role bypasses RLS automatically, so client roles should not have write access.

-- Leaderboard view (top users by XP)
create or replace view leaderboard as
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) as display_name,
  coalesce(u.raw_user_meta_data->>'avatar_url', '') as avatar_url,
  s.xp,
  s.level,
  row_number() over (order by s.xp desc) as rank
from auth.users u
join subscriptions s on s.user_id = u.id
order by s.xp desc
limit 100;

-- RLS for leaderboard (public read)
grant select on leaderboard to anon, authenticated;
