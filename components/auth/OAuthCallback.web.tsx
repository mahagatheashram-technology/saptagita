import { useEffect, useRef, useState } from "react";
import { useClerk } from "@clerk/clerk-expo";
import { Link } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";

export function OAuthCallback() {
  const clerk = useClerk();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    clerk.handleRedirectCallback({
      signInUrl: "/sign-in",
      signUpUrl: "/sign-up",
      signInForceRedirectUrl: "/",
      signUpForceRedirectUrl: "/",
    }).catch((error: Error) => setError(error.message || "Please try signing in again."));
  }, [clerk]);
  return <View className="flex-1 items-center justify-center bg-background px-6">
    {error ? <>
      <Text className="text-lg font-semibold text-secondary mb-3">Could not finish sign-in</Text>
      <Text className="text-base text-textSecondary text-center mb-5">{error}</Text>
      <Link href="/sign-in" className="text-primary">Return to sign-in</Link>
    </> : <>
      <ActivityIndicator color="#FF6B35" />
      <Text className="text-base text-textSecondary mt-3">Finishing sign-in…</Text>
    </>}
  </View>;
}
