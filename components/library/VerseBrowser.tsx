import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import BottomSheet from "@gorhom/bottom-sheet";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ScriptPreference } from "@/lib/verseText";
import {
  GITA_CHAPTERS,
  getChapterMeta,
  getRandomVersePosition,
  getVerseCount,
} from "@/lib/gitaChapters";
import { ReadVerseDetailSheet } from "./ReadVerseDetailSheet";
import { BucketPickerModal } from "@/components/bookmarks";
import { Ionicons } from "@expo/vector-icons";

interface VerseBrowserProps {
  userId: Id<"users">;
  scriptPreference?: ScriptPreference | null;
}

export function VerseBrowser({ userId, scriptPreference }: VerseBrowserProps) {
  const [chapter, setChapter] = useState(1);
  const [verse, setVerse] = useState(1);
  // A new request each time the user taps Read/Lucky; the nonce lets us re-open
  // the sheet for the same verse and ignore stale query results.
  const [pending, setPending] = useState<{
    chapter: number;
    verse: number;
    nonce: number;
  } | null>(null);
  const [showBucketPicker, setShowBucketPicker] = useState(false);

  const sheetRef = useRef<BottomSheet>(null);
  const openedNonceRef = useRef<number | null>(null);

  const verseCount = getVerseCount(chapter);

  // Keep the verse selection valid when switching to a shorter chapter.
  useEffect(() => {
    if (verse > verseCount) setVerse(1);
  }, [chapter, verseCount, verse]);

  const loadedVerse = useQuery(
    api.verses.getVerseByPosition,
    pending ? { chapter: pending.chapter, verse: pending.verse } : "skip"
  );

  const buckets = useQuery(api.bookmarks.getUserBuckets, { userId });
  const defaultBucketId =
    buckets?.find((bucket) => bucket.isDefault)?._id ?? null;
  const verseBuckets = useQuery(
    api.bookmarks.getVerseBuckets,
    loadedVerse?._id ? { userId, verseId: loadedVerse._id } : "skip"
  );
  const isSavedToDefault = Boolean(
    defaultBucketId &&
      verseBuckets?.some((id) => String(id) === String(defaultBucketId))
  );

  const quickBookmark = useMutation(api.bookmarks.quickBookmark);

  // Open the sheet once the requested verse has loaded.
  useEffect(() => {
    if (!pending) return;
    if (loadedVerse === undefined) return; // still loading
    if (loadedVerse === null) {
      Alert.alert("Not found", "Could not find that verse.");
      setPending(null);
      return;
    }
    if (
      loadedVerse.chapterNumber !== pending.chapter ||
      loadedVerse.verseNumber !== pending.verse
    ) {
      return; // stale result from a previous request
    }
    if (openedNonceRef.current === pending.nonce) return;
    openedNonceRef.current = pending.nonce;
    requestAnimationFrame(() => sheetRef.current?.snapToIndex(0));
  }, [pending, loadedVerse]);

  const openVerse = (c: number, v: number) => {
    setPending({ chapter: c, verse: v, nonce: Date.now() });
  };

  const handleRead = () => openVerse(chapter, verse);

  const handleLucky = () => {
    const pos = getRandomVersePosition();
    setChapter(pos.chapter);
    setVerse(pos.verse);
    openVerse(pos.chapter, pos.verse);
  };

  const handleAddToBucket = () => {
    sheetRef.current?.close();
    setShowBucketPicker(true);
  };

  const handleQuickBookmark = async () => {
    if (!loadedVerse?._id) return;
    try {
      const result = await quickBookmark({ userId, verseId: loadedVerse._id });
      if (result?.removed) {
        Alert.alert("Removed", "Removed from Default.");
      } else if (result?.added) {
        Alert.alert("Saved", "Saved to Default.");
      }
    } catch (error: any) {
      Alert.alert("Could not bookmark", String(error?.message ?? error));
    }
  };

  const chapterTitle = useMemo(
    () => getChapterMeta(chapter)?.title ?? "",
    [chapter]
  );
  const verseNumbers = useMemo(
    () => Array.from({ length: verseCount }, (_, i) => i + 1),
    [verseCount]
  );

  const isLoadingVerse =
    pending !== null &&
    loadedVerse === undefined &&
    openedNonceRef.current !== pending.nonce;

  return (
    <View className="flex-1 px-5 pt-2">
      <View className="bg-surface rounded-2xl p-4 shadow-sm">
        <Text className="text-base font-semibold text-secondary mb-1">
          Jump to a verse
        </Text>
        <Text className="text-sm text-textSecondary mb-4">
          Pick a chapter and verse, or let fate decide.
        </Text>

        {/* Chapter selector */}
        <Text className="text-xs font-medium text-textSecondary mb-2 uppercase tracking-wide">
          Chapter
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 4, paddingBottom: 2 }}
        >
          {GITA_CHAPTERS.map((c) => {
            const selected = c.chapter === chapter;
            return (
              <Pressable
                key={c.chapter}
                onPress={() => setChapter(c.chapter)}
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  selected ? "bg-primary" : "bg-gray-100"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    selected ? "text-white" : "text-textSecondary"
                  }`}
                >
                  {c.chapter}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Text className="text-sm text-textPrimary mt-2 mb-4" numberOfLines={1}>
          {chapter}. {chapterTitle}
        </Text>

        {/* Verse selector */}
        <Text className="text-xs font-medium text-textSecondary mb-2 uppercase tracking-wide">
          Verse
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 4, paddingBottom: 2 }}
        >
          {verseNumbers.map((v) => {
            const selected = v === verse;
            return (
              <Pressable
                key={v}
                onPress={() => setVerse(v)}
                className={`min-w-10 h-10 px-2 rounded-full items-center justify-center ${
                  selected ? "bg-primary" : "bg-gray-100"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    selected ? "text-white" : "text-textSecondary"
                  }`}
                >
                  {v}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Actions */}
        <Pressable
          onPress={handleRead}
          disabled={isLoadingVerse}
          className="mt-5 flex-row items-center justify-center px-4 py-3 rounded-xl bg-primary active:opacity-80"
          style={{ opacity: isLoadingVerse ? 0.6 : 1 }}
        >
          <Ionicons name="book-outline" size={18} color="#FFFFFF" />
          <Text className="text-white font-semibold text-base ml-2">
            Read {chapter}.{verse}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleLucky}
          disabled={isLoadingVerse}
          className="mt-3 flex-row items-center justify-center px-4 py-3 rounded-xl border border-primary active:opacity-70"
          style={{ opacity: isLoadingVerse ? 0.6 : 1 }}
        >
          <Ionicons name="dice-outline" size={18} color="#FF6B35" />
          <Text className="text-primary font-semibold text-base ml-2">
            I&apos;m Feeling Lucky
          </Text>
        </Pressable>
      </View>

      <ReadVerseDetailSheet
        ref={sheetRef}
        verse={loadedVerse ?? null}
        isSavedToDefault={isSavedToDefault}
        onAddToBucket={handleAddToBucket}
        onQuickBookmark={handleQuickBookmark}
        scriptPreference={scriptPreference}
      />

      <BucketPickerModal
        visible={showBucketPicker}
        onClose={() => setShowBucketPicker(false)}
        userId={userId}
        verseId={loadedVerse?._id ?? null}
        onMoved={() => setShowBucketPicker(false)}
      />
    </View>
  );
}
