export function getPreviousLocalDate(localDate: string): string {
  const date = new Date(`${localDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().split("T")[0];
}

export function calculateDateStreak(localDates: string[]): {
  currentStreak: number;
  longestStreak: number;
  lastLocalDate: string;
} {
  const dates = Array.from(new Set(localDates)).sort();
  if (dates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastLocalDate: "",
    };
  }

  let run = 0;
  let longestStreak = 0;
  let previous = "";

  for (const date of dates) {
    run = previous && getPreviousLocalDate(date) === previous ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previous = date;
  }

  return {
    currentStreak: run,
    longestStreak,
    lastLocalDate: dates[dates.length - 1],
  };
}
