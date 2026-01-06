import { View, Text, Pressable } from "react-native";

interface AccountSectionProps {
  onSignOut: () => Promise<void>;
  onDeleteAccount: () => void;
  isDeleting: boolean;
}

export function AccountSection({
  onSignOut,
  onDeleteAccount,
  isDeleting,
}: AccountSectionProps) {
  return (
    <View className="bg-surface rounded-xl p-4 shadow-sm">
      <Text className="text-base font-semibold text-secondary mb-3">Account</Text>

      <Pressable
        onPress={onSignOut}
        className="bg-primary rounded-xl py-3 px-4 items-center"
      >
        <Text className="text-white font-semibold">Sign out</Text>
      </Pressable>

      <Pressable
        onPress={onDeleteAccount}
        disabled={isDeleting}
        className="mt-3 border border-red-200 rounded-xl py-3 px-4 items-center"
      >
        <Text className="text-red-600 font-semibold">
          {isDeleting ? "Deleting..." : "Delete account"}
        </Text>
      </Pressable>
    </View>
  );
}
