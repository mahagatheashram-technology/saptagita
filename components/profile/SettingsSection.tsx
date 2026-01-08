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
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  cancelDailyReminder,
  getReminderPreference,
  getStoredReminderTime,
  scheduleDailyReminder,
} from "@/lib/notifications";

interface SettingsSectionProps {
  userId: Id<"users">;
  reminderTime?: string | null;
  mode?: string | null;
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
  mode,
}: SettingsSectionProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [localReminderTime, setLocalReminderTime] = useState(reminderTime ?? null);
  const [pickerValue, setPickerValue] = useState<Date>(() =>
    toDate(reminderTime)
  );
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [isLoadingPreference, setIsLoadingPreference] = useState(true);
  const updateReminderTime = useMutation(api.users.updateReminderTime);

  useEffect(() => {
    setLocalReminderTime(reminderTime ?? null);
    setPickerValue(toDate(reminderTime));
  }, [reminderTime]);

  useEffect(() => {
    const loadPreference = async () => {
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
  }, []);

  const displayTime = useMemo(
    () => toDisplayTime(localReminderTime),
    [localReminderTime]
  );
  const modeLabel = mode === "random" ? "Random" : "Sequential";

  const saveReminderTime = async (date: Date) => {
    const nextTime = toStorageTime(date);
    setLocalReminderTime(nextTime);
    try {
      await updateReminderTime({ userId, reminderTime: nextTime });
      if (remindersEnabled) {
        await scheduleDailyReminder(date.getHours(), date.getMinutes());
      }
    } catch (error: any) {
      const message =
        error?.message ||
        "Could not update reminder time. Ensure notifications are allowed on this device.";
      Alert.alert("Reminder update failed", message);
    }
  };

  const handleTimePress = () => {
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
    setRemindersEnabled(enabled);
    try {
      if (enabled) {
        const targetTime = localReminderTime || (await getStoredReminderTime()) || DEFAULT_REMINDER_TIME;
        const target = toDate(targetTime);
        await scheduleDailyReminder(target.getHours(), target.getMinutes());
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

  return (
    <View className="bg-surface rounded-xl p-4 shadow-sm">
      <Text className="text-base font-semibold text-secondary mb-3">Settings</Text>

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

      <View className="h-px bg-[#EDF2F7]" />

      <View className="flex-row items-center justify-between py-3">
        <View>
          <Text className="text-sm text-textSecondary">Notifications</Text>
          <Text className="text-base font-semibold text-textPrimary">
            {remindersEnabled ? "Enabled" : "Disabled"}
          </Text>
        </View>
        <Switch
          value={remindersEnabled}
          onValueChange={handleToggleReminders}
          disabled={isLoadingPreference}
          thumbColor={remindersEnabled ? "#FF6B35" : "#CBD5E0"}
          trackColor={{ false: "#E2E8F0", true: "#FBD38D" }}
        />
      </View>

      <View className="h-px bg-[#EDF2F7]" />

      <Pressable
        onPress={() =>
          Alert.alert(
            "Random mode",
            "Random mode coming soon. Stay tuned!"
          )
        }
        className="flex-row items-center justify-between py-3"
      >
        <View>
          <Text className="text-sm text-textSecondary">Reading Mode</Text>
          <Text className="text-base font-semibold text-textPrimary">
            {modeLabel}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#718096" />
      </Pressable>

      {showPicker && Platform.OS === "ios" ? (
        <Modal transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
          <View className="flex-1 items-center justify-center bg-black/40 px-6">
            <View className="bg-surface rounded-xl p-4 w-full">
              <Text className="text-base font-semibold text-secondary mb-3">
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
