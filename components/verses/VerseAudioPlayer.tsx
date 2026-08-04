import { useCallback } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVerseAudio } from "@/hooks/useVerseAudio";

interface VerseAudioPlayerProps {
  chapterNumber: number;
  verseNumber: number;
  /** compact = slim strip on card; full = labelled player in sheets */
  variant?: "compact" | "full";
  /** Called when the sheet/drawer closes so we can stop audio */
  onStop?: () => void;
}

function formatMs(ms: number): string {
  if (!ms || ms <= 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function VerseAudioPlayer({
  chapterNumber,
  verseNumber,
  variant = "compact",
}: VerseAudioPlayerProps) {
  const { isPlaying, isLoading, positionMs, durationMs, hasAudio, toggle } =
    useVerseAudio(chapterNumber, verseNumber);

  const progressPercent =
    durationMs > 0 ? Math.min((positionMs / durationMs) * 100, 100) : 0;

  if (!hasAudio) return null;

  if (variant === "compact") {
    return <CompactPlayer
      isPlaying={isPlaying}
      isLoading={isLoading}
      progressPercent={progressPercent}
      positionMs={positionMs}
      onToggle={toggle}
    />;
  }

  return <FullPlayer
    isPlaying={isPlaying}
    isLoading={isLoading}
    progressPercent={progressPercent}
    positionMs={positionMs}
    durationMs={durationMs}
    onToggle={toggle}
  />;
}

// ---------------------------------------------------------------------------
// Compact — used on VerseCard (top card only)
// ---------------------------------------------------------------------------
function CompactPlayer({
  isPlaying,
  isLoading,
  progressPercent,
  positionMs,
  onToggle,
}: {
  isPlaying: boolean;
  isLoading: boolean;
  progressPercent: number;
  positionMs: number;
  onToggle: () => void;
}) {
  return (
    <View className="flex-row items-center mt-4 pt-3"
      style={{ borderTopWidth: 1, borderTopColor: "#F0E8DE" }}
    >
      {/* Play / Pause / Loading */}
      <Pressable
        onPress={onToggle}
        hitSlop={8}
        className="w-8 h-8 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: isPlaying ? "#FF6B35" : "#FFF0E8" }}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FF6B35" />
        ) : (
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={14}
            color={isPlaying ? "#FFFFFF" : "#FF6B35"}
            style={{ marginLeft: isPlaying ? 0 : 1 }}
          />
        )}
      </Pressable>

      {/* Progress bar */}
      <View className="flex-1 h-1.5 rounded-full mr-3"
        style={{ backgroundColor: "#E9DFD3" }}
      >
        <View
          className="h-1.5 rounded-full"
          style={{
            backgroundColor: "#FF6B35",
            width: `${progressPercent}%`,
          }}
        />
      </View>

      {/* Time */}
      <Text className="text-xs" style={{ color: "#B8A894", minWidth: 30 }}>
        {positionMs > 0 ? formatMs(positionMs) : ""}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Full — used in BookmarkDetailSheet and ActionDrawer
// ---------------------------------------------------------------------------
function FullPlayer({
  isPlaying,
  isLoading,
  progressPercent,
  positionMs,
  durationMs,
  onToggle,
}: {
  isPlaying: boolean;
  isLoading: boolean;
  progressPercent: number;
  positionMs: number;
  durationMs: number;
  onToggle: () => void;
}) {
  return (
    <View
      className="rounded-2xl px-4 py-3"
      style={{ backgroundColor: "#FFF7F2", borderWidth: 1, borderColor: "#F1DDC8" }}
    >
      {/* Label row */}
      <View className="flex-row items-center mb-3">
        <Ionicons name="musical-notes-outline" size={15} color="#A56A4C" />
        <Text
          className="text-xs ml-1.5 uppercase tracking-widest"
          style={{ color: "#A56A4C", fontFamily: "SpaceMono" }}
        >
          Listen to recitation
        </Text>
      </View>

      {/* Controls row */}
      <View className="flex-row items-center">
        {/* Play / Pause */}
        <Pressable
          onPress={onToggle}
          hitSlop={8}
          className="w-9 h-9 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: isPlaying ? "#FF6B35" : "#FFE8DA" }}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FF6B35" />
          ) : (
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={16}
              color={isPlaying ? "#FFFFFF" : "#FF6B35"}
              style={{ marginLeft: isPlaying ? 0 : 1 }}
            />
          )}
        </Pressable>

        {/* Progress bar */}
        <View className="flex-1 h-1.5 rounded-full mx-2"
          style={{ backgroundColor: "#E9DFD3" }}
        >
          <View
            className="h-1.5 rounded-full"
            style={{
              backgroundColor: "#FF6B35",
              width: `${progressPercent}%`,
            }}
          />
        </View>

        {/* Time */}
        <Text className="text-xs ml-1" style={{ color: "#B8A894", minWidth: 70, textAlign: "right" }}>
          {positionMs > 0 || isPlaying
            ? `${formatMs(positionMs)} / ${formatMs(durationMs)}`
            : formatMs(durationMs)}
        </Text>
      </View>
    </View>
  );
}
