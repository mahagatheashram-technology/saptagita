import { Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export const BUCKET_ICONS = [
  "📁",
  "⭐️",
  "📚",
  "🙏",
  "❤️",
  "✨",
  "🧘‍♂️",
  "📝",
  "🌱",
  "🎯",
] as const;

interface EmojiPickerProps {
  selected: string;
  onSelect: (emoji: string) => void;
}

// Horizontal icon strip. The row previously ran flush into the card edge with
// no affordance, so it read as clipped rather than scrollable. A fade on the
// trailing edge plus extra scroll padding makes the overflow legible.
export function EmojiPicker({ selected, onSelect }: EmojiPickerProps) {
  return (
    <View className="relative">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingVertical: 4,
          gap: 8,
          paddingRight: 28,
        }}
      >
        {BUCKET_ICONS.map((emoji) => (
          <Pressable
            key={emoji}
            onPress={() => onSelect(emoji)}
            accessibilityRole="button"
            accessibilityState={{ selected: selected === emoji }}
            className={`px-3 py-2 rounded-full ${
              selected === emoji ? "bg-primary/10" : "bg-sand-50"
            }`}
          >
            <Text className="text-lg">{emoji}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <LinearGradient
        pointerEvents="none"
        colors={["rgba(255,255,255,0)", "#FFFFFF"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: 28,
        }}
      />
    </View>
  );
}
