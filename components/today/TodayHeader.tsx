import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface TodayHeaderProps {
  currentIndex: number;
  totalVerses: number;
  streak?: number;
}

export function TodayHeader({
  currentIndex,
  totalVerses,
  streak = 0,
}: TodayHeaderProps) {
  const versesRead = currentIndex;

  return (
    <View className="px-5 pt-2 pb-4">
      {/* Top row: Title and Streak */}
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-2xl font-bold text-secondary">Today's Reading</Text>

        {/* Streak Badge */}
        <View className="flex-row items-center bg-orange-50 px-3 py-1.5 rounded-full">
          <Ionicons name="flame" size={18} color="#FF6B35" />
          <Text className="text-primary font-semibold ml-1">{streak}</Text>
        </View>
      </View>

      {/* Progress indicator */}
      <View className="flex-row items-center">
        <Text className="text-textSecondary">
          {versesRead} of {totalVerses} verses read
        </Text>

        {/* Progress dots */}
        <View className="flex-row ml-3">
          {Array.from({ length: totalVerses }).map((_, i) => (
            <View
              key={i}
              className={`w-2 h-2 rounded-full mx-0.5 ${
                i < versesRead ? "bg-primary" : "bg-gray-200"
              }`}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
