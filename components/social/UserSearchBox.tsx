import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getInitials } from "./leaderboardPresentation";
import { type } from "@/lib/typography";

/** Matches the server's floor — below this the query returns nothing. */
const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 300;

interface UserSearchBoxProps {
  onSelectUser: (user: {
    userId: Id<"users">;
    displayName: string;
    avatarUrl: string | null;
  }) => void;
}

// Search is by display name only. The backend refuses anything shorter than 3
// characters and anything email-shaped, so this can never be used to probe
// whether an address has an account.
export function UserSearchBox({ onSelectUser }: UserSearchBoxProps) {
  const [rawQuery, setRawQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce so a query isn't fired on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(rawQuery.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [rawQuery]);

  const isQueryLongEnough = debouncedQuery.length >= MIN_QUERY_LENGTH;
  const results = useQuery(
    api.users.searchUsersByDisplayName,
    isQueryLongEnough ? { query: debouncedQuery } : "skip"
  );

  const isSearching = isQueryLongEnough && results === undefined;
  const hasTyped = rawQuery.trim().length > 0;

  return (
    <View className="px-5 pt-1">
      <View className="flex-row items-center bg-surface rounded-full border border-sand-200 px-4">
        <Ionicons name="search" size={16} color="#B8A894" />
        <TextInput
          value={rawQuery}
          onChangeText={setRawQuery}
          placeholder="Find a reader by name"
          placeholderTextColor="#B8A894"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          className={`flex-1 ${type.bodySm} text-textPrimary ml-2`}
          style={{ paddingVertical: 10 }}
        />
        {hasTyped ? (
          <Pressable onPress={() => setRawQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color="#B8A894" />
          </Pressable>
        ) : null}
      </View>

      {hasTyped && !isQueryLongEnough ? (
        <Text className={`${type.meta} text-textSecondary mt-2 ml-1`}>
          Keep typing — at least {MIN_QUERY_LENGTH} characters.
        </Text>
      ) : null}

      {isSearching ? (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#FF6B35" />
        </View>
      ) : null}

      {results && results.length === 0 ? (
        <Text className={`${type.bodySm} text-textSecondary mt-3 ml-1`}>
          No readers found. They may not be discoverable.
        </Text>
      ) : null}

      {results && results.length > 0 ? (
        <View className="mt-2">
          {results.map((user) => (
            <Pressable
              key={user.userId}
              onPress={() =>
                onSelectUser({
                  userId: user.userId,
                  displayName: user.displayName,
                  avatarUrl: user.avatarUrl,
                })
              }
              className="flex-row items-center bg-surface rounded-2xl px-4 py-2.5 mb-2 shadow-sm active:opacity-80"
            >
              <View className="h-9 w-9 rounded-full bg-sand-200 items-center justify-center mr-3">
                <Text className={`${type.bodySm} font-semibold text-secondary`}>
                  {getInitials(user.displayName)}
                </Text>
              </View>
              <Text
                className={`${type.body} font-semibold text-textPrimary flex-1`}
                numberOfLines={1}
              >
                {user.displayName}
              </Text>
              <Text className={`${type.bodySm} mr-1`}>🔥</Text>
              <Text className={`${type.bodySm} font-semibold text-primary`}>
                {user.currentStreak}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
