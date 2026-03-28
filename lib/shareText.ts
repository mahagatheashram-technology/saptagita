import { Platform, Share } from "react-native";
import { getDisplayVerseText, ScriptPreference } from "./verseText";

export async function shareText(message: string) {
  if (Platform.OS !== "web") {
    return Share.share({ message });
  }

  const nav: any = globalThis?.navigator;

  if (nav?.share) {
    try {
      return await nav.share({ text: message });
    } catch (err) {
      // Fall through to clipboard on share cancel/failure
    }
  }

  if (nav?.clipboard?.writeText) {
    await nav.clipboard.writeText(message);
    return;
  }

  // Last resort: do nothing but avoid throwing
  return;
}

export function formatVerseShareMessage(input: {
  chapterNumber: number;
  verseNumber: number;
  sanskritDevanagari: string;
  sanskritTelugu?: string | null;
  transliteration: string;
  translationEnglish: string;
}, scriptPreference?: ScriptPreference | null) {
  const { chapterNumber, verseNumber, transliteration, translationEnglish } =
    input;
  const verseText = getDisplayVerseText(input, scriptPreference);
  return `Bhagavad Gita ${chapterNumber}.${verseNumber}\n\n${verseText}\n\n${transliteration}\n\n"${translationEnglish}"\n\n— Shared from Sapta Gita`;
}
