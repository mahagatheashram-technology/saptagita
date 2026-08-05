import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  Modal,
  Platform,
  Switch,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  cancelDailyReminder,
  getReminderPreference,
  getStoredReminderTime,
  scheduleDailyReminder,
} from "@/lib/notifications";
import { ScriptPreference } from "@/lib/verseText";

interface SettingsSectionProps {
  userId: Id<"users">;
  reminderTime?: string | null;
  scriptPreference?: ScriptPreference | null;
  /** Absent means discoverable — existing accounts opt in by default. */
  discoverable?: boolean | null;
}

const DEFAULT_REMINDER_TIME = "20:00"; // 8:00 PM

function toStorageTime(date: Date) {
  return date.toLocaleTimeString("en-GB", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDisplayTime(value?: string | null) {
  const [hour, minute] = (value ?? DEFAULT_REMINDER_TIME).split(":").map(Number);
  const date = new Date();
  date.setHours(hour || 0, minute || 0, 0, 0);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function toDate(value?: string | null) {
  const date = new Date();
  if (!value) {
    date.setHours(20, 0, 0, 0);
    return date;
  }
  const [hour, minute] = value.split(":").map(Number);
  date.setHours(hour || 0, minute || 0, 0, 0);
  return date;
}

export function SettingsSection({
  userId,
  reminderTime,
  scriptPreference,
  discoverable,
}: SettingsSectionProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [localReminderTime, setLocalReminderTime] = useState(reminderTime ?? null);
  const [pickerValue, setPickerValue] = useState<Date>(() =>
    toDate(reminderTime)
  );
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [isLoadingPreference, setIsLoadingPreference] = useState(true);
  const [localScriptPreference, setLocalScriptPreference] = useState<ScriptPreference>(
    scriptPreference ?? "devanagari"
  );
  const updateReminderTime = useMutation(api.users.updateReminderTime);
  const updateScriptPreference = useMutation(api.users.updateScriptPreference);
  const resetReadingProgress = useMutation(api.users.resetReadingProgress);
  const updateDiscoverability = useMutation(api.users.updateDiscoverability);

  // Mirror the toggle locally so it responds immediately; `discoverable`
  // arrives as undefined for accounts that predate the field, which means
  // discoverable.
  const [isDiscoverable, setIsDiscoverable] = useState(discoverable !== false);
  const [isSavingDiscoverable, setIsSavingDiscoverable] = useState(false);

  useEffect(() => {
    setIsDiscoverable(discoverable !== false);
  }, [discoverable]);

  const handleToggleDiscoverable = async (next: boolean) => {
    const previous = isDiscoverable;
    setIsDiscoverable(next);
    setIsSavingDiscoverable(true);
    try {
      await updateDiscoverability({ userId, discoverable: next });
    } catch (error) {
      setIsDiscoverable(previous);
      Alert.alert(
        "Could not update",
        "We couldn't save that setting. Check your connection and try again."
      );
    } finally {
      setIsSavingDiscoverable(false);
    }
  };
  const isWeb = Platform.OS === "web";
  const todayProgress = useQuery(api.dailySets.getTodayProgress, { userId });
  const completedLocalDate = todayProgress?.isComplete
    ? todayProgress.localDate
    : null;

  useEffect(() => {
    setLocalReminderTime(reminderTime ?? null);
    setPickerValue(toDate(reminderTime));
  }, [reminderTime]);

  useEffect(() => {
    setLocalScriptPreference(scriptPreference ?? "devanagari");
  }, [scriptPreference]);

  useEffect(() => {
    const loadPreference = async () => {
      if (isWeb) {
        setRemindersEnabled(false);
        setIsLoadingPreference(false);
        return;
      }
      try {
        const enabled = await getReminderPreference();
        setRemindersEnabled(enabled);
      } catch (error) {
        console.log("Failed to load reminder preference", error);
      } finally {
        setIsLoadingPreference(false);
      }
    };

    loadPreference();
  }, [isWeb]);

  const displayTime = useMemo(
    () => toDisplayTime(localReminderTime),
    [localReminderTime]
  );
  const saveReminderTime = async (date: Date) => {
    if (isWeb) {
      Alert.alert("Not available on web", "Notification reminders are disabled on web.");
      return;
    }
    const nextTime = toStorageTime(date);
    setLocalReminderTime(nextTime);
    try {
      await updateReminderTime({ userId, reminderTime: nextTime });
      if (remindersEnabled) {
        await scheduleDailyReminder(date.getHours(), date.getMinutes(), {
          completedLocalDate,
        });
      }
    } catch (error: any) {
      const message =
        error?.message ||
        "Could not update reminder time. Ensure notifications are allowed on this device.";
      Alert.alert("Reminder update failed", message);
    }
  };

  const handleTimePress = () => {
    if (isWeb) {
      Alert.alert("Not available on web", "Notification reminders are disabled on web.");
      return;
    }
    const initialValue = toDate(localReminderTime);
    setPickerValue(initialValue);
    setShowPicker(true);
  };

  const handleTimeChange = (_event: any, selected?: Date) => {
    if (!selected) {
      if (Platform.OS === "android") {
        setShowPicker(false);
      }
      return;
    }

    if (Platform.OS === "android") {
      setShowPicker(false);
      saveReminderTime(selected);
      return;
    }

    setPickerValue(selected);
  };

  const handleTimeDone = () => {
    setShowPicker(false);
    saveReminderTime(pickerValue);
  };

  const handleToggleReminders = async (enabled: boolean) => {
    if (isWeb) {
      Alert.alert("Not available on web", "Notification reminders are disabled on web.");
      return;
    }
    setRemindersEnabled(enabled);
    try {
      if (enabled) {
        const targetTime = localReminderTime || (await getStoredReminderTime()) || DEFAULT_REMINDER_TIME;
        const target = toDate(targetTime);
        await scheduleDailyReminder(target.getHours(), target.getMinutes(), {
          completedLocalDate,
        });
      } else {
        await cancelDailyReminder();
      }
    } catch (error: any) {
      setRemindersEnabled(!enabled);
      const message =
        error?.message ||
        "Could not update reminder settings. Make sure notifications are enabled.";
      Alert.alert("Reminder update failed", message);
    }
  };

  const handleScriptPreferenceChange = async (nextPreference: ScriptPreference) => {
    if (nextPreference === localScriptPreference) {
      return;
    }

    const previousPreference = localScriptPreference;
    setLocalScriptPreference(nextPreference);

    try {
      await updateScriptPreference({ userId, scriptPreference: nextPreference });
    } catch (error: any) {
      setLocalScriptPreference(previousPreference);
      Alert.alert(
        "Update failed",
        String(error?.message ?? error ?? "Could not update verse script.")
      );
    }
  };

  const handleResetProgress = () => {
    Alert.alert(
      "Reset reading progress?",
      "This will restart your daily reading from verse 1. Your streaks and calendar history will stay.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await resetReadingProgress({ userId });
              Alert.alert("Progress reset", "Your next reading starts at verse 1.");
            } catch (error: any) {
              Alert.alert(
                "Reset failed",
                String(error?.message ?? error)
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View className="bg-surface rounded-2xl p-4 shadow-sm">
      <Text className="text-lg font-semibold text-secondary mb-3">Settings</Text>

      <Pressable
        onPress={handleTimePress}
        className="flex-row items-center justify-between py-3"
      >
        <View>
          <Text className="text-sm text-textSecondary">Daily Reminder</Text>
          <Text className="text-base font-semibold text-textPrimary">
            {displayTime}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#718096" />
      </Pressable>

      <View className="h-px bg-[#F0E8DE]" />

      <View className="flex-row items-center justify-between py-3">
        <View>
          <Text className="text-sm text-textSecondary">Notifications</Text>
          <Text className="text-base font-semibold text-textPrimary">
            {isWeb ? "Unavailable on web" : remindersEnabled ? "Enabled" : "Disabled"}
          </Text>
        </View>
        <Switch
          value={remindersEnabled}
          onValueChange={handleToggleReminders}
          disabled={isLoadingPreference || isWeb}
          thumbColor={remindersEnabled ? "#FF6B35" : "#D6C3AE"}
          trackColor={{ false: "#E9DFD3", true: "#FBD38D" }}
        />
      </View>

      <View className="h-px bg-[#F0E8DE]" />

      {/* Opt-out of name search. Absent means discoverable, so existing
          accounts keep working without a migration. */}
      <View className="flex-row items-center justify-between py-3">
        <View className="flex-1 pr-3">
          <Text className="text-sm text-textSecondary">Find me by name</Text>
          <Text className="text-base font-semibold text-textPrimary">
            {isDiscoverable ? "Discoverable" : "Hidden"}
          </Text>
          <Text className="text-xs text-textSecondary/70 mt-0.5">
            Lets other readers find you in search. Your streak is already shown
            on leaderboards either way.
          </Text>
        </View>
        <Switch
          value={isDiscoverable}
          onValueChange={handleToggleDiscoverable}
          disabled={isSavingDiscoverable}
          thumbColor={isDiscoverable ? "#FF6B35" : "#D6C3AE"}
          trackColor={{ false: "#E9DFD3", true: "#FBD38D" }}
        />
      </View>

      <View className="h-px bg-[#F0E8DE]" />

      <View className="py-3">
        <View className="mb-3">
          <Text className="text-sm text-textSecondary">Verse Script</Text>
          <Text className="text-base font-semibold text-textPrimary">
            {localScriptPreference === "telugu" ? "Telugu" : "Devanagari"}
          </Text>
        </View>
        <View className="bg-[#F8F4EE] rounded-2xl p-1 flex-row">
          <Pressable
            onPress={() => handleScriptPreferenceChange("devanagari")}
            className={`flex-1 rounded-[14px] px-4 py-3 ${
              localScriptPreference === "devanagari" ? "bg-white" : ""
            }`}
            style={
              localScriptPreference === "devanagari"
                ? {
                    shadowColor: "#D6C3AE",
                    shadowOpacity: 0.2,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 1,
                  }
                : undefined
            }
          >
            <Text className="text-[11px] uppercase tracking-[1.2px] text-textSecondary mb-1">
              Classic
            </Text>
            <Text className="text-base font-semibold text-textPrimary">
              Devanagari
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleScriptPreferenceChange("telugu")}
            className={`flex-1 rounded-[14px] px-4 py-3 ${
              localScriptPreference === "telugu" ? "bg-white" : ""
            }`}
            style={
              localScriptPreference === "telugu"
                ? {
                    shadowColor: "#D6C3AE",
                    shadowOpacity: 0.2,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 1,
                  }
                : undefined
            }
          >
            <Text className="text-[11px] uppercase tracking-[1.2px] text-textSecondary mb-1">
              Regional
            </Text>
            <Text className="text-base font-semibold text-textPrimary">
              Telugu
            </Text>
          </Pressable>
        </View>
      </View>

      <View className="h-px bg-[#F0E8DE]" />

      <Pressable
        onPress={handleResetProgress}
        className="flex-row items-center justify-between py-3"
      >
        <View>
          <Text className="text-sm text-textSecondary">Reading Progress</Text>
          <Text className="text-base font-semibold text-red-500">
            Reset progress
          </Text>
        </View>
        <Ionicons name="refresh" size={18} color="#F97316" />
      </Pressable>

      {showPicker && Platform.OS === "ios" ? (
        <Modal transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
          <View className="flex-1 items-center justify-center bg-black/40 px-6">
            <View className="bg-surface rounded-2xl p-4 w-full">
              <Text className="text-lg font-semibold text-secondary mb-3">
                Select reminder time
              </Text>
              <View style={{ backgroundColor: "#FFFFFF", borderRadius: 12 }}>
                <DateTimePicker
                  value={pickerValue}
                  mode="time"
                  display="spinner"
                  onChange={handleTimeChange}
                  textColor="#2D3748"
                  themeVariant="light"
                  style={{ backgroundColor: "#FFFFFF" }}
                />
              </View>
              <Pressable
                onPress={handleTimeDone}
                className="mt-4 bg-primary rounded-lg py-2 items-center"
              >
                <Text className="text-white font-semibold">Done</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}

      {showPicker && Platform.OS === "android" ? (
        <View style={{ backgroundColor: "#FFFFFF" }}>
          <DateTimePicker
            value={pickerValue}
            mode="time"
            display="spinner"
            onChange={handleTimeChange}
            themeVariant="light"
            textColor="#2D3748"
          />
        </View>
      ) : null}
    </View>
  );
}
