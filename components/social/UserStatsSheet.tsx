import { forwardRef, useMemo } from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getInitials } from "./leaderboardPresentation";
import { type } from "@/lib/typography";

interface UserStatsSheetProps {
  /** The user whose stats to show, or null when the sheet is closed. */
  userId: Id<"users"> | null;
  /** Shown while the query resolves, so the sheet isn't blank on open. */
  fallbackName?: string | null;
  fallbackAvatarUrl?: string | null;
}

// Only three numbers, deliberately. Current streak is already public on every
// leaderboard row, so longest and perfect are a small increment on what the
// list shows. The reading calendar is intentionally NOT here: a day-by-day
// grid of when someone did or didn't read is behavioural detail, not a score.
export const UserStatsSheet = forwardRef<BottomSheet, UserStatsSheetProps>(
  ({ userId, fallbackName, fallbackAvatarUrl }, ref) => {
    const snapPoints = useMemo(() => ["46%"], []);

    const summary = useQuery(
      api.streaks.getStreakSummary,
      userId ? { userId } : "skip"
    );

    const isLoading = userId !== null && summary === undefined;
    // The query returns null when the viewer isn't allowed to see this person.
    const isHidden = summary === null && userId !== null;

    const name = summary?.displayName ?? fallbackName ?? "Reader";
    const avatarUrl = summary?.avatarUrl ?? fallbackAvatarUrl ?? null;

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            opacity={0.5}
          />
        )}
        backgroundStyle={{ backgroundColor: "#FFFFFF" }}
        handleIndicatorStyle={{ backgroundColor: "#D6C3AE" }}
      >
        <BottomSheetView className="flex-1 px-5 pb-6">
          <View className="items-center pt-2 pb-5">
            <View className="h-16 w-16 rounded-full bg-sand-200 overflow-hidden items-center justify-center mb-3">
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} className="h-16 w-16" />
              ) : (
                <Text className={`${type.title} text-secondary`}>
                  {getInitials(name)}
                </Text>
              )}
            </View>
            <Text className={`${type.title} text-secondary`} numberOfLines={1}>
              {name}
            </Text>
          </View>

          {isLoading ? (
            <View className="items-center py-8">
              <ActivityIndicator color="#FF6B35" />
            </View>
          ) : isHidden ? (
            <View className="items-center px-6 py-6">
              <Text
                className={`${type.bodySm} text-textSecondary text-center`}
              >
                This reader&apos;s stats aren&apos;t visible to you. You can see
                stats for people on the global leaderboard or in a community you
                share.
              </Text>
            </View>
          ) : (
            <View className="flex-row gap-2">
              <StatTile
                label="🔥 Current"
                value={summary?.currentStreak ?? 0}
                tone="primary"
              />
              <StatTile
                label="🏆 Longest"
                value={summary?.longestStreak ?? 0}
              />
              <StatTile
                label="⭐ Perfect"
                value={summary?.perfectDays ?? 0}
                tone="complete"
                note="All-time"
              />
            </View>
          )}
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

UserStatsSheet.displayName = "UserStatsSheet";

// Mirrors StreakStatsCard's tiles on Profile so the same three numbers read the
// same way wherever they appear.
function StatTile({
  label,
  value,
  tone,
  note,
}: {
  label: string;
  value: number;
  tone?: "primary" | "complete";
  note?: string;
}) {
  const isPrimary = tone === "primary";
  const isComplete = tone === "complete";
  return (
    <View
      className={`flex-1 rounded-lg p-3 ${
        isComplete
          ? "bg-[#F0FDF4] border border-[#BBF7D0]"
          : isPrimary
          ? "bg-[#FFF7ED] border border-primary/20"
          : "bg-sand-50"
      }`}
    >
      <Text
        className={`${type.meta} font-semibold ${
          isComplete
            ? "text-status-complete"
            : isPrimary
            ? "text-primary"
            : "text-textSecondary"
        }`}
      >
        {label}
      </Text>
      <Text className={`${type.title} text-textPrimary`}>{value} days</Text>
      {note ? (
        <Text className={`${type.micro} text-textSecondary/70 mt-0.5`}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}
