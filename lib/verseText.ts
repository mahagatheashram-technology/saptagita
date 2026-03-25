export type ScriptPreference = "devanagari" | "telugu";

export type ScriptableVerse = {
  sanskritDevanagari: string;
  sanskritTelugu?: string | null;
};

export function getDisplayVerseText(
  verse: ScriptableVerse,
  scriptPreference?: ScriptPreference | null,
) {
  if (scriptPreference === "telugu" && verse.sanskritTelugu?.trim()) {
    return verse.sanskritTelugu;
  }

  return verse.sanskritDevanagari;
}
