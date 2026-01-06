import { Alert, Pressable, View, Text } from "react-native";

interface ReadingCalendarProps {
  completedDates: string[];
  timezone?: string | null;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDate(date: Date, timezone: string) {
  return date.toLocaleDateString("en-CA", { timeZone: timezone });
}

function formatMonthLabel(date: Date, timezone: string) {
  return date.toLocaleDateString("en-US", { month: "short", timeZone: timezone });
}

export function ReadingCalendar({ completedDates, timezone }: ReadingCalendarProps) {
  const resolvedTimezone =
    timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const completedSet = new Set(completedDates);
  const today = new Date();
  const todayString = formatDate(today, resolvedTimezone);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (11 * 7 + today.getDay()));

  const weeks = Array.from({ length: 12 }, (_, weekIndex) => {
    return Array.from({ length: 7 }, (_, dayIndex) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + weekIndex * 7 + dayIndex);
      const localDate = formatDate(date, resolvedTimezone);
      const isFuture = localDate > todayString;
      const isCompleted = completedSet.has(localDate);
      return { localDate, isFuture, isCompleted, date };
    });
  });

  const monthLabels = weeks.map((_, index) => {
    const weekStartDate = new Date(startDate);
    weekStartDate.setDate(startDate.getDate() + index * 7);
    const label = formatMonthLabel(weekStartDate, resolvedTimezone);
    if (index === 0) return label;
    const previousWeekStart = new Date(startDate);
    previousWeekStart.setDate(startDate.getDate() + (index - 1) * 7);
    const previousLabel = formatMonthLabel(previousWeekStart, resolvedTimezone);
    return label !== previousLabel ? label : "";
  });

  return (
    <View className="bg-surface rounded-xl p-4 shadow-sm">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-base font-semibold text-secondary">
          Reading Calendar
        </Text>
        <Text className="text-xs text-textSecondary">Last 12 weeks</Text>
      </View>

      <View className="flex-row mb-2 ml-5">
        {monthLabels.map((label, index) => (
          <Text
            key={`month-${index}`}
            className="text-[10px] text-textSecondary w-5 mr-1"
          >
            {label}
          </Text>
        ))}
      </View>

      <View className="flex-row">
        <View className="mr-2">
          {DAY_LABELS.map((label) => (
            <Text key={label} className="text-[10px] text-textSecondary mb-1">
              {label}
            </Text>
          ))}
        </View>

        <View className="flex-row">
          {weeks.map((week, weekIndex) => (
            <View key={`week-${weekIndex}`} className="mr-[2px]">
              {week.map((day, dayIndex) => {
                const dayNumber = day.date.getDate();
                const isToday = day.localDate === todayString;

                const backgroundColor = day.isFuture
                  ? "#F1F5F9"
                  : day.isCompleted
                  ? "#22C55E"
                  : "#CBD5E1";

                const borderColor = isToday ? "#F97316" : "#E2E8F0";

                return (
                  <Pressable
                    key={`day-${weekIndex}-${dayIndex}`}
                    onPress={() =>
                      Alert.alert(
                        day.localDate,
                        day.isFuture
                          ? "Upcoming"
                          : day.isCompleted
                          ? "Completed"
                          : "Missed"
                      )
                    }
                    accessibilityLabel={`${day.localDate} ${
                      day.isCompleted
                        ? "completed"
                        : day.isFuture
                        ? "upcoming"
                        : "missed"
                    }`}
                    className="mb-[2px]"
                  >
                    <View
                      className="items-center justify-center"
                      style={{
                        height: 16,
                        width: 16,
                        borderRadius: 4,
                        borderWidth: isToday ? 1.5 : 1,
                        borderColor,
                        backgroundColor,
                      }}
                    >
                      <Text
                        className="text-[8px] font-semibold"
                        style={{ color: "#1F2937" }}
                      >
                        {dayNumber}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
