import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface DevPanelProps {
  userId: Id<"users"> | null;
  embedded?: boolean;
}

export function DevPanel({ userId, embedded = false }: DevPanelProps) {
  // Queries
  const debugState = useQuery(
    api.debug.getDebugState,
    userId ? { userId } : "skip"
  );

  // Mutations
  const simulateNextDay = useMutation(api.debug.simulateNextDay);
  const simulateMissedDay = useMutation(api.debug.simulateMissedDay);
  const forceCompleteToday = useMutation(api.debug.forceCompleteToday);
  const resetProgress = useMutation(api.debug.resetUserProgress);

  if (!userId) {
    return (
      <View className="p-4">
        <Text className="text-red-500">No user ID</Text>
      </View>
    );
  }

  const handleAction = async (
    action: () => Promise<any>,
    actionName: string
  ) => {
    try {
      const result = await action();
      Alert.alert("Success", JSON.stringify(result, null, 2));
    } catch (error) {
      Alert.alert("Error", String(error));
    }
  };

  const confirmReset = () => {
    Alert.alert(
      "Reset All Progress?",
      "This will delete all reading history and start from verse 1.1",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () =>
            handleAction(() => resetProgress({ userId }), "Reset"),
        },
      ]
    );
  };

  const content = (
    <>
      <Text className="text-2xl font-bold text-secondary mb-4">🛠 Dev Tools</Text>

      {/* Current State */}
      <View className="bg-surface rounded-xl p-4 mb-4 shadow-sm">
        <Text className="text-lg font-semibold text-secondary mb-2">
          Current State
        </Text>

        {debugState ? (
          <View className="space-y-1">
            <Text className="text-textSecondary">
              Timezone: {debugState.currentTimezone}
            </Text>
            <Text className="text-textSecondary">
              Sequential Pointer: {debugState.userState?.sequentialPointer ?? 0}
            </Text>
            <Text className="text-textSecondary">
              Last Daily Date: {debugState.userState?.lastDailyDate || "None"}
            </Text>
            <Text className="text-textSecondary">
              Current Streak: {debugState.streak?.currentStreak ?? 0}
            </Text>
            <Text className="text-textSecondary">
              Longest Streak: {debugState.streak?.longestStreak ?? 0}
            </Text>
            <Text className="text-textSecondary">
              Last Completed:{" "}
              {debugState.streak?.lastCompletedLocalDate || "Never"}
            </Text>
            <Text className="text-textSecondary">
              Daily Sets Created: {debugState.dailySets?.length ?? 0}
            </Text>
            <Text className="text-textSecondary">
              Total Read Events: {debugState.totalReadEvents}
            </Text>
          </View>
        ) : (
          <Text className="text-textSecondary">Loading...</Text>
        )}
      </View>

      {/* Actions */}
      <View className="bg-surface rounded-xl p-4 mb-4 shadow-sm">
        <Text className="text-lg font-semibold text-secondary mb-3">
          Test Actions
        </Text>

        <DevButton
          title="✅ Force Complete Today"
          subtitle="Mark all 7 verses as read, update streak"
          onPress={() =>
            handleAction(() => forceCompleteToday({ userId }), "Force Complete")
          }
          color="bg-success"
        />

        <DevButton
          title="📅 Simulate Next Day"
          subtitle="Advance to tomorrow, ready for new set"
          onPress={() =>
            handleAction(() => simulateNextDay({ userId }), "Next Day")
          }
          color="bg-primary"
        />

        <DevButton
          title="💔 Simulate Missed Day"
          subtitle="Skip a day to test streak reset"
          onPress={() =>
            handleAction(() => simulateMissedDay({ userId }), "Missed Day")
          }
          color="bg-orange-500"
        />

        <DevButton
          title="🗑 Reset All Progress"
          subtitle="Delete everything, start from verse 1.1"
          onPress={confirmReset}
          color="bg-red-500"
        />
      </View>

      {/* Instructions */}
      <View className="bg-blue-50 rounded-xl p-4 mb-8">
        <Text className="text-blue-800 font-semibold mb-2">Testing Flow:</Text>
        <Text className="text-blue-700 text-sm">
          1. Force complete today → streak = 1{"\n"}
          2. Simulate next day{"\n"}
          3. Go to Today tab → should show verses 8-14{"\n"}
          4. Force complete → streak = 2{"\n"}
          5. Simulate missed day{"\n"}
          6. Go to Today tab → streak should reset to 0
        </Text>
      </View>
    </>
  );

  if (embedded) {
    return <View className="bg-background p-4">{content}</View>;
  }

  return <ScrollView className="flex-1 bg-background p-4">{content}</ScrollView>;
}

function DevButton({
  title,
  subtitle,
  onPress,
  color,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  color: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`${color} rounded-lg p-3 mb-2 active:opacity-80`}
    >
      <Text className="text-white font-semibold">{title}</Text>
      <Text className="text-white/80 text-sm">{subtitle}</Text>
    </Pressable>
  );
}
