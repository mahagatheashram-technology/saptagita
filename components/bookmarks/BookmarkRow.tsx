import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Verse } from "../verses/VerseCard";
import { getDisplayVerseText, ScriptPreference } from "@/lib/verseText";
import { getVerseTextStyle, translationTextStyle } from "@/lib/textStyles";

interface BookmarkRowProps {
  verse: Verse;
  onPress?: () => void;
  scriptPreference?: ScriptPreference | null;
}

export function BookmarkRow({
  verse,
  onPress,
  scriptPreference,
}: BookmarkRowProps) {
  const truncate = (value: string, max: number) => {
    if (!value) return "";
    return value.length > max ? `${value.slice(0, max).trim()}…` : value;
  };
  const verseText = getDisplayVerseText(verse, scriptPreference);

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-xl px-4 py-3 mb-3 flex-row items-start justify-between shadow-sm"
      style={{ elevation: 1 }}
    >
      <View className="flex-1 pr-3">
        <Text className="text-xs text-textSecondary mb-1">
          Chapter {verse.chapterNumber} • Verse {verse.verseNumber}
        </Text>
        <Text
          className="text-base text-secondary mb-1"
          numberOfLines={2}
          style={getVerseTextStyle(scriptPreference)}
        >
          {truncate(verseText, 80)}
        </Text>
        <Text
          className="text-sm text-textSecondary"
          numberOfLines={2}
          style={translationTextStyle}
        >
          {truncate(verse.translationEnglish, 120)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#A0AEC0" />
    </Pressable>
  );
}
