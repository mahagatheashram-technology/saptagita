import { useState } from "react";
import { Linking, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const SEARCH_BASE_URL = "https://mahagathe.org/";

// Mirrors the WordPress search form on mahagathe.org:
//   GET https://mahagathe.org/?s=<query>&post_types=
export function buildDharmicSearchUrl(query: string): string {
  const trimmed = query.trim();
  return `${SEARCH_BASE_URL}?s=${encodeURIComponent(trimmed)}&post_types=`;
}

interface DharmicSearchBoxProps {
  // Optional hook for analytics / dismissing, fired after the browser opens.
  onSearch?: (query: string) => void;
}

export function DharmicSearchBox({ onSearch }: DharmicSearchBoxProps) {
  const [query, setQuery] = useState("");

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    try {
      // Open in the device's default browser for a faster, native experience.
      await Linking.openURL(buildDharmicSearchUrl(trimmed));
      onSearch?.(trimmed);
    } catch {
      // Silently ignore — opening the browser is best-effort.
    }
  };

  return (
    <View className="w-full max-w-sm items-center">
      <Text className="text-2xl font-bold text-secondary text-center">
        Your Questions, Dharmic Answers
      </Text>
      <Text className="text-sm text-textSecondary text-center mt-2 mb-4">
        Seek guidance through Venerable Mahamuni&apos;s sacred revelations.
      </Text>

      <View className="flex-row items-center w-full bg-surface border border-primary/50 rounded-full pl-5 pr-1.5 py-1.5 shadow-md">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Type a keyword…"
          placeholderTextColor="#94A3B8"
          className="flex-1 text-base text-textPrimary"
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable
          onPress={handleSearch}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Search Mahagathe articles"
          className="w-12 h-12 rounded-full bg-primary items-center justify-center active:opacity-80"
        >
          <Ionicons name="search" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}
