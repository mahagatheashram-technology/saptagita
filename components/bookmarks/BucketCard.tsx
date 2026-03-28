import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface BucketCardProps {
  name: string;
  count: number;
  isDefault?: boolean;
  icon?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  onMenuPress?: () => void;
}

export function BucketCard({
  name,
  count,
  isDefault,
  icon,
  onPress,
  onLongPress,
  onMenuPress,
}: BucketCardProps) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      className="bg-surface rounded-2xl p-4 mb-3 shadow-sm"
    >
      <View className="flex-row items-center">
        <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-3">
          {icon ? (
            <Text className="text-2xl">{icon}</Text>
          ) : (
            <Ionicons
              name={isDefault ? "bookmark" : "folder-outline"}
              size={20}
              color="#FF6B35"
            />
          )}
        </View>
        <View className="flex-1">
          <Text className="text-lg font-semibold text-textPrimary">
            {name}
          </Text>
          <Text className="text-sm text-textSecondary">
            {count} {count === 1 ? "verse" : "verses"}
          </Text>
        </View>
        {isDefault && (
          <View className="px-3 py-1 rounded-full bg-primary/10">
            <Text className="text-xs text-primary font-medium">Default</Text>
          </View>
        )}
        {!isDefault && onMenuPress ? (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onMenuPress();
            }}
            className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center active:opacity-80"
            hitSlop={8}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color="#718096" />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}
