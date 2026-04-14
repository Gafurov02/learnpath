-- Run this once in Supabase SQL Editor for already-provisioned projects.
-- It removes permissive policies that made billing and achievement tables writable
-- from client-side roles.

drop policy if exists "Service role can write subscriptions" on subscriptions;
drop policy if exists "Service role writes achievements" on user_achievements;
