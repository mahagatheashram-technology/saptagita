import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// SecureStore keys must be alphanumeric with ., -, or _
const REMINDER_ENABLED_KEY = "notifications_reminders_enabled";
const REMINDER_TIME_KEY = "notifications_reminder_time";
const ANDROID_CHANNEL_ID = "default";

async function isPreferenceStorageAvailable() {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function getReminderPreference(): Promise<boolean> {
  if (!(await isPreferenceStorageAvailable())) {
    return true;
  }
  try {
    const stored = await SecureStore.getItemAsync(REMINDER_ENABLED_KEY);
    if (stored === null) return true;
    return stored === "true";
  } catch (error) {
    console.log("Failed to read reminder preference", error);
    return true;
  }
}

export async function setReminderPreference(enabled: boolean): Promise<void> {
  if (!(await isPreferenceStorageAvailable())) {
    return;
  }
  try {
    await SecureStore.setItemAsync(REMINDER_ENABLED_KEY, enabled ? "true" : "false");
  } catch (error) {
    console.log("Failed to persist reminder preference", error);
  }
}

export async function getStoredReminderTime(): Promise<string | null> {
  if (!(await isPreferenceStorageAvailable())) {
    return null;
  }
  try {
    return await SecureStore.getItemAsync(REMINDER_TIME_KEY);
  } catch (error) {
    console.log("Failed to read reminder time", error);
    return null;
  }
}

async function setStoredReminderTime(value: string) {
  if (!(await isPreferenceStorageAvailable())) {
    return;
  }
  try {
    await SecureStore.setItemAsync(REMINDER_TIME_KEY, value);
  } catch (error) {
    console.log("Failed to store reminder time", error);
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
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

export async function scheduleDailyReminder(
  hour = 20,
  minute = 0
): Promise<string | null> {
  if (!Device.isDevice) {
    throw new Error("Notifications require a physical device to schedule.");
  }

  const granted = await requestNotificationPermissions();
  if (!granted) {
    throw new Error("Notification permissions are required. Enable them in Settings.");
  }

  await cancelDailyReminder();
  await setReminderPreference(true);

  const targetTimeString = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  await setStoredReminderTime(targetTimeString);

  const trigger: Notifications.DailyTriggerInput = {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour,
    minute,
    channelId: ANDROID_CHANNEL_ID,
  };

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Your verses await",
      body: "Complete your 7 daily verses to keep your streak alive!",
      sound: true,
      badge: 1,
    },
    trigger,
  });

  console.log("Scheduled daily reminder with ID:", id);
  return id;
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await setReminderPreference(false);
}

export async function isDailyReminderScheduled(): Promise<boolean> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.length > 0;
}

export async function getScheduledNotifications() {
  return Notifications.getAllScheduledNotificationsAsync();
}

export async function getScheduledNotificationSummaries() {
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
  await Notifications.setBadgeCountAsync(0);
}

export async function sendTestNotification(): Promise<string | null> {
  const permissionsGranted = await requestNotificationPermissions();
  if (!permissionsGranted) return null;

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
