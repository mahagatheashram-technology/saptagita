import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export function impact(
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light
) {
  if (Platform.OS === "web") return Promise.resolve();
  return Haptics.impactAsync(style);
}

export function notify(
  type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success
) {
  if (Platform.OS === "web") return Promise.resolve();
  return Haptics.notificationAsync(type);
}
