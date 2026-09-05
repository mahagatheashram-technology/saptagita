import assert from "node:assert/strict";
import test from "node:test";
import {
  getDeviceLocalDate,
  getReminderDates,
} from "../lib/reminderSchedule.ts";

test("skips the completed local date and schedules the next days", () => {
  const now = new Date(2026, 6, 24, 12, 0, 0);
  const dates = getReminderDates({
    hour: 20,
    minute: 0,
    completedLocalDate: "2026-07-24",
    now,
    count: 2,
  });

  assert.deepEqual(dates.map(getDeviceLocalDate), [
    "2026-07-25",
    "2026-07-26",
  ]);
});

test("does not schedule a reminder retroactively", () => {
  const now = new Date(2026, 6, 24, 20, 1, 0);
  const [next] = getReminderDates({ hour: 20, minute: 0, now, count: 1 });

  assert.equal(getDeviceLocalDate(next), "2026-07-25");
});

test("constructs each reminder using the date-specific DST offset", () => {
  const previousTimezone = process.env.TZ;
  process.env.TZ = "America/New_York";

  try {
    const now = new Date(2026, 2, 7, 19, 0, 0);
    const dates = getReminderDates({
      hour: 20,
      minute: 0,
      now,
      count: 2,
    });

    assert.deepEqual(dates.map(getDeviceLocalDate), [
      "2026-03-07",
      "2026-03-08",
    ]);
    assert.equal(dates[1].getTime() - dates[0].getTime(), 23 * 60 * 60 * 1000);
  } finally {
    process.env.TZ = previousTimezone;
  }
});
