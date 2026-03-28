import { useState } from "react";
import { Alert, Platform, Pressable, Text, TextInput, View } from "react-native";
import { useSignIn, useSignUp } from "@clerk/clerk-expo";

type FlowMode = "signin" | "signup";
type PendingAttempt = { mode: FlowMode; email: string } | null;

function formatFieldName(field: string) {
  return field.replace(/_/g, " ").trim();
}

function parseClerkError(error: any): { code?: string; message: string } {
  const first = error?.errors?.[0];
  const code = first?.code ?? error?.code;
  const message =
    first?.longMessage ||
    first?.message ||
    error?.message ||
    "An unexpected error occurred. Please try again.";
  return { code, message: String(message) };
}

function getVerificationErrorMessage(error: any): string {
  const { code, message } = parseClerkError(error);

  if (
    code === "form_code_incorrect" ||
    code === "verification_failed" ||
    code === "verification_invalid"
  ) {
    return "The verification code is incorrect. Please try again.";
  }
  if (code === "form_code_expired") {
    return "This code has expired. Please request a new one.";
  }
  if (code === "too_many_requests" || code === "rate_limit_exceeded") {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (code === "client_state_invalid" || code === "session_exists") {
    return "Your verification session is out of date. Please request a new code.";
  }

  return message;
}

function getSendCodeErrorMessage(error: any): string {
  const { code, message } = parseClerkError(error);
  const retryAfterSeconds =
    Number(error?.errors?.[0]?.meta?.retry_after_seconds) ||
    Number(error?.errors?.[0]?.meta?.retry_after) ||
    0;
  if (code === "too_many_requests" || code === "rate_limit_exceeded") {
    if (retryAfterSeconds > 0) {
      return `Too many requests. Please wait about ${retryAfterSeconds} seconds before requesting another code.`;
    }
    return "Too many requests. Please wait a moment before requesting another code.";
  }
  return message;
}

export function EmailSignIn() {
  const { isLoaded: signInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: signUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pendingAttempt, setPendingAttempt] = useState<PendingAttempt>(null);
  const [pendingSignUpEmail, setPendingSignUpEmail] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoaded = signInLoaded && signUpLoaded;
  const pendingCode = pendingAttempt !== null;

  const sendCode = async () => {
    if (!isLoaded) return;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert("Enter your email", "Please provide an email address first.");
      return;
    }
    setIsSubmitting(true);
    try {
      if (pendingSignUpEmail === trimmed) {
        await signUp?.create({ emailAddress: trimmed });
        await signUp?.prepareEmailAddressVerification({ strategy: "email_code" });
        setPendingAttempt({ mode: "signup", email: trimmed });
        setPendingSignUpEmail(null);
        setCode("");
        return;
      }

      // Try sign-in first (works for existing accounts)
      await signIn?.create({ identifier: trimmed, strategy: "email_code" });
      setPendingSignUpEmail(null);
      setPendingAttempt({ mode: "signin", email: trimmed });
      setCode("");
    } catch (err: any) {
      // If account doesn't exist, silently fall back to sign-up
      const parsed = parseClerkError(err);
      const isNotFound =
        parsed.code === "form_identifier_not_found" ||
        parsed.message.toLowerCase().includes("couldn't find your account") ||
        parsed.message.toLowerCase().includes("not found");

      if (isNotFound) {
        setPendingSignUpEmail(trimmed);
        Alert.alert(
          "Create new account",
          "We couldn't find an account for this email. Tap the button once more to create an account and send your verification code."
        );
      } else {
        Alert.alert("Could not send code", getSendCodeErrorMessage(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyCode = async () => {
    if (!isLoaded || !pendingAttempt) return;
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      Alert.alert("Enter verification code", "Type the code sent to your email.");
      return;
    }
    setIsSubmitting(true);
    try {
      if (pendingAttempt.mode === "signin") {
        const result = await signIn?.attemptFirstFactor({
          strategy: "email_code",
          code: trimmedCode,
        });

        if (result?.status === "complete") {
          await setSignInActive?.({ session: result.createdSessionId });
          return;
        }

        if (result?.status === "needs_second_factor") {
          Alert.alert(
            "Additional verification required",
            "This account requires a second verification factor. Please use an available sign-in method that supports it."
          );
          return;
        }

        if (result?.status === "needs_new_password") {
          Alert.alert(
            "Password reset required",
            "This account requires a password reset before sign-in can complete."
          );
          return;
        }

        Alert.alert(
          "Verification incomplete",
          `Sign-in is currently in '${result?.status ?? "unknown"}' state. Please request a new code and try again.`
        );
      } else {
        const result = await signUp?.attemptEmailAddressVerification({
          code: trimmedCode,
        });

        if (result?.status === "complete") {
          await setSignUpActive?.({ session: result.createdSessionId });
          return;
        }

        if (result?.status === "missing_requirements") {
          const missing = (result.missingFields ?? []).map(formatFieldName);
          const unverified = (result.unverifiedFields ?? []).map(formatFieldName);
          const details = [...missing, ...unverified];

          Alert.alert(
            "More information required",
            details.length > 0
              ? `Your account needs additional fields before verification can complete: ${details.join(
                  ", "
                )}.`
              : "Your account needs additional setup before verification can complete."
          );
          return;
        }

        Alert.alert(
          "Verification incomplete",
          `Sign-up is currently in '${result?.status ?? "unknown"}' state. Please request a new code and try again.`
        );
      }
    } catch (error: any) {
      Alert.alert("Verification failed", getVerificationErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFlow = () => {
    if (isSubmitting) return;
    setPendingAttempt(null);
    setPendingSignUpEmail(null);
    setCode("");
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
            onChangeText={(value) => {
              setEmail(value);
              const normalized = value.trim().toLowerCase();
              if (pendingSignUpEmail && normalized !== pendingSignUpEmail) {
                setPendingSignUpEmail(null);
              }
            }}
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
              {pendingAttempt?.email || email.trim().toLowerCase()}
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
            : pendingSignUpEmail
            ? "Create account and send code"
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
