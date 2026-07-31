import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Text, View } from "react-native";

export function TodayReadersStat({ count }: { count: number | null }) {
  const label = count === 1 ? "person read today" : "people read today";

  return (
    <View
      className="mx-5 mt-1 mb-1 rounded-2xl border border-[#D4AF37]/50 bg-[#FFF9E8] px-3 py-2 flex-row items-center"
      accessibilityLabel={count === null ? "Loading today's readers" : `${count} ${label}`}
    >
      <View className="h-8 w-8 rounded-full bg-[#D4AF37] items-center justify-center mr-2.5">
        <FontAwesome name="book" size={18} color="#2F2400" />
      </View>
      <View className="flex-1">
        <Text className="text-[12px] uppercase tracking-[1px] font-semibold text-[#7A5A00]">
          Reading together
        </Text>
        <Text className="text-[19px] font-bold text-secondary mt-0.5">
          {count === null ? "—" : count} {label}
        </Text>
      </View>
    </View>
  );
}
