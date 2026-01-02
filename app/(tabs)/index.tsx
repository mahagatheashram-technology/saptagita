import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, View, Text } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function TodayScreen() {
  const verseCount = useQuery(api.verses.getVerseCount);
  const firstVerse = useQuery(api.verses.getVerseByPosition, {
    chapter: 1,
    verse: 1,
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-6 pt-4">
        <Text className="text-3xl font-bold text-secondary mb-2">Sapta Gita</Text>

        <Text className="text-lg text-textPrimary mb-6">
          Total Verses: {verseCount ?? "Loading..."}
        </Text>

        {firstVerse && (
          <View className="bg-surface rounded-2xl p-5 shadow-sm">
            <Text className="text-sm text-textSecondary mb-3">
              Chapter {firstVerse.chapterNumber}, Verse {firstVerse.verseNumber}
            </Text>

            <Text className="text-xl text-secondary mb-4 leading-8">
              {firstVerse.sanskritDevanagari}
            </Text>

            <Text className="text-base italic text-textSecondary mb-4">
              {firstVerse.transliteration}
            </Text>

            <Text className="text-base text-textPrimary leading-6">
              {firstVerse.translationEnglish}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
