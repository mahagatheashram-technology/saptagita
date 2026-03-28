import { Platform } from "react-native";

const GESTURE_COACH_KEY_PREFIX = "today_gesture_coach_seen";
const isWeb = Platform.OS === "web";

async function getSecureStore() {
  if (isWeb) return null;
  try {
    const mod = await import("expo-secure-store");
    return mod;
  } catch {
    return null;
  }
}

function getGestureCoachKey(userId: string) {
  return `${GESTURE_COACH_KEY_PREFIX}_${userId}`;
}

export async function hasSeenTodayGestureCoach(userId: string): Promise<boolean> {
  const key = getGestureCoachKey(userId);

  if (isWeb) {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(key) === "true";
    } catch {
      return false;
    }
  }

  try {
    const SecureStore = await getSecureStore();
    if (!SecureStore) return false;
    const isAvailable = await SecureStore.isAvailableAsync();
    if (!isAvailable) return false;
    return (await SecureStore.getItemAsync(key)) === "true";
  } catch {
    return false;
  }
}

export async function markTodayGestureCoachSeenLocally(userId: string): Promise<void> {
  const key = getGestureCoachKey(userId);

  if (isWeb) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, "true");
    } catch {
      return;
    }
    return;
  }

  try {
    const SecureStore = await getSecureStore();
    if (!SecureStore) return;
    const isAvailable = await SecureStore.isAvailableAsync();
    if (!isAvailable) return;
    await SecureStore.setItemAsync(key, "true");
  } catch {
    return;
  }
}
