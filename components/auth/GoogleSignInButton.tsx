import { Alert, Pressable, Text, View } from "react-native";
import { useOAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";

interface GoogleSignInButtonProps {
  label?: string;
}

export function GoogleSignInButton({
  label = "Continue with Google",
}: GoogleSignInButtonProps) {
  const { startOAuthFlow, isLoading } = useOAuth({
    strategy: "oauth_google",
  });

  const onPress = async () => {
    try {
      const { createdSessionId, setActive } = await startOAuthFlow();
      if (createdSessionId) {
        await setActive?.({ session: createdSessionId });
      }
    } catch (error: any) {
      Alert.alert("Google Sign In failed", String(error?.message ?? error));
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isLoading}
      className="bg-white border border-gray-200 rounded-xl py-3 px-4 flex-row items-center justify-center active:opacity-80"
    >
      <View className="w-5 h-5 mr-2 items-center justify-center">
        <Ionicons name="logo-google" size={18} color="#DB4437" />
      </View>
      <Text className="text-textPrimary font-semibold text-base">
        {isLoading ? "Starting..." : label}
      </Text>
    </Pressable>
  );
}
