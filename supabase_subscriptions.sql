-- Выполни в Supabase → SQL Editor

create table if not exists subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid references auth.users(id) on delete cascade not null unique,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  status                  text not null default 'free',  -- 'free' | 'active' | 'cancelled'
  plan                    text not null default 'free',  -- 'free' | 'pro'
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

create index idx_subscriptions_user on subscriptions(user_id);

alter table subscriptions enable row level security;

drop policy if exists "Users can read own subscription" on subscriptions;
create policy "Users can read own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "Service role can write subscriptions" on subscriptions;
-- Service role bypasses RLS automatically, so no broad write policy is needed here.

-- Auto-create free subscription on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into subscriptions (user_id, status, plan)
  values (new.id, 'free', 'free')
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
