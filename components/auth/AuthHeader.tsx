import { Image, Text, View } from "react-native";

interface AuthHeaderProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}

export function AuthHeader({
  eyebrow = "Sapta Gita",
  title = "One calm place for your daily reading.",
  subtitle = "Continue with Google or verify your email code to sync progress across devices.",
}: AuthHeaderProps) {
  return (
    <View className="items-center mb-8 px-2">
      <View
        className="w-20 h-20 rounded-3xl items-center justify-center mb-5"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.92)",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.9)",
          shadowColor: "#C94A1A",
          shadowOpacity: 0.18,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
          elevation: 4,
        }}
      >
        <Image
          source={require("../../assets/images/icon.png")}
          className="w-14 h-14 rounded-2xl"
          resizeMode="cover"
        />
      </View>

      <Text
        className="text-[11px] tracking-[2.2px] uppercase text-[#A56A4C] mb-3"
        style={{ fontFamily: "SpaceMono" }}
      >
        {eyebrow}
      </Text>

      <Text className="text-[32px] leading-[38px] font-bold text-secondary mb-3 text-center">
        {title}
      </Text>

      <Text className="text-base leading-6 text-textSecondary text-center px-4">
        {subtitle}
      </Text>
    </View>
  );
}
