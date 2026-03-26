import { useEffect, useRef, useState, useCallback } from "react";
import { Audio } from "expo-av";
import AUDIO_ASSETS from "@/constants/audioAssets";

// ---------------------------------------------------------------------------
// Global singleton — only one verse plays at a time across the whole app.
// ---------------------------------------------------------------------------
let _sound: Audio.Sound | null = null;
let _activeKey: string | null = null;
let _stopActiveSound: (() => void) | null = null;

async function stopGlobal() {
  if (_sound) {
    try {
      await _sound.stopAsync();
      await _sound.unloadAsync();
    } catch (_) {}
    _sound = null;
  }
  if (_stopActiveSound) {
    _stopActiveSound();
    _stopActiveSound = null;
  }
  _activeKey = null;
}

// ---------------------------------------------------------------------------

export interface VerseAudioState {
  isPlaying: boolean;
  isLoading: boolean;
  positionMs: number;
  durationMs: number;
  hasAudio: boolean;
  toggle: () => Promise<void>;
  stop: () => Promise<void>;
}

export function useVerseAudio(
  chapterNumber: number,
  verseNumber: number
): VerseAudioState {
  const key = `${chapterNumber}-${verseNumber}`;
  const source = AUDIO_ASSETS[key] ?? null;
  const hasAudio = source !== null && source !== undefined;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const isActiveRef = useRef(false);

  // Keep stopActiveSound in sync so the global can call it
  const stopLocal = useCallback(() => {
    setIsPlaying(false);
    setPositionMs(0);
    isActiveRef.current = false;
  }, []);

  const stop = useCallback(async () => {
    if (!isActiveRef.current) return;
    await stopGlobal();
    setIsPlaying(false);
    setPositionMs(0);
    isActiveRef.current = false;
  }, []);

  const toggle = useCallback(async () => {
    if (!hasAudio) return;

    // --- Pause current ---
    if (isPlaying && isActiveRef.current && _sound) {
      try {
        await _sound.pauseAsync();
      } catch (_) {}
      setIsPlaying(false);
      return;
    }

    // --- Resume if same key is loaded but paused ---
    if (!isPlaying && isActiveRef.current && _sound) {
      try {
        await _sound.playAsync();
        setIsPlaying(true);
      } catch (_) {}
      return;
    }

    // --- Stop whatever else is playing, then load & play this verse ---
    await stopGlobal();

    setIsLoading(true);
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        source,
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return;
          setPositionMs(status.positionMillis ?? 0);
          setDurationMs(status.durationMillis ?? 0);
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPositionMs(0);
            isActiveRef.current = false;
            _activeKey = null;
            _stopActiveSound = null;
          }
        }
      );

      _sound = sound;
      _activeKey = key;
      _stopActiveSound = stopLocal;
      isActiveRef.current = true;

      setIsPlaying(true);
    } catch (err) {
      console.warn("[useVerseAudio] Failed to load audio:", err);
    } finally {
      setIsLoading(false);
    }
  }, [hasAudio, isPlaying, key, source, stopLocal]);

  // Stop and unload when component unmounts
  useEffect(() => {
    return () => {
      if (isActiveRef.current) {
        stopGlobal();
      }
    };
  }, [key]);

  return { isPlaying, isLoading, positionMs, durationMs, hasAudio, toggle, stop };
}
