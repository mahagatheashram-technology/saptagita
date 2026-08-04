import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

interface SaveSnackbarProps {
  visible: boolean;
  removed: boolean;
  onMoveToCollection: () => void;
}

// Brief confirmation after saving/removing a verse. When saved, offers a path
// to file it into a specific collection (opens the bucket picker).
export function SaveSnackbar({
  visible,
  removed,
  onMoveToCollection,
}: SaveSnackbarProps) {
  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(180)}
      exiting={FadeOutDown.duration(160)}
      pointerEvents="box-none"
      className="px-5"
      style={{ position: "absolute", left: 0, right: 0, bottom: 96 }}
    >
      <View className="flex-row items-center justify-between bg-secondary rounded-xl px-4 py-3">
        <View className="flex-row items-center flex-1 mr-2">
          <Ionicons
            name={removed ? "bookmark-outline" : "checkmark-circle"}
            size={18}
            color={removed ? "#D6C3AE" : "#7FD7A8"}
          />
          <Text className="text-white text-sm ml-2">
            {removed ? "Removed from Default" : "Saved to Default"}
          </Text>
        </View>
        {!removed && (
          <Pressable onPress={onMoveToCollection} hitSlop={8} className="pl-2">
            <Text className="text-[#FFC9B0] text-sm font-semibold">
              Move to a collection ›
            </Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}
