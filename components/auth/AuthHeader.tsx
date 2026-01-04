import { View, Text } from "react-native";

interface AuthHeaderProps {
  title?: string;
  subtitle?: string;
}

export function AuthHeader({
  title = "Sapta Gita",
  subtitle = "Read 7 verses daily. Build your streak.",
}: AuthHeaderProps) {
  return (
    <View className="items-center mb-8">
      <Text style={{ fontSize: 48 }} className="mb-2">
        🙏
      </Text>
      <Text className="text-2xl font-bold text-secondary mb-1">{title}</Text>
      <Text className="text-sm text-textSecondary text-center px-6">
        {subtitle}
      </Text>
    </View>
  );
}
