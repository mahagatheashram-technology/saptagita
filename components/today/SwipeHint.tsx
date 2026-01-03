import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function SwipeHint() {
  return (
    <View className="flex-row justify-center items-center py-4">
      <View className="flex-row items-center mr-6">
        <Ionicons name="arrow-back" size={16} color="#718096" />
        <Text className="text-textSecondary ml-1 text-sm">More options</Text>
      </View>

      <View className="flex-row items-center">
        <Text className="text-textSecondary mr-1 text-sm">Mark as read</Text>
        <Ionicons name="arrow-forward" size={16} color="#718096" />
      </View>
    </View>
  );
}
