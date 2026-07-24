import { Platform } from "react-native";
import { getDeviceLocalDate, getReminderDates } from "./reminderSchedule";

// SecureStore keys must be alphanumeric with ., -, or _
const REMINDER_ENABLED_KEY = "notifications_reminders_enabled";
const REMINDER_TIME_KEY = "notifications_reminder_time";
const ANDROID_CHANNEL_ID = "default";
const REMINDER_DATA_KEY = "saptaGitaDailyReminder";

const isWeb = Platform.OS === "web";

// Serializes all schedule/cancel work. Without this, concurrent callers (app
// init + Settings, or a re-fired effect) can each observe "not scheduled",
// then each cancel-all and add — producing two daily notifications that fire
// together. Chaining every operation through one promise makes cancel+schedule
// atomic relative to other scheduling work.
let schedulingChain: Promise<unknown> = Promise.resolve();
function withSchedulingLock<T>(operation: () => Promise<T>): Promise<T> {
  const run = schedulingChain.then(operation, operation);
  // Keep the chain alive even if an operation rejects.
  schedulingChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}
type NotificationsModule = typeof import("expo-notifications");
type DeviceModule = typeof import("expo-device");

async function getSecureStore() {
  if (isWeb) return null;
  try {
    const mod = await import("expo-secure-store");
    return mod;
  } catch {
    return null;
  }
}

async function getNotifications(): Promise<NotificationsModule | null> {
  if (isWeb || typeof window === "undefined") return null;
  try {
    const mod = await import("expo-notifications");
    return mod;
  } catch {
    return null;
  }
}

async function getDevice(): Promise<DeviceModule | null> {
  if (isWeb) return null;
  try {
    const mod = await import("expo-device");
    return mod;
  } catch {
    return null;
  }
}

async function isPreferenceStorageAvailable() {
  const SecureStore = await getSecureStore();
  if (!SecureStore) return false;
  return SecureStore.isAvailableAsync();
}

export async function getReminderPreference(): Promise<boolean> {
  if (isWeb) return false;
  if (!(await isPreferenceStorageAvailable())) {
    return true;
  }
  try {
    const SecureStore = await getSecureStore();
    if (!SecureStore) return true;
    const stored = await SecureStore.getItemAsync(REMINDER_ENABLED_KEY);
    if (stored === null) return true;
    return stored === "true";
  } catch (error) {
    console.log("Failed to read reminder preference", error);
    return true;
  }
}

export async function setReminderPreference(enabled: boolean): Promise<void> {
  if (isWeb) return;
  if (!(await isPreferenceStorageAvailable())) {
    return;
  }
  try {
    const SecureStore = await getSecureStore();
    if (!SecureStore) return;
    await SecureStore.setItemAsync(REMINDER_ENABLED_KEY, enabled ? "true" : "false");
  } catch (error) {
    console.log("Failed to persist reminder preference", error);
  }
}

export async function getStoredReminderTime(): Promise<string | null> {
  if (isWeb) return null;
  if (!(await isPreferenceStorageAvailable())) {
    return null;
  }
  try {
    const SecureStore = await getSecureStore();
    if (!SecureStore) return null;
    return await SecureStore.getItemAsync(REMINDER_TIME_KEY);
  } catch (error) {
    console.log("Failed to read reminder time", error);
    return null;
  }
}

async function setStoredReminderTime(value: string) {
  if (isWeb) return;
  if (!(await isPreferenceStorageAvailable())) {
    return;
  }
  try {
    const SecureStore = await getSecureStore();
    if (!SecureStore) return;
    await SecureStore.setItemAsync(REMINDER_TIME_KEY, value);
  } catch (error) {
    console.log("Failed to store reminder time", error);
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (isWeb) return false;

  const Device = await getDevice();
  const Notifications = await getNotifications();
  if (!Device || !Notifications) return false;

  if (!Device.isDevice) {
    console.log("Notifications only work on physical devices");
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Notification permissions not granted");
    return false;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: "Reminders",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  return true;
}

// Cancels OS-scheduled notifications without touching the saved preference or
// acquiring the lock. cancel-all also removes the legacy repeating reminder,
// which did not carry identifying data.
async function clearAllScheduledNotifications(): Promise<void> {
  if (isWeb) return;
  const Notifications = await getNotifications();
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function scheduleDailyReminder(
  hour = 20,
  minute = 0,
  options: { completedLocalDate?: string | null } = {}
): Promise<string | null> {
  return withSchedulingLock(() =>
    scheduleDailyReminderInner(hour, minute, options.completedLocalDate)
  );
}

async function scheduleDailyReminderInner(
  hour: number,
  minute: number,
  completedLocalDate?: string | null
): Promise<string | null> {
  if (isWeb) {
    throw new Error("Notifications are not available on web.");
  }

  const Device = await getDevice();
  const Notifications = await getNotifications();
  if (!Device || !Notifications) {
    throw new Error("Notifications are unavailable on this platform.");
  }

  if (!Device.isDevice) {
    throw new Error("Notifications require a physical device to schedule.");
  }

  const granted = await requestNotificationPermissions();
  if (!granted) {
    throw new Error("Notification permissions are required. Enable them in Settings.");
  }

  await clearAllScheduledNotifications();
  await setReminderPreference(true);

  const targetTimeString = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  await setStoredReminderTime(targetTimeString);

  const reminderDates = getReminderDates({
    hour,
    minute,
    completedLocalDate,
  });
  let firstId: string | null = null;

  for (const date of reminderDates) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Your verses await",
        body: "Complete today's seven verses to keep your streak alive.",
        sound: true,
        badge: 1,
        data: {
          [REMINDER_DATA_KEY]: true,
          reminderLocalDate: getDeviceLocalDate(date),
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
    firstId ??= id;
  }

  console.log(`Scheduled ${reminderDates.length} daily reminders`);
  return firstId;
}

export function reconcileDailyReminder(options: {
  completedLocalDate?: string | null;
} = {}): Promise<string | null> {
  return withSchedulingLock(async () => {
    if (isWeb) return null;

    const enabled = await getReminderPreference();
    if (!enabled) {
      await clearAllScheduledNotifications();
      return null;
    }

    const storedTime = await getStoredReminderTime();
    const [hour, minute] = (storedTime ?? "20:00")
      .split(":")
      .map((value) => Number(value));

    return scheduleDailyReminderInner(
      Number.isInteger(hour) ? hour : 20,
      Number.isInteger(minute) ? minute : 0,
      options.completedLocalDate
    );
  });
}

export function cancelDailyReminder(): Promise<void> {
  return withSchedulingLock(async () => {
    if (isWeb) return;
    await clearAllScheduledNotifications();
    await setReminderPreference(false);
  });
}

export async function getScheduledNotifications() {
  if (isWeb) return [];
  const Notifications = await getNotifications();
  if (!Notifications) return [];
  return Notifications.getAllScheduledNotificationsAsync();
}

export async function getScheduledNotificationSummaries() {
  if (isWeb) return [];
  const Notifications = await getNotifications();
  if (!Notifications) return [];
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.map((item) => {
    const trigger: any = item.trigger;
    const seconds = trigger?.seconds;
    return {
      id: item.identifier,
      type: trigger?.type ?? "unknown",
      hour: trigger?.hour ?? trigger?.dateComponents?.hour,
      minute: trigger?.minute ?? trigger?.dateComponents?.minute,
      repeats: trigger?.repeats ?? false,
      seconds,
    };
  });
}

export async function clearBadge(): Promise<void> {
  if (isWeb) return;
  const Notifications = await getNotifications();
  if (!Notifications) return;
  await Notifications.setBadgeCountAsync(0);
}

export async function sendTestNotification(): Promise<string | null> {
  if (isWeb) {
    console.log("Test notification not available on web");
    return null;
  }
  const permissionsGranted = await requestNotificationPermissions();
  if (!permissionsGranted) return null;

  const Notifications = await getNotifications();
  if (!Notifications) return null;
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Test notification",
      body: "This is a test notification from the dev panel.",
      sound: true,
      badge: 1,
    },
    trigger: null,
  });

  return id;
}
