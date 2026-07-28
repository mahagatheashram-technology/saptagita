export const REMINDER_SCHEDULE_DAYS = 30;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function getDeviceLocalDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getReminderDates({
  hour,
  minute,
  completedLocalDate,
  now = new Date(),
  count = REMINDER_SCHEDULE_DAYS,
}: {
  hour: number;
  minute: number;
  completedLocalDate?: string | null;
  now?: Date;
  count?: number;
}): Date[] {
  if (
    !Number.isInteger(hour) ||
    hour < 0 ||
    hour > 23 ||
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error("Reminder time must be a valid local hour and minute.");
  }

  if (!Number.isInteger(count) || count < 0) {
    throw new Error("Reminder count must be a non-negative integer.");
  }

  const dates: Date[] = [];
  // Construct each occurrence from local calendar fields. This lets the device
  // apply the correct UTC offset independently on DST transition days.
  for (let dayOffset = 0; dates.length < count; dayOffset += 1) {
    const candidate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + dayOffset,
      hour,
      minute,
      0,
      0
    );

    if (candidate.getTime() <= now.getTime()) continue;
    if (
      completedLocalDate &&
      getDeviceLocalDate(candidate) === completedLocalDate
    ) {
      continue;
    }

    dates.push(candidate);
  }

  return dates;
}
