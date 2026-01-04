import { Alert, Pressable, Text, View } from "react-native";
import { useOAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";

interface AppleSignInButtonProps {
  label?: string;
}

export function AppleSignInButton({
  label = "Continue with Apple",
}: AppleSignInButtonProps) {
  const { startOAuthFlow, isLoading } = useOAuth({
    strategy: "oauth_apple",
  });

  const onPress = async () => {
    try {
      const { createdSessionId, setActive } = await startOAuthFlow();
      if (createdSessionId) {
        await setActive?.({ session: createdSessionId });
      }
    } catch (error: any) {
      Alert.alert("Apple Sign In failed", String(error?.message ?? error));
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isLoading}
      className="bg-black rounded-xl py-3 px-4 flex-row items-center justify-center active:opacity-80"
    >
      <View className="w-5 h-5 mr-2 items-center justify-center">
        <Ionicons name="logo-apple" size={18} color="#FFFFFF" />
      </View>
      <Text className="text-white font-semibold text-base">
        {isLoading ? "Starting..." : label}
      </Text>
    </Pressable>
  );
}
