export type AttemptDateRow = {
  created_at: string;
};

export function getUtcDayKey(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

export function calculateDailyStreak(attempts: AttemptDateRow[]) {
  const uniqueDays = [...new Set(attempts.map((attempt) => getUtcDayKey(attempt.created_at)))];
  let streak = 0;
  const today = new Date();

  for (let index = 0; index < uniqueDays.length; index += 1) {
    const current = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    current.setUTCDate(current.getUTCDate() - index);

    if (uniqueDays.includes(current.toISOString().slice(0, 10))) {
      streak += 1;
      continue;
    }

    break;
  }

  return streak;
}
