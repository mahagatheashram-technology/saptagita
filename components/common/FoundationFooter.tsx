import { Image, Text, View } from "react-native";
import { type } from "@/lib/typography";

type FoundationFooterVariant = "bottom" | "top" | "hero";

interface FoundationFooterProps {
  /**
   * `bottom` — the standard tab-screen footer (Today, Social, Library).
   * `top`    — Profile's brand bar. Deliberately placed above the profile card
   *            rather than at the end of the scroll: the foundation attribution
   *            is meant to be the first thing seen on that screen. Same lockup
   *            as `bottom`, different position — do not "fix" this to match.
   * `hero`   — the celebration lockup on the day-complete screen.
   */
  variant?: FoundationFooterVariant;
  className?: string;
}

const LOGO = require("@/assets/images/mahagathe-foundation-logo.png");

// Every tab used to hand-roll this lockup at a different size and opacity
// (9px/30%, 10px/40%, 11px/40%, 11px/50%). One component, one treatment.
export function FoundationFooter({
  variant = "bottom",
  className = "",
}: FoundationFooterProps) {
  if (variant === "hero") {
    return (
      <View className={`items-center ${className}`}>
        <Image
          source={LOGO}
          style={{ width: 44, height: 44, marginBottom: 6 }}
          resizeMode="contain"
        />
        <Text className={`${type.bodySm} font-semibold text-secondary`}>
          Sapta Gita
        </Text>
        <Text
          className={`${type.meta} text-textSecondary/60 tracking-[0.5px] mt-1`}
        >
          A Mahagathe Foundation Initiative
        </Text>
      </View>
    );
  }

  const logoSize = variant === "top" ? 20 : 17;

  return (
    <View className={`items-center ${variant === "top" ? "py-2" : "py-2"} ${className}`}>
      <View className="flex-row items-center">
        <Image
          source={LOGO}
          style={{ width: logoSize, height: logoSize, marginRight: 6 }}
          resizeMode="contain"
        />
        <Text
          className={`${type.caption} text-textSecondary/50 tracking-[0.5px]`}
        >
          A Mahagathe Foundation Initiative
        </Text>
      </View>
    </View>
  );
}
