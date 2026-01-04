import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, Pressable } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { DevPanel } from "@/components/dev/DevPanel";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user, isLoading, error } = useCurrentUser();

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-base font-semibold text-textPrimary mb-2">
          Account sync failed
        </Text>
        <Text className="text-sm text-textSecondary text-center mb-4">
          {String(error?.message ?? error)}
        </Text>
        <Pressable
          onPress={async () => {
            try {
              await signOut?.();
            } catch (signOutError) {
              console.error("Sign out failed", signOutError);
            }
          }}
          className="bg-primary rounded-xl py-3 px-4"
        >
          <Text className="text-white font-semibold">Sign out</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (isLoading || !user) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-textSecondary">Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background px-5 py-4">
      <View className="mb-6">
        <Text className="text-2xl font-bold text-secondary mb-1">
          {user.displayName}
        </Text>
        <Text className="text-sm text-textSecondary">
          Timezone: {user.timezone}
        </Text>
      </View>

      <Pressable
        onPress={async () => {
          try {
            await signOut?.();
          } catch (error) {
            console.error("Sign out failed", error);
          }
        }}
        className="bg-primary rounded-xl py-3 px-4 items-center mb-6"
      >
        <Text className="text-white font-semibold">Sign out</Text>
      </Pressable>

      {__DEV__ ? <DevPanel userId={user._id} /> : null}
    </SafeAreaView>
  );
}
