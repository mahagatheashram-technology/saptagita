import { View, Text, ActivityIndicator, Pressable, Platform } from "react-native";
import { Alert } from "@/lib/alert";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CardStack } from "@/components/verses/CardStack";
import {
  TodayHeader,
  TodayNav,
  SaveSnackbar,
  GestureCoachOverlay,
  CompletionScreen,
} from "@/components/today";
import { useTodayReading } from "@/lib/hooks/useTodayReading";
import { impact } from "@/lib/haptics";
import { Id } from "@/convex/_generated/dataModel";
import { BucketPickerModal } from "@/components/bookmarks";
import { FoundationFooter } from "@/components/common";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useAuth } from "@clerk/clerk-expo";
import { clearBadge } from "@/lib/notifications";
import { formatVerseShareMessage, shareText } from "@/lib/shareText";
import {
  hasSeenTodayGestureCoach,
  markTodayGestureCoachSeenLocally,
} from "@/lib/gestureCoach";
import { ScriptPreference } from "@/lib/verseText";

const DAILY_VERSE_COUNT = 7;

export default function TodayScreen() {
  const isWeb = Platform.OS === "web";
  const [viewIndex, setViewIndex] = useState(0);
  const [showBucketPicker, setShowBucketPicker] = useState(false);
  const [showGestureCoach, setShowGestureCoach] = useState(false);
  const [gestureCoachResolved, setGestureCoachResolved] = useState(Platform.OS === "web");
  const [microDemoNonce, setMicroDemoNonce] = useState(0);
  const [snackbar, setSnackbar] = useState<{ visible: boolean; removed: boolean }>({
    visible: false,
    removed: false,
  });
  const snackbarTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { user: currentUser, isLoading: isUserLoading, error: userError } = useCurrentUser();
  const userId = currentUser?._id ?? null;
  const { signOut } = useAuth();
  const userState = useQuery(
    api.users.getUserState,
    userId ? { userId } : "skip"
  );

  const {
    verses,
    currentIndex,
    isComplete,
    isLoading,
    handleSwipeRight: markAsRead,
    currentStreak,
    longestStreak,
    isNewRecord,
  } = useTodayReading(userId);

  const frontier = currentIndex; // first unread verse
  const viewedVerse = verses[viewIndex] ?? null;
  const isReviewing = viewIndex < frontier;

  const viewedVerseBuckets = useQuery(
    api.bookmarks.getVerseBuckets,
    userId && viewedVerse
      ? { userId, verseId: viewedVerse._id as Id<"verses"> }
      : "skip"
  );
  // "Saved" means saved to ANY collection, not just Default. The bucket picker
  // uses moveBookmark, so filing a verse into another collection removes it
  // from Default — checking Default alone made the icon go hollow on a verse
  // the reader had just deliberately filed away.
  const isViewedSaved = (viewedVerseBuckets?.length ?? 0) > 0;

  const ensureDefaultBucket = useMutation(api.bookmarks.ensureDefaultBucket);
  const quickBookmark = useMutation(api.bookmarks.quickBookmark);
  const markGestureCoachSeen = useMutation(api.users.markTodayGestureCoachSeen);
  const updateScriptPreference = useMutation(api.users.updateScriptPreference);
  const checkStreak = useMutation(api.streaks.checkAndUpdateStreak);

  useEffect(() => {
    clearBadge().catch(console.error);
  }, []);

  useEffect(() => {
    if (userId) {
      checkStreak({ userId }).catch(console.error);
    }
  }, [userId, checkStreak]);

  useEffect(() => {
    if (userId) {
      ensureDefaultBucket({ userId }).catch(console.error);
    }
  }, [userId, ensureDefaultBucket]);

  // Follow the reading frontier forward: after marking a verse read (or on
  // first load), move the view to the current verse. Reviewing earlier verses
  // doesn't change the frontier, so the view stays put while you browse back.
  useEffect(() => {
    setViewIndex(currentIndex);
  }, [currentIndex]);

  useEffect(
    () => () => {
      if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    },
    []
  );

  const showSnackbar = useCallback((removed: boolean) => {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    setSnackbar({ visible: true, removed });
    snackbarTimer.current = setTimeout(() => {
      setSnackbar((s) => ({ ...s, visible: false }));
    }, 3200);
  }, []);

  const handleMarkRead = useCallback(async () => {
    impact();
    await markAsRead();
  }, [markAsRead]);

  const goNext = useCallback(() => {
    if (viewIndex < frontier) {
      impact();
      setViewIndex((v) => Math.min(frontier, v + 1));
    } else {
      // On the live verse: marking it read advances the frontier (and view).
      handleMarkRead();
    }
  }, [viewIndex, frontier, handleMarkRead]);

  const goPrev = useCallback(() => {
    if (viewIndex <= 0) return;
    impact();
    setViewIndex((v) => Math.max(0, v - 1));
  }, [viewIndex]);

  const seek = useCallback(
    (i: number) => {
      const target = Math.max(0, Math.min(frontier, i));
      if (target === viewIndex) return;
      impact();
      setViewIndex(target);
    },
    [frontier, viewIndex]
  );

  const handleSave = useCallback(async () => {
    if (!userId || !viewedVerse) return;
    try {
      const result = await quickBookmark({
        userId,
        verseId: viewedVerse._id as Id<"verses">,
      });
      impact();
      showSnackbar(Boolean(result?.removed));
    } catch (error: any) {
      Alert.alert("Could not bookmark", String(error?.message ?? error));
    }
  }, [userId, viewedVerse, quickBookmark, showSnackbar]);

  const handleShare = useCallback(async () => {
    if (!viewedVerse) return;
    const message = formatVerseShareMessage(
      viewedVerse,
      (userState?.scriptPreference as ScriptPreference | undefined) ?? "devanagari"
    );
    await shareText(message);
  }, [viewedVerse, userState?.scriptPreference]);

  const handleMoveToCollection = useCallback(() => {
    setSnackbar((s) => ({ ...s, visible: false }));
    setShowBucketPicker(true);
  }, []);

  const handleScriptPreferenceChange = useCallback(
    async (nextPreference: ScriptPreference) => {
      if (!userId) return;
      if ((userState?.scriptPreference ?? "devanagari") === nextPreference) return;
      await updateScriptPreference({ userId, scriptPreference: nextPreference });
    },
    [updateScriptPreference, userId, userState?.scriptPreference]
  );

  useEffect(() => {
    let cancelled = false;

    if (isWeb) {
      setShowGestureCoach(false);
      setGestureCoachResolved(true);
      return () => {
        cancelled = true;
      };
    }

    if (!userId) {
      setShowGestureCoach(false);
      setGestureCoachResolved(false);
      return () => {
        cancelled = true;
      };
    }

    const syncGestureCoachState = async () => {
      const hasSeenLocally = await hasSeenTodayGestureCoach(userId);
      if (cancelled) return;

      if (hasSeenLocally) {
        setShowGestureCoach(false);
        setGestureCoachResolved(true);

        if (userState && !userState.todayGestureCoachSeenAt) {
          markGestureCoachSeen({ userId }).catch((error) => {
            console.error("Failed to backfill gesture coach state", error);
          });
        }
        return;
      }

      if (userState === undefined) {
        return;
      }

      if (userState?.todayGestureCoachSeenAt) {
        await markTodayGestureCoachSeenLocally(userId);
        if (cancelled) return;
        setShowGestureCoach(false);
      } else {
        setShowGestureCoach(true);
      }

      setGestureCoachResolved(true);
    };

    syncGestureCoachState();

    return () => {
      cancelled = true;
    };
  }, [isWeb, markGestureCoachSeen, userId, userState]);

  const handleDismissGestureCoach = useCallback(async () => {
    setShowGestureCoach(false);
    setGestureCoachResolved(true);
    setMicroDemoNonce((value) => value + 1);
    if (!userId) return;

    await markTodayGestureCoachSeenLocally(userId);

    try {
      await markGestureCoachSeen({ userId });
    } catch (error) {
      console.error("Failed to persist gesture coach state", error);
    }
  }, [markGestureCoachSeen, userId]);

  // Error state
  if (userError) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-base font-semibold text-textPrimary mb-2">
          Account sync failed
        </Text>
        <Text className="text-sm text-textSecondary text-center mb-4">
          {String(userError?.message ?? userError)}
        </Text>
        <Pressable
          onPress={async () => signOut?.()}
          className="bg-primary rounded-xl py-3 px-4"
        >
          <Text className="text-white font-semibold">Sign out</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // Loading state
  if (isLoading || isUserLoading || !userId) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text className="text-textSecondary mt-4">Loading today's verses...</Text>
      </SafeAreaView>
    );
  }

  // Completion state
  if (isComplete || currentIndex >= DAILY_VERSE_COUNT) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <CompletionScreen
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          isNewRecord={isNewRecord}
        />
      </SafeAreaView>
    );
  }

  // No verses loaded yet
  if (verses.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text className="text-textSecondary mt-4">Preparing your verses...</Text>
      </SafeAreaView>
    );
  }

  const interactionsEnabled = gestureCoachResolved && !showGestureCoach;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <TodayHeader
        frontier={frontier}
        viewIndex={viewIndex}
        totalVerses={DAILY_VERSE_COUNT}
        streak={currentStreak}
        scriptPreference={userState?.scriptPreference}
        onSeek={seek}
        onScriptChange={handleScriptPreferenceChange}
      />

      <View
        className="flex-1 px-5"
        style={[
          { minHeight: 0 },
          isWeb ? { paddingBottom: 96 } : undefined,
        ]}
      >
        <CardStack
          verses={verses}
          viewIndex={viewIndex}
          frontier={frontier}
          isSaved={isViewedSaved}
          onPrev={goPrev}
          onNext={goNext}
          onSave={handleSave}
          onShare={handleShare}
          interactionsEnabled={interactionsEnabled}
          microDemoNonce={microDemoNonce}
          scriptPreference={userState?.scriptPreference}
        />
      </View>

      {!isWeb && (
        <TodayNav
          canPrev={viewIndex > 0}
          isReviewing={isReviewing}
          onPrev={goPrev}
          onNext={goNext}
          disabled={!interactionsEnabled}
        />
      )}

      <FoundationFooter className="pt-0 pb-1" />

      <SaveSnackbar
        visible={snackbar.visible}
        removed={snackbar.removed}
        onMoveToCollection={handleMoveToCollection}
      />

      <BucketPickerModal
        visible={showBucketPicker}
        onClose={() => setShowBucketPicker(false)}
        userId={userId}
        verseId={viewedVerse ? (viewedVerse._id as Id<"verses">) : null}
        key={viewedVerse?._id ?? "bucket-picker"}
      />

      {!isWeb && (
        <GestureCoachOverlay
          visible={showGestureCoach}
          onDismiss={handleDismissGestureCoach}
        />
      )}
    </SafeAreaView>
  );
}
