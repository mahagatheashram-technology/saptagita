import { useState } from "react";
import { Alert, Platform, Pressable, Text, TextInput, View } from "react-native";
import { useSignIn, useSignUp } from "@clerk/clerk-expo";

type FlowMode = "signin" | "signup";

export function EmailSignIn() {
  const { isLoaded: signInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: signUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [pendingCode, setPendingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flowMode, setFlowMode] = useState<FlowMode>("signin");

  const isLoaded = signInLoaded && signUpLoaded;

  const sendCode = async () => {
    if (!isLoaded) return;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert("Enter your email", "Please provide an email address first.");
      return;
    }
    setIsSubmitting(true);
    try {
      // Try sign-in first (works for existing accounts)
      await signIn?.create({ identifier: trimmed, strategy: "email_code" });
      setFlowMode("signin");
      setSentTo(trimmed);
      setPendingCode(true);
      setCode("");
    } catch (err: any) {
      // If account doesn't exist, silently fall back to sign-up
      const isNotFound =
        err?.errors?.[0]?.code === "form_identifier_not_found" ||
        err?.message?.toLowerCase().includes("couldn't find your account") ||
        err?.message?.toLowerCase().includes("not found");

      if (isNotFound) {
        try {
          await signUp?.create({ emailAddress: trimmed });
          await signUp?.prepareEmailAddressVerification({ strategy: "email_code" });
          setFlowMode("signup");
          setSentTo(trimmed);
          setPendingCode(true);
          setCode("");
        } catch (signUpErr: any) {
          Alert.alert("Could not send code", String(signUpErr?.message ?? signUpErr));
        }
      } else {
        Alert.alert("Could not send code", String(err?.message ?? err));
      }
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
      if (flowMode === "signin") {
        const result = await signIn?.attemptFirstFactor({
          strategy: "email_code",
          code: trimmedCode,
        });
        if (result?.status === "complete") {
          await setSignInActive?.({ session: result.createdSessionId });
        } else {
          Alert.alert("Verification failed", "Please try again.");
        }
      } else {
        const result = await signUp?.attemptEmailAddressVerification({
          code: trimmedCode,
        });
        if (result?.status === "complete") {
          await setSignUpActive?.({ session: result.createdSessionId });
        } else {
          Alert.alert("Verification failed", "Please try again.");
        }
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
    setFlowMode("signin");
  };

  const inputTextStyle = {
    height: 52,
    fontSize: 17,
    lineHeight: 22,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "ios" ? 14 : 10,
    paddingBottom: Platform.OS === "ios" ? 12 : 10,
  };

  return (
    <View className="w-full">
      {/* Email input — shown until code is sent */}
      {!pendingCode && (
        <View>
          <Text className="text-xs font-semibold text-[#7A8798] mb-2">
            Email address
          </Text>
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
            editable={!isSubmitting}
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

      {/* Code input — shown after code is sent */}
      {pendingCode && (
        <View>
          <Text className="text-sm text-[#7A8798] leading-5 mb-3">
            We sent a 6-digit code to{" "}
            <Text className="font-semibold text-[#2D3748]">
              {sentTo || email.trim().toLowerCase()}
            </Text>
            . Enter it below.
          </Text>
          <Text className="text-xs font-semibold text-[#7A8798] mb-2">
            Verification code
          </Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            placeholderTextColor="#A0AEC0"
            keyboardType="number-pad"
            autoFocus
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

      {/* Primary CTA */}
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

      {/* Back link */}
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
