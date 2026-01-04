import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useSignIn } from "@clerk/clerk-expo";

export function EmailSignIn() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pendingCode, setPendingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sendCode = async () => {
    if (!isLoaded) return;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setIsSubmitting(true);
    try {
      await signIn?.create({
        identifier: trimmed,
        strategy: "email_code",
      });
      setPendingCode(true);
    } catch (error: any) {
      Alert.alert("Could not send code", String(error?.message ?? error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyCode = async () => {
    if (!isLoaded || !pendingCode) return;
    const trimmedCode = code.trim();
    if (!trimmedCode) return;
    setIsSubmitting(true);
    try {
      const result = await signIn?.attemptFirstFactor({
        strategy: "email_code",
        code: trimmedCode,
      });

      if (result?.status === "complete") {
        await setActive?.({ session: result.createdSessionId });
      } else {
        Alert.alert("Verification failed", "Please try again.");
      }
    } catch (error: any) {
      Alert.alert("Verification failed", String(error?.message ?? error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="w-full">
      <Text className="text-sm text-textPrimary mb-2">Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        className="border border-gray-200 rounded-xl px-3 py-3 text-base text-textPrimary bg-white"
      />

      {pendingCode && (
        <View className="mt-3">
          <Text className="text-sm text-textPrimary mb-2">Enter code</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            keyboardType="number-pad"
            className="border border-gray-200 rounded-xl px-3 py-3 text-base text-textPrimary bg-white"
          />
        </View>
      )}

      <Pressable
        onPress={pendingCode ? verifyCode : sendCode}
        disabled={isSubmitting}
        className={`mt-4 rounded-xl py-3 items-center ${
          isSubmitting ? "bg-gray-200" : "bg-primary"
        }`}
      >
        <Text
          className={`font-semibold ${
            isSubmitting ? "text-textSecondary" : "text-white"
          }`}
        >
          {isSubmitting
            ? "Please wait..."
            : pendingCode
            ? "Verify & Continue"
            : "Continue with Email"}
        </Text>
      </Pressable>
    </View>
  );
}
