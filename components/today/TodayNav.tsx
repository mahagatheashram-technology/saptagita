import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface TodayNavProps {
  canPrev: boolean;
  isReviewing: boolean; // viewing an already-read verse
  onPrev: () => void;
  onNext: () => void; // forward; marks read on the live verse
  disabled?: boolean;
}

export function TodayNav({
  canPrev,
  isReviewing,
  onPrev,
  onNext,
  disabled = false,
}: TodayNavProps) {
  return (
    <View className="px-5 pb-3">
      <View
        className="rounded-2xl px-4 py-3"
        style={{ backgroundColor: "rgba(255, 255, 255, 0.86)" }}
      >
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={onPrev}
            disabled={disabled || !canPrev}
            className="flex-row items-center px-3 py-2 rounded-full active:bg-gray-100"
            style={{ opacity: disabled || !canPrev ? 0.4 : 1 }}
          >
            <Ionicons name="chevron-back" size={18} color="#1A365D" />
            <Text className="text-secondary ml-1 text-sm font-medium">
              Previous
            </Text>
          </Pressable>

          <Pressable
            onPress={onNext}
            disabled={disabled}
            className="flex-row items-center px-4 py-2 rounded-full bg-primary active:opacity-80"
            style={{ opacity: disabled ? 0.5 : 1 }}
          >
            <Text className="text-white mr-1 text-sm font-semibold">
              {isReviewing ? "Next" : "Mark as read"}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        <Text className="text-xs text-textSecondary mt-2 text-center">
          Swipe ← back · → forward · tap a dot to jump
        </Text>
      </View>

      {/* Subtle foundation branding */}
      <View className="flex-row items-center justify-center mt-1">
        <Image
          source={require("@/assets/images/mahagathe-foundation-logo.png")}
          style={{ width: 14, height: 14, marginRight: 5 }}
          resizeMode="contain"
        />
        <Text className="text-[9px] text-textSecondary/30 tracking-[0.5px]">
          Mahagathe Foundation
        </Text>
      </View>
    </View>
  );
}
