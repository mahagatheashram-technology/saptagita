import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

export type LeaderboardScope = "global" | "communities";

interface LeaderboardHeaderProps {
  activeView: LeaderboardScope;
  onChange: (next: LeaderboardScope) => void;
}

export function LeaderboardHeader({ activeView, onChange }: LeaderboardHeaderProps) {
  const pillBase = "flex-1 flex-row items-center justify-center rounded-full px-4 py-2";

  return (
    <View className="px-5 pt-3 pb-2">
      <View className="flex-row bg-surface rounded-full p-1 shadow-sm border border-[#E2E8F0]">
        <Pressable
          onPress={() => onChange("global")}
          className={`${pillBase} ${activeView === "global" ? "bg-primary" : ""}`}
        >
          <Text
            className={`text-sm font-semibold ${
              activeView === "global" ? "text-white" : "text-textPrimary"
            }`}
          >
            Global
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onChange("communities")}
          className={`${pillBase} ${
            activeView === "communities" ? "bg-primary/10" : ""
          }`}
        >
          <Text
            className={`text-sm font-semibold ${
              activeView === "communities" ? "text-secondary" : "text-textPrimary"
            }`}
          >
            Communities
          </Text>
          <Ionicons
            name="chevron-down"
            size={16}
            color={activeView === "communities" ? "#1A365D" : "#718096"}
            style={{ marginLeft: 6 }}
          />
        </Pressable>
      </View>

      {activeView === "communities" ? (
        <View className="mt-3 bg-surface border border-dashed border-[#CBD5E0] rounded-xl p-4 shadow-sm">
          <Text className="text-base font-semibold text-textPrimary">
            Communities
          </Text>
          <Text className="text-sm text-textSecondary mt-1">
            No communities yet. Join a community to see group leaderboards.
          </Text>
          <Pressable
            disabled
            className="mt-3 px-4 py-2 rounded-lg border border-[#E2E8F0] bg-gray-50"
          >
            <Text className="text-textSecondary font-semibold text-center">
              Join a community (coming soon)
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
