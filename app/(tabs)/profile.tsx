import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, Pressable, ScrollView, Alert, Image } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { DevPanel } from "@/components/dev/DevPanel";
import {
  AboutSection,
  AccountSection,
  ProfileHeader,
  ReadingCalendar,
  SettingsSection,
  StreakStatsCard,
} from "@/components/profile";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

function getErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const { user, isLoading, error, clerkUser } = useCurrentUser({
    suspendSync: isDeleting,
  });
  const [displayName, setDisplayName] = useState<string>("");
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  const streakStats = useQuery(
    api.streaks.getStreakStats,
    !isDeleting && user ? { userId: user._id } : "skip"
  );
  const readingHistory = useQuery(
    api.dailySets.getReadingHistory,
    !isDeleting && user ? { userId: user._id, days: 90 } : "skip"
  );
  const userState = useQuery(
    api.users.getUserState,
    !isDeleting && user ? { userId: user._id } : "skip"
  );
  const deleteAccount = useMutation(api.users.deleteAccount);
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
            let clerkDeleteError: unknown = null;
            let signOutError: unknown = null;
            try {
              await deleteAccount({});

              if (clerkUser?.delete) {
                try {
                  await clerkUser.delete();
                } catch (error) {
                  clerkDeleteError = error;
                  console.error("Clerk account delete failed", error);
                }
              } else {
                clerkDeleteError = new Error(
                  "Auth account deletion is unavailable on this client."
                );
              }

              try {
                await signOut?.();
              } catch (error) {
                signOutError = error;
                console.error("Sign out after delete failed", error);
              }

              if (clerkDeleteError) {
                const message = signOutError
                  ? "Your app data was deleted, but we couldn't delete your authentication account and couldn't sign you out automatically."
                  : "Your app data was deleted, but we couldn't delete your authentication account automatically. Please sign in again and retry account deletion, or contact support.";
                Alert.alert("Account partially deleted", message);
              } else if (signOutError) {
                Alert.alert(
                  "Account deleted",
                  "Your account data was deleted, but automatic sign out failed. Please restart the app."
                );
              } else {
                Alert.alert("Account deleted", "Your account and app data were deleted.");
              }
            } catch (deleteError) {
              console.error("Delete account failed", deleteError);
              Alert.alert(
                "Delete failed",
                getErrorMessage(
                  deleteError,
                  "We couldn't delete your account data. Please try again."
                )
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
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Compact foundation brand bar */}
        <View className="flex-row items-center justify-center py-2 mb-2">
          <Image
            source={require("@/assets/images/mahagathe-foundation-logo.png")}
            style={{ width: 20, height: 20, marginRight: 6 }}
            resizeMode="contain"
          />
          <Text className="text-[11px] text-textSecondary/50 tracking-[0.5px]">
            A Mahagathe Foundation Initiative
          </Text>
        </View>

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
          perfectDays={streakStats?.perfectDays ?? 0}
        />

        <View className="h-4" />

        <ReadingCalendar
          readDates={readingHistory?.readDates ?? []}
          perfectDates={readingHistory?.perfectDates ?? []}
          timezone={user.timezone}
        />

        <View className="h-4" />

        <SettingsSection
          userId={user._id}
          reminderTime={userState?.reminderTime}
          scriptPreference={userState?.scriptPreference}
        />

        <View className="h-4" />

        <AccountSection
          onSignOut={handleSignOut}
          onDeleteAccount={handleDeleteAccount}
          isDeleting={isDeleting}
        />

        <View className="h-4" />

        <AboutSection />

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
