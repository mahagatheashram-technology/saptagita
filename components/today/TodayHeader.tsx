import { View, Text, Pressable, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScriptPreference } from "@/lib/verseText";

interface TodayHeaderProps {
  frontier: number; // verses read so far (first unread index)
  viewIndex: number; // verse currently on screen
  totalVerses: number;
  streak?: number;
  scriptPreference?: ScriptPreference | null;
  onSeek?: (index: number) => void;
  onScriptChange?: (next: ScriptPreference) => void;
}

const SCRIPT_OPTIONS: { value: ScriptPreference; label: string }[] = [
  { value: "devanagari", label: "अ" },
  { value: "telugu", label: "తె" },
];

export function TodayHeader({
  frontier,
  viewIndex,
  totalVerses,
  streak = 0,
  scriptPreference = "devanagari",
  onSeek,
  onScriptChange,
}: TodayHeaderProps) {
  const { height, fontScale } = useWindowDimensions();
  const isReviewing = viewIndex < frontier;
  const activeScript = scriptPreference ?? "devanagari";
  const compact = height < 700 || fontScale > 1.2;

  return (
    <View
      className="px-5 pt-1"
      style={{ paddingBottom: compact ? 8 : 16 }}
    >
      {/* Top row: Title + script toggle + streak */}
      <View
        className="flex-row justify-between items-center"
        style={{ marginBottom: compact ? 6 : 12 }}
      >
        <View className="flex-1">
          <Text
            className="text-2xl font-bold text-secondary"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            Today's Reading
          </Text>
          <Text className="text-[10px] text-textSecondary/50 tracking-[0.5px] mt-0.5">
            Mahagathe Foundation
          </Text>
        </View>

        <View className="flex-row items-center">
          {/* Script toggle (global preference) */}
          <View className="flex-row bg-sand-50 rounded-full p-0.5 mr-2">
            {SCRIPT_OPTIONS.map((opt) => {
              const selected = activeScript === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => onScriptChange?.(opt.value)}
                  accessibilityRole="button"
                  accessibilityLabel={`Show ${opt.value} script`}
                  className={`px-2.5 py-1 rounded-full ${
                    selected ? "bg-primary" : ""
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      selected ? "text-white" : "text-textSecondary"
                    }`}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Streak */}
          <View className="flex-row items-center bg-orange-50 px-3 py-1.5 rounded-full">
            <Ionicons name="flame" size={18} color="#FF6B35" />
            <Text className="text-primary font-semibold ml-1">{streak}</Text>
          </View>
        </View>
      </View>

      {/* Progress label */}
      <Text
        className="text-textSecondary"
        style={{ marginBottom: compact ? 4 : 8 }}
        numberOfLines={2}
      >
        {isReviewing
          ? `Reviewing verse ${viewIndex + 1} of ${totalVerses}`
          : `${frontier} of ${totalVerses} verses read`}
      </Text>

      {/* Tappable progress dots */}
      <View className="flex-row items-center">
        {Array.from({ length: totalVerses }).map((_, i) => {
          const isRead = i < frontier;
          const isCurrentFrontier = i === frontier;
          const isViewed = i === viewIndex;
          const isLocked = i > frontier;

          const dotColor = isRead
            ? "#1F9D55"
            : isCurrentFrontier
            ? "#FF6B35"
            : "#D7D2C4";

          return (
            <Pressable
              key={i}
              onPress={() => !isLocked && onSeek?.(i)}
              disabled={isLocked}
              hitSlop={6}
              className="px-1 py-1"
            >
              <View
                style={{
                  width: isViewed ? 14 : 10,
                  height: isViewed ? 14 : 10,
                  borderRadius: 999,
                  backgroundColor:
                    isCurrentFrontier && !isViewed ? "#fff" : dotColor,
                  borderWidth: isViewed ? 2 : isCurrentFrontier ? 2 : 0,
                  borderColor: isViewed
                    ? "#1A365D"
                    : isCurrentFrontier
                    ? "#FF6B35"
                    : "transparent",
                }}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
