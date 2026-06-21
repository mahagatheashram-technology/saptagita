import { Platform, TextStyle } from "react-native";
import { ScriptPreference } from "./verseText";

// Indic scripts (Telugu, Devanagari) use stacked/combining glyphs that need
// generous vertical room. On Android we deliberately do NOT pin a fontFamily:
// the app only bundles Latin fonts, so naming "Noto Sans Telugu" was a no-op at
// best and broke glyph metrics at worst. Letting the OS pick its native font
// for the script — with includeFontPadding on and no hard-coded lineHeight —
// lets the system reserve correct ascent/descent space at any font size.
// On iOS the named families are genuine system fonts, so we keep them.
function getIndicTextStyle(iosFontFamily: string): TextStyle {
  return {
    fontFamily: Platform.select({
      ios: iosFontFamily,
      // Android & web: rely on system shaping / fallback.
      default: undefined,
    }),
    letterSpacing: 0,
    ...Platform.select({
      android: { includeFontPadding: true },
      default: {},
    }),
  };
}

export function getVerseTextStyle(
  scriptPreference?: ScriptPreference | null
): TextStyle {
  if (scriptPreference === "telugu") {
    return getIndicTextStyle("Telugu Sangam MN");
  }

  return getIndicTextStyle("Devanagari Sangam MN");
}

export const transliterationTextStyle: TextStyle = {
  lineHeight: 24,
  letterSpacing: 0,
};

export const translationTextStyle: TextStyle = {
  lineHeight: 26,
  letterSpacing: 0,
};
