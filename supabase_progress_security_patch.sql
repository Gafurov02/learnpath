-- Выполни в Supabase -> SQL Editor для уже существующей базы.
-- Патч нужен, чтобы один answerToken нельзя было записать как прогресс повторно.

alter table quiz_attempts
  add column if not exists question_token_hash text;

create unique index if not exists idx_quiz_attempts_question_token_hash
  on quiz_attempts(question_token_hash)
  where question_token_hash is not null;
