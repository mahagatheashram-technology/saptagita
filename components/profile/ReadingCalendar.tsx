import { Alert, Pressable, ScrollView, View, Text } from "react-native";

interface ReadingCalendarProps {
  readDates: string[];
  perfectDates: string[];
  timezone?: string | null;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDate(date: Date, timezone: string) {
  return date.toLocaleDateString("en-CA", { timeZone: timezone });
}

function formatMonthLabel(date: Date, timezone: string) {
  return date.toLocaleDateString("en-US", { month: "short", timeZone: timezone });
}

const CELL_SIZE = 22;
const CELL_GAP = 4;
const LABEL_WIDTH = CELL_SIZE + CELL_GAP;

export function ReadingCalendar({
  readDates,
  perfectDates,
  timezone,
}: ReadingCalendarProps) {
  const resolvedTimezone =
    timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const readSet = new Set(readDates);
  const perfectSet = new Set(perfectDates);
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
      const isPerfect = perfectSet.has(localDate);
      const isRead = isPerfect || readSet.has(localDate);
      return { localDate, isFuture, isRead, isPerfect, date };
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View className="flex-row mb-2 ml-8">
            {monthLabels.map((label, index) => (
              <Text
                key={`month-${index}`}
                className="text-[10px] text-textSecondary"
                style={{ width: LABEL_WIDTH, textAlign: "center" }}
              >
                {label}
              </Text>
            ))}
          </View>

          <View className="flex-row">
            <View className="mr-3">
              {DAY_LABELS.map((label) => (
                <Text
                  key={label}
                  className="text-[11px] text-textSecondary mb-[6px]"
                  style={{ width: 32 }}
                >
                  {label}
                </Text>
              ))}
            </View>

            <View className="flex-row">
              {weeks.map((week, weekIndex) => (
                <View key={`week-${weekIndex}`} style={{ marginRight: CELL_GAP }}>
                  {week.map((day, dayIndex) => {
                    const dayNumber = day.date.getDate();
                    const isToday = day.localDate === todayString;

                    const backgroundColor = day.isFuture
                      ? "#F8FAFC"
                      : day.isPerfect
                      ? "#F59E0B"
                      : day.isRead
                      ? "#1F9D55"
                      : "#CBD5E1";

                    const borderColor = isToday ? "#F97316" : "transparent";
                    const textColor =
                      day.isPerfect || day.isRead ? "#FFFFFF" : "#1F2937";

                    return (
                      <Pressable
                        key={`day-${weekIndex}-${dayIndex}`}
                        onPress={() =>
                          Alert.alert(
                            day.localDate,
                            day.isFuture
                              ? "Upcoming"
                              : day.isPerfect
                              ? "Perfect"
                              : day.isRead
                              ? "Read"
                              : "Missed"
                          )
                        }
                        accessibilityLabel={`${day.localDate} ${
                          day.isPerfect
                            ? "perfect"
                            : day.isRead
                            ? "read"
                            : day.isFuture
                            ? "upcoming"
                            : "missed"
                        }`}
                        style={{ marginBottom: CELL_GAP }}
                      >
                        <View
                          className="items-center justify-center"
                          style={{
                            height: CELL_SIZE,
                            width: CELL_SIZE,
                            borderRadius: 8,
                            borderWidth: isToday ? 2 : 1,
                            borderColor,
                            backgroundColor,
                          }}
                        >
                          <Text
                            className="text-[10px] font-semibold"
                            style={{ color: textColor }}
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
      </ScrollView>

      <View className="flex-row items-center mt-3" style={{ columnGap: 12 }}>
        <LegendSwatch color="#F59E0B" label="Perfect" />
        <LegendSwatch color="#1F9D55" label="Read" />
        <LegendSwatch color="#CBD5E1" label="Missed" />
        <LegendSwatch color="#F97316" label="Today" outlined />
      </View>
    </View>
  );
}

function LegendSwatch({
  color,
  label,
  outlined = false,
}: {
  color: string;
  label: string;
  outlined?: boolean;
}) {
  return (
    <View className="flex-row items-center mr-4">
      <View
        style={{
          height: 14,
          width: 14,
          borderRadius: 6,
          backgroundColor: outlined ? "transparent" : color,
          borderColor: color,
          borderWidth: 1.5,
          marginRight: 6,
        }}
      />
      <Text className="text-[11px] text-textSecondary">{label}</Text>
    </View>
  );
}
