import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { DevPanel } from "@/components/dev/DevPanel";
import {
  AccountSection,
  ProfileHeader,
  ReadingCalendar,
  SettingsSection,
  StreakStatsCard,
} from "@/components/profile";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user, isLoading, error, clerkUser } = useCurrentUser();
  const [isDeleting, setIsDeleting] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  const streakStats = useQuery(
    api.streaks.getStreakStats,
    user ? { userId: user._id } : "skip"
  );
  const readingHistory = useQuery(
    api.dailySets.getReadingHistory,
    user ? { userId: user._id, days: 90 } : "skip"
  );
  const userState = useQuery(
    api.users.getUserState,
    user ? { userId: user._id } : "skip"
  );
  const deleteUserData = useMutation(api.users.deleteUserData);
  const updateDisplayName = useMutation(api.users.updateDisplayName);

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user?.displayName]);

  const handleSignOut = async () => {
    try {
      await signOut?.();
    } catch (signOutError) {
      console.error("Sign out failed", signOutError);
    }
  };

  const handleDeleteAccount = () => {
    if (!user) return;

    Alert.alert(
      "Delete account?",
      "This will delete your reading history, streaks, and bookmarks.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteUserData({ userId: user._id });
              if (clerkUser?.delete) {
                await clerkUser.delete();
              }
              await signOut?.();
            } catch (deleteError) {
              console.error("Delete account failed", deleteError);
              Alert.alert(
                "Delete failed",
                "We couldn't delete your account. Please try again."
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

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
          onPress={handleSignOut}
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

  const email = clerkUser?.primaryEmailAddress?.emailAddress || "";
  const isDevUser = email === "ynithinsameer@gmail.com";

  const handleUpdateName = async (nextName: string) => {
    if (!user) return;
    const trimmed = nextName.trim();
    if (!trimmed) {
      Alert.alert("Enter a name", "Display name cannot be empty.");
      return;
    }

    try {
      setIsUpdatingName(true);
      await updateDisplayName({ userId: user._id, displayName: trimmed });
      setDisplayName(trimmed);
    } catch (err) {
      Alert.alert("Update failed", "Could not update your name. Try again.");
    } finally {
      setIsUpdatingName(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="px-5 py-4"
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        <ProfileHeader
          displayName={displayName || user.displayName}
          email={email}
          avatarUrl={user.avatarUrl}
          createdAt={user.createdAt}
          onEditName={handleUpdateName}
          isUpdatingName={isUpdatingName}
        />

        <View className="h-4" />

        <StreakStatsCard
          currentStreak={streakStats?.currentStreak ?? 0}
          longestStreak={streakStats?.longestStreak ?? 0}
          totalCompletedDays={streakStats?.totalCompletedDays ?? 0}
        />

        <View className="h-4" />

        <ReadingCalendar
          completedDates={readingHistory?.completedDates ?? []}
          timezone={user.timezone}
        />

        <View className="h-4" />

        <SettingsSection
          userId={user._id}
          reminderTime={userState?.reminderTime}
          mode={userState?.mode}
        />

        <View className="h-4" />

        <AccountSection
          onSignOut={handleSignOut}
          onDeleteAccount={handleDeleteAccount}
          isDeleting={isDeleting}
        />

        {isDevUser && (
          <>
            <View className="mt-6 mb-3">
              <View className="h-px bg-[#E2E8F0] mb-3" />
              <Text className="text-xs font-semibold tracking-wide text-textSecondary">
                Developer Tools
              </Text>
            </View>

            <View className="bg-yellow-100 p-2 rounded-lg mb-3">
              <Text className="text-yellow-800 text-center text-xs">
                🛠️ Dev Mode Active
              </Text>
            </View>

            {/* TODO: Remove DevPanel before production release. */}
            <DevPanel userId={user._id} embedded />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
