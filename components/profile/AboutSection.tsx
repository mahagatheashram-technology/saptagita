import { View, Text, Image, Pressable, Linking } from "react-native";
import Constants from "expo-constants";

const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

export function AboutSection() {
  return (
    <View className="bg-surface rounded-xl p-4 shadow-sm items-center">
      <Text className="text-base font-semibold text-secondary mb-4 self-start">
        About
      </Text>

      <Image
        source={require("@/assets/images/mahagathe-foundation-logo.png")}
        style={{ width: 64, height: 64, marginBottom: 12 }}
        resizeMode="contain"
      />

      <Text className="text-base font-semibold text-secondary">Sapta Gita</Text>
      <Text className="text-xs text-textSecondary mt-1">
        A Mahagathe Foundation Initiative
      </Text>

      <Pressable
        onPress={() => Linking.openURL("https://mahagathe.org")}
        className="mt-3"
      >
        <Text className="text-xs text-primary underline">mahagathe.org</Text>
      </Pressable>

      <Text className="text-[10px] text-textSecondary/50 mt-4">
        Version {APP_VERSION}
      </Text>
    </View>
  );
}
