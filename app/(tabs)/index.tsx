import { View, Text, ActivityIndicator, Alert, Pressable, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CardStack } from "@/components/verses/CardStack";
import {
  TodayHeader,
  SwipeHint,
  GestureCoachOverlay,
  CompletionScreen,
} from "@/components/today";
import { useTodayReading } from "@/lib/hooks/useTodayReading";
import { impact } from "@/lib/haptics";
import { Id } from "@/convex/_generated/dataModel";
import BottomSheet from "@gorhom/bottom-sheet";
import { ActionDrawer } from "@/components/verses/ActionDrawer";
import { BucketPickerModal } from "@/components/bookmarks";
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
  const [activeVerse, setActiveVerse] = useState<{
    id: string;
    chapter: number;
    verse: number;
  } | null>(null);
  const [showBucketPicker, setShowBucketPicker] = useState(false);
  const [showGestureCoach, setShowGestureCoach] = useState(false);
  const [gestureCoachResolved, setGestureCoachResolved] = useState(Platform.OS === "web");
  const [microDemoNonce, setMicroDemoNonce] = useState(0);

  const actionDrawerRef = useRef<BottomSheet>(null);
  const { user: currentUser, isLoading: isUserLoading, error: userError } = useCurrentUser();
  const userId = currentUser?._id ?? null;
  const { signOut } = useAuth();
  const userState = useQuery(
    api.users.getUserState,
    userId ? { userId } : "skip"
  );
  const buckets = useQuery(
    api.bookmarks.getUserBuckets,
    userId ? { userId } : "skip"
  );
  const activeVerseBuckets = useQuery(
    api.bookmarks.getVerseBuckets,
    userId && activeVerse?.id
      ? { userId, verseId: activeVerse.id as Id<"verses"> }
      : "skip"
  );

  const {
    verses,
    currentIndex,
    isComplete,
    isLoading,
    handleSwipeRight: markAsRead,
    dailySetId,
    currentStreak,
    longestStreak,
    isNewRecord,
  } = useTodayReading(userId);

  const ensureDefaultBucket = useMutation(api.bookmarks.ensureDefaultBucket);
  const quickBookmark = useMutation(api.bookmarks.quickBookmark);
  const markGestureCoachSeen = useMutation(api.users.markTodayGestureCoachSeen);
  const updateScriptPreference = useMutation(api.users.updateScriptPreference);
  
  // Check and update streak on app open
  const checkStreak = useMutation(api.streaks.checkAndUpdateStreak);

  useEffect(() => {
    clearBadge().catch(console.error);
  }, []);
  
  useEffect(() => {
    if (userId) {
      checkStreak({ userId }).catch(console.error);
    }
  }, [userId, checkStreak]);

  const handleSwipeRight = useCallback(async () => {
    impact();
    await markAsRead();
  }, [markAsRead]);

  const handleSwipeLeft = useCallback(() => {
    if (!verses || verses.length === 0) return;

    const currentVerse = verses[currentIndex];
    if (!currentVerse) return;

    setActiveVerse({
      id: currentVerse._id,
      chapter: currentVerse.chapterNumber,
      verse: currentVerse.verseNumber,
    });

    impact();
    actionDrawerRef.current?.snapToIndex(0);
  }, [verses, currentIndex]);

  useEffect(() => {
    if (userId) {
      ensureDefaultBucket({ userId }).catch(console.error);
    }
  }, [userId, ensureDefaultBucket]);

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

  const handleBookmark = useCallback(async () => {
    if (!userId || !activeVerse) return;
    const verseId = activeVerse.id as Id<"verses">;
    try {
      const result = await quickBookmark({ userId, verseId });
      impact();
      if (result?.removed) {
        Alert.alert("Removed", "Verse removed from Saved.");
      } else {
        Alert.alert("Saved", "Verse added to Saved.");
      }
    } catch (error: any) {
      Alert.alert("Could not bookmark", String(error?.message ?? error));
    }
  }, [activeVerse, quickBookmark, userId]);

  const handleAddToBucket = useCallback(() => {
    if (!userId || !activeVerse) return;
    setShowBucketPicker(true);
  }, [activeVerse, userId]);

  const handleShare = useCallback(async () => {
    if (!activeVerse || !verses) return;

    const verse = verses.find((v) => v._id === activeVerse.id);
    if (!verse) return;

    const message = formatVerseShareMessage(
      verse,
      (userState?.scriptPreference as ScriptPreference | undefined) ?? "devanagari"
    );
    await shareText(message);
  }, [activeVerse, userState?.scriptPreference, verses]);

  const handleCloseDrawer = useCallback(() => {
    if (!isWeb) {
      actionDrawerRef.current?.close();
    }
    if (!showBucketPicker) {
      setActiveVerse(null);
    }
  }, [isWeb, showBucketPicker]);

  const handleCloseBucketPicker = useCallback(() => {
    setShowBucketPicker(false);
    if (!isWeb) {
      actionDrawerRef.current?.close();
    }
    setActiveVerse(null);
  }, [isWeb]);

  const handleScriptPreferenceChange = useCallback(
    async (nextPreference: ScriptPreference) => {
      if (!userId) return;
      if ((userState?.scriptPreference ?? "devanagari") === nextPreference) return;
      await updateScriptPreference({ userId, scriptPreference: nextPreference });
    },
    [updateScriptPreference, userId, userState?.scriptPreference]
  );

  const defaultBucketId = buckets?.find((bucket) => bucket.isDefault)?._id ?? null;
  const isSavedToDefault = Boolean(
    defaultBucketId &&
      activeVerseBuckets?.some(
        (bucketId) => String(bucketId) === String(defaultBucketId)
      )
  );

  // Loading state
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

  return (
    <SafeAreaView className="flex-1 bg-background">
      <TodayHeader
        currentIndex={currentIndex}
        totalVerses={DAILY_VERSE_COUNT}
        streak={currentStreak}
      />

      <View className="flex-1 px-5" style={isWeb ? { paddingBottom: 96 } : undefined}>
        <CardStack
          verses={verses}
          currentIndex={currentIndex}
          onSwipeRight={handleSwipeRight}
          onSwipeLeft={handleSwipeLeft}
          interactionsEnabled={gestureCoachResolved && !showGestureCoach}
          microDemoNonce={microDemoNonce}
          scriptPreference={userState?.scriptPreference}
        />
      </View>

      {!isWeb && (
        <SwipeHint
          onMoreOptions={handleSwipeLeft}
          onMarkRead={handleSwipeRight}
          disabled={!gestureCoachResolved || showGestureCoach}
        />
      )}

      <ActionDrawer
        ref={actionDrawerRef}
        verseId={activeVerse?.id ?? ""}
        chapterNumber={activeVerse?.chapter ?? 0}
        verseNumber={activeVerse?.verse ?? 0}
        isSavedToDefault={isSavedToDefault}
        scriptPreference={userState?.scriptPreference}
        onBookmark={handleBookmark}
        onAddToBucket={handleAddToBucket}
        onShare={handleShare}
        onScriptPreferenceChange={handleScriptPreferenceChange}
        onClose={handleCloseDrawer}
      />

      <BucketPickerModal
        visible={showBucketPicker}
        onClose={handleCloseBucketPicker}
        userId={userId}
        verseId={activeVerse ? (activeVerse.id as Id<"verses">) : null}
        key={activeVerse?.id ?? "bucket-picker"}
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
