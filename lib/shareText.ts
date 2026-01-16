import { Platform, Share } from "react-native";

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
  transliteration: string;
  translationEnglish: string;
}) {
  const { chapterNumber, verseNumber, sanskritDevanagari, transliteration, translationEnglish } =
    input;
  return `Bhagavad Gita ${chapterNumber}.${verseNumber}\n\n${sanskritDevanagari}\n\n${transliteration}\n\n"${translationEnglish}"\n\n— Shared from Sapta Gita`;
}
