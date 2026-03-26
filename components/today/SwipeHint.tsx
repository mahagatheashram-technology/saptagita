import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SwipeHintProps {
  onMoreOptions: () => void;
  onMarkRead: () => void;
  disabled?: boolean;
}

export function SwipeHint({
  onMoreOptions,
  onMarkRead,
  disabled = false,
}: SwipeHintProps) {
  return (
    <View className="px-5 pb-3">
      <View
        className="rounded-2xl px-4 py-3"
        style={{ backgroundColor: "rgba(255, 255, 255, 0.86)" }}
      >
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={onMoreOptions}
            disabled={disabled}
            className={`flex-row items-center px-3 py-2 rounded-full ${
              disabled ? "opacity-50" : "active:bg-gray-100"
            }`}
          >
            <Ionicons name="arrow-back" size={16} color="#718096" />
            <Text className="text-textSecondary ml-1 text-sm font-medium">
              More options
            </Text>
          </Pressable>

          <Pressable
            onPress={onMarkRead}
            disabled={disabled}
            className={`flex-row items-center px-3 py-2 rounded-full ${
              disabled ? "opacity-50" : "active:bg-gray-100"
            }`}
          >
            <Text className="text-secondary mr-1 text-sm font-semibold">
              Mark as read
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#1A365D" />
          </Pressable>
        </View>

        <Text className="text-xs text-textSecondary mt-2 text-center">
          You can tap or swipe.
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
