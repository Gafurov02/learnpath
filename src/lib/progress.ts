export type AttemptDateRow = {
  created_at: string;
};

export type AttemptOutcomeRow = {
  correct: boolean;
};

export type SessionAttemptRow = AttemptOutcomeRow & {
  session_id: string | null;
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

export function calculateLongestCorrectStreak(attempts: AttemptOutcomeRow[]) {
  let currentStreak = 0;
  let longestStreak = 0;

  for (const attempt of attempts) {
    if (attempt.correct) {
      currentStreak += 1;
      longestStreak = Math.max(longestStreak, currentStreak);
      continue;
    }

    currentStreak = 0;
  }

  return longestStreak;
}

export function hasPerfectSession(attempts: SessionAttemptRow[], minimumAnswers = 10) {
  const sessionStats = new Map<string, { total: number; correct: number }>();

  for (const attempt of attempts) {
    if (!attempt.session_id) {
      continue;
    }

    const current = sessionStats.get(attempt.session_id) ?? { total: 0, correct: 0 };
    current.total += 1;
    if (attempt.correct) {
      current.correct += 1;
    }
    sessionStats.set(attempt.session_id, current);
  }

  return [...sessionStats.values()].some((session) => session.total >= minimumAnswers && session.total === session.correct);
}
