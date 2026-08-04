import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { FoundationFooter } from "@/components/common";
import { useAuth, useSession } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import {
  AboutSection,
  AccountSection,
  ProfileHeader,
  ReadingCalendar,
  SettingsSection,
  StreakStatsCard,
} from "@/components/profile";
import { api } from "@/convex/_generated/api";
import {
  AccountDeletionCheckpoint,
  AccountDeletionResult,
  EMPTY_DELETION_CHECKPOINT,
  runAccountDeletion,
} from "@/lib/accountDeletion";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { clearUserSyncCache } from "@/lib/userSyncCoordinator";

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { session } = useSession();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionCheckpoint, setDeletionCheckpoint] =
    useState<AccountDeletionCheckpoint>(EMPTY_DELETION_CHECKPOINT);
  const { user, isLoading, error, clerkUser, retrySync } = useCurrentUser({
    suspendSync: isDeleting || deletionCheckpoint.appDataDeleted,
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

  // "Perfect" is an all-time achievement count, deliberately NOT scoped to the
  // 12 weeks the calendar paints. It previously used the calendar window so the
  // two would agree; the card now carries an "All-time" tag instead, so the
  // difference is explicit rather than hidden.
  const perfectDays = streakStats?.perfectDays ?? 0;

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user?.displayName]);

  const handleSignOut = async () => {
    try {
      await signOut();
      clearUserSyncCache();
    } catch (signOutError) {
      console.error("Sign out failed", signOutError);
      Alert.alert(
        "Sign out failed",
        "We couldn't finish signing out. Check your connection and retry.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Retry", onPress: handleSignOut },
        ]
      );
    }
  };

  const performAccountDeletion = async (
    checkpoint: AccountDeletionCheckpoint
  ) => {
    if (!clerkUser) return;

    setIsDeleting(true);
    const result: AccountDeletionResult = await runAccountDeletion(
      {
        canDeleteClerkIdentity: clerkUser.deleteSelfEnabled,
        requiresRecentSignIn:
          typeof session?.factorVerificationAge?.[0] === "number" &&
          session.factorVerificationAge[0] >= 10,
        deleteAppData: async () => {
          const deletion = await deleteAccount({});
          clearUserSyncCache();
          return deletion;
        },
        deleteClerkIdentity: () => clerkUser.delete(),
        signOut: async () => {
          await signOut();
          clearUserSyncCache();
        },
      },
      checkpoint
    );
    setDeletionCheckpoint(result.checkpoint);
    setIsDeleting(false);

    if (!result.ok) {
      console.error("Delete account failed", {
        phase: result.phase,
        cause: result.cause,
      });
      Alert.alert(
        result.phase === "configuration"
          ? "Deletion unavailable"
          : "Deletion needs attention",
        result.message,
        [
          { text: "Close", style: "cancel" },
          ...(result.phase === "configuration"
            ? []
            : result.requiresSignInAgain
              ? [
                  {
                    text: "Sign out",
                    onPress: handleSignOut,
                  },
                ]
            : [
                {
                  text: "Retry",
                  onPress: () => performAccountDeletion(result.checkpoint),
                },
              ]),
        ]
      );
      return;
    }

    Alert.alert("Account deleted", "Your account and app data were deleted.");
  };

  const handleDeleteAccount = () => {
    if (!user || !clerkUser) return;

    Alert.alert(
      "Delete account?",
      "This will permanently delete your reading history, streaks, bookmarks, communities, and sign-in identity.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => performAccountDeletion(deletionCheckpoint),
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
          onPress={retrySync}
          className="bg-primary rounded-xl py-3 px-4"
        >
          <Text className="text-white font-semibold">Retry account sync</Text>
        </Pressable>
        <Pressable onPress={handleSignOut} className="py-3 px-4 mt-2">
          <Text className="text-primary font-semibold">Sign out</Text>
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
        {/* Brand bar sits above the profile card by design — the foundation
            attribution should be the first thing seen on this screen. */}
        <FoundationFooter variant="top" className="mb-2" />

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
          perfectDays={perfectDays}
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
          discoverable={user.discoverable}
        />

        <View className="h-4" />

        <AccountSection
          onSignOut={handleSignOut}
          onDeleteAccount={handleDeleteAccount}
          isDeleting={isDeleting}
        />

        <View className="h-4" />

        <AboutSection />

      </ScrollView>
    </SafeAreaView>
  );
}
