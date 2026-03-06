import { useState } from "react";
import { Platform } from "react-native";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useSignIn } from "@clerk/clerk-expo";

export function EmailSignIn() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [pendingCode, setPendingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sendCode = async () => {
    if (!isLoaded) return;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert("Enter your email", "Please provide an email address first.");
      return;
    }
    setIsSubmitting(true);
    try {
      await signIn?.create({
        identifier: trimmed,
        strategy: "email_code",
      });
      setSentTo(trimmed);
      setPendingCode(true);
      setCode("");
    } catch (error: any) {
      Alert.alert("Could not send code", String(error?.message ?? error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyCode = async () => {
    if (!isLoaded || !pendingCode) return;
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      Alert.alert("Enter verification code", "Type the code sent to your email.");
      return;
    }
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

  const resetFlow = () => {
    if (isSubmitting) return;
    setPendingCode(false);
    setCode("");
    setSentTo("");
  };

  const phaseLabel = pendingCode ? "Step 2 of 2" : "Step 1 of 2";
  const phaseTitle = pendingCode
    ? "Verify your code"
    : "Continue with email";
  const phaseDescription = pendingCode
    ? `We sent a 6-digit code to ${sentTo || email.trim().toLowerCase()}.`
    : "Use your email to receive a one-time code.";
  const inputTextStyle = {
    height: 52,
    fontSize: 17,
    lineHeight: 22,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "ios" ? 14 : 10,
    paddingBottom: Platform.OS === "ios" ? 12 : 10,
  };

  return (
    <View
      className="w-full border rounded-2xl p-4 mt-4"
      style={{ borderColor: "#F1DDC8", backgroundColor: "#FFF9F2" }}
    >
      <Text
        className="text-[11px] uppercase tracking-[2px] text-[#A56A4C] mb-2"
        style={{ fontFamily: "SpaceMono" }}
      >
        {phaseLabel}
      </Text>
      <Text className="text-lg font-semibold text-secondary mb-1">
        {phaseTitle}
      </Text>
      <Text className="text-sm text-textSecondary mb-4">{phaseDescription}</Text>

      <View>
        <Text className="text-xs font-semibold text-[#7A8798] mb-2">Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#A0AEC0"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          editable={!pendingCode && !isSubmitting}
          className="border rounded-xl bg-white"
          selectionColor="#FF6B35"
          style={{
            borderColor: "#E8D4BF",
            color: pendingCode ? "#7A8798" : "#2D3748",
            ...inputTextStyle,
          }}
        />
      </View>

      {pendingCode && (
        <View className="mt-3">
          <Text className="text-xs font-semibold text-[#7A8798] mb-2">
            Verification code
          </Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            placeholderTextColor="#A0AEC0"
            keyboardType="number-pad"
            className="border rounded-xl bg-white"
            selectionColor="#FF6B35"
            style={{
              borderColor: "#E8D4BF",
              color: "#2D3748",
              ...inputTextStyle,
            }}
          />
        </View>
      )}

      <Pressable
        onPress={pendingCode ? verifyCode : sendCode}
        disabled={isSubmitting}
        className={`mt-4 rounded-xl py-3.5 items-center ${
          isSubmitting ? "bg-[#E7D9CA]" : "bg-primary"
        }`}
      >
        <Text
          className={`font-semibold text-[15px] ${
            isSubmitting ? "text-[#7A8798]" : "text-white"
          }`}
        >
          {isSubmitting
            ? "Please wait..."
            : pendingCode
            ? "Verify and continue"
            : "Send verification code"}
        </Text>
      </Pressable>

      {pendingCode && (
        <Pressable onPress={resetFlow} disabled={isSubmitting} className="mt-3">
          <Text className="text-sm font-medium text-primary text-center">
            Use a different email
          </Text>
        </Pressable>
      )}
    </View>
  );
}
