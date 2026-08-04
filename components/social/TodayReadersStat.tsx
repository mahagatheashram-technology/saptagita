import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Text, View } from "react-native";
import { type } from "@/lib/typography";

// This banner used to carry its own gold family (#D4AF37 / #FFF9E8 / #7A5A00),
// which existed nowhere else and put a fifth colour into the Social viewport.
// It now sits on the app's `accent` with the warm ramp, so it still reads as a
// highlight without introducing a palette of its own.
export function TodayReadersStat({ count }: { count: number | null }) {
  const label = count === 1 ? "person read today" : "people read today";

  return (
    <View
      className="mx-5 mt-2 mb-1 rounded-2xl border border-accent/40 bg-accent/10 px-3 py-2.5 flex-row items-center"
      accessibilityLabel={
        count === null ? "Loading today's readers" : `${count} ${label}`
      }
    >
      <View className="h-8 w-8 rounded-full bg-accent items-center justify-center mr-2.5">
        <FontAwesome name="book" size={16} color="#FFFFFF" />
      </View>
      <View className="flex-1">
        <Text
          className={`${type.caption} uppercase tracking-[1px] font-semibold text-clay`}
        >
          Reading together
        </Text>
        <Text className={`${type.title} text-secondary mt-0.5`}>
          {count === null ? "—" : count} {label}
        </Text>
      </View>
    </View>
  );
}
