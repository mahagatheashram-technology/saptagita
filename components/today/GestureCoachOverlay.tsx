import { Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface GestureCoachOverlayProps {
  visible: boolean;
  onDismiss: () => void;
}

export function GestureCoachOverlay({
  visible,
  onDismiss,
}: GestureCoachOverlayProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onDismiss}
    >
      <View className="flex-1 bg-black/35 justify-center px-5">
        <View
          className="rounded-3xl p-5"
          style={{ backgroundColor: "#FFFCF8", borderColor: "#F4E3D1", borderWidth: 1 }}
        >
          <Text
            className="text-[11px] tracking-[2px] uppercase text-[#A56A4C] mb-2"
            style={{ fontFamily: "SpaceMono" }}
          >
            Quick guide
          </Text>
          <Text className="text-2xl font-bold text-secondary mb-2">
            Read cards with a swipe
          </Text>
          <Text className="text-sm text-textSecondary mb-5 leading-6">
            You can always use tap buttons below the card if you don&apos;t want
            to swipe.
          </Text>

          <View className="rounded-2xl bg-white border border-[#F1DDC8] p-4 mb-3">
            <View className="flex-row items-start">
              <View className="w-9 h-9 rounded-full bg-[#FF6B35]/10 items-center justify-center mr-3">
                <Ionicons name="arrow-forward" size={18} color="#FF6B35" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-secondary">
                  Swipe right to go forward
                </Text>
                <Text className="text-sm text-textSecondary mt-1">
                  Moves to the next verse — and marks your current one read.
                </Text>
              </View>
            </View>
          </View>

          <View className="rounded-2xl bg-white border border-[#F1DDC8] p-4 mb-4">
            <View className="flex-row items-start">
              <View className="w-9 h-9 rounded-full bg-[#1A365D]/10 items-center justify-center mr-3">
                <Ionicons name="arrow-back" size={18} color="#1A365D" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-secondary">
                  Swipe left to go back
                </Text>
                <Text className="text-sm text-textSecondary mt-1">
                  Revisit earlier verses anytime. Save & share live on the card.
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            onPress={onDismiss}
            className="rounded-xl py-3.5 items-center bg-primary active:opacity-90"
          >
            <Text className="text-white text-base font-semibold">
              Got it, start reading
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
