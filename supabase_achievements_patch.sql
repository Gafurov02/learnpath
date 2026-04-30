-- Run once in Supabase SQL Editor for existing projects.
-- Adds question-bank achievements used by the school import flow.

insert into achievements (code, name, description, icon, xp_reward) values
  ('question_importer', 'Question Importer', 'Import your first question batch', '📦', 25),
  ('question_bank_50',  'Question Curator',  'Build a school bank with 50 questions', '🗂️', 75),
  ('question_bank_200', 'Exam Architect',    'Build a school bank with 200 questions', '🏗️', 200)
on conflict (code) do nothing;
