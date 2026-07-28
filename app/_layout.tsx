import { convex } from "@/lib/convex";
import {
  cancelDailyReminder,
  getReminderPreference,
  reconcileDailyReminder,
  requestNotificationPermissions,
} from "@/lib/notifications";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { AccountDeletionGate } from "@/components/auth/AccountDeletionGate";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useFonts } from "expo-font";
import { Redirect, Stack, usePathname, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import "../global.css";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore if the native splash screen isn't registered in this environment.
});

const SHIPPING_BUILD_PROFILES = new Set(["preview", "production"]);

function assertShippingParity(publishableKey: string) {
  const buildProfile = process.env.EAS_BUILD_PROFILE ?? "";
  const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL ?? "";
  const isReleaseRuntime = typeof __DEV__ !== "undefined" ? !__DEV__ : false;
  const enforceShippingRules =
    SHIPPING_BUILD_PROFILES.has(buildProfile) || isReleaseRuntime;

  if (!enforceShippingRules) return;

  if (publishableKey.startsWith("pk_test_")) {
    throw new Error(
      `Invalid Clerk configuration for shipping build (profile: ${
        buildProfile || "unknown"
      }): expected a live publishable key, got a test key.`
    );
  }

  if (convexUrl.includes("joyous-warthog-33")) {
    throw new Error(
      `Invalid Convex configuration for shipping build (profile: ${
        buildProfile || "unknown"
      }): app is pointed at the dev deployment.`
    );
  }
}

export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env.local");
  }
  assertShippingParity(publishableKey);

  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync().catch(() => {
        // Ignore if the native splash screen isn't registered in this environment.
      });
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav publishableKey={publishableKey} />;
}

function RootLayoutNav({ publishableKey }: { publishableKey: string }) {
  const [clerkInstanceNonce, setClerkInstanceNonce] = useState(0);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <ClerkProvider
          key={clerkInstanceNonce}
          publishableKey={publishableKey}
          tokenCache={tokenCache}
        >
          <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            <AccountDeletionGate>
              <NotificationEffects />
              <ThemeProvider value={DefaultTheme}>
                <AuthStack
                  onRetryAuth={() =>
                    setClerkInstanceNonce((value) => value + 1)
                  }
                />
              </ThemeProvider>
            </AccountDeletionGate>
          </ConvexProviderWithClerk>
        </ClerkProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

function NotificationEffects() {
  const { isSignedIn } = useAuth();
  const { isAuthenticated } = useConvexAuth();
  const { user: clerkUser } = useUser();
  const currentUser = useQuery(
    api.users.getUserByAuthId,
    isSignedIn && isAuthenticated && clerkUser ? {} : "skip"
  );
  const todayProgress = useQuery(
    api.dailySets.getTodayProgress,
    currentUser ? { userId: currentUser._id } : "skip"
  );

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!isSignedIn) return;
    if (!currentUser || todayProgress === undefined) return;

    let Notifications: typeof import("expo-notifications") | null = null;
    let subscription: import("expo-notifications").Subscription | null = null;
    let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null =
      null;

    const reconcile = async () => {
      await reconcileDailyReminder({
        completedLocalDate: todayProgress.isComplete
          ? todayProgress.localDate
          : null,
      });
    };

    const setupNotifications = async () => {
      try {
        Notifications = await import("expo-notifications");

        const enabled = await getReminderPreference();
        if (!enabled) {
          await cancelDailyReminder();
          return;
        }

        const granted = await requestNotificationPermissions();
        if (!granted) return;

        await reconcile();

        subscription = Notifications.addNotificationResponseReceivedListener(
          () => {
            router.replace("/(tabs)");
          }
        );
        appStateSubscription = AppState.addEventListener("change", (state) => {
          if (state === "active") {
            reconcile().catch((error) => {
              console.log("Notification reconciliation failed", error);
            });
          }
        });
      } catch (error) {
        console.log("Notification setup failed", error);
      }
    };

    setupNotifications();

    return () => {
      subscription?.remove();
      appStateSubscription?.remove();
    };
  }, [
    currentUser?._id,
    isAuthenticated,
    isSignedIn,
    todayProgress?.isComplete,
    todayProgress?.localDate,
  ]);

  return null;
}

function AuthStack({ onRetryAuth }: { onRetryAuth: () => void }) {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const isAuthRoute = pathname === "/sign-in";
  const [loadTimedOut, setLoadTimedOut] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      setLoadTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      setLoadTimedOut(true);
    }, 15000);

    return () => clearTimeout(timer);
  }, [isLoaded]);

  if (!isLoaded) {
    if (loadTimedOut) {
      return (
        <View className="flex-1 bg-background items-center justify-center px-6">
          <Text className="text-base font-semibold text-textPrimary mb-2">
            Auth failed to initialize
          </Text>
          <Text className="text-sm text-textSecondary text-center mb-4">
            We couldn't load authentication. Check your connection and retry.
            If this continues, contact support from the Play Store listing.
          </Text>
          <Pressable
            onPress={onRetryAuth}
            className="bg-primary rounded-xl py-3 px-4"
          >
            <Text className="text-white font-semibold">Retry auth init</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text className="text-textSecondary mt-2">Loading account...</Text>
        <Text className="text-textSecondary/50 text-xs mt-6">
          A Mahagathe Foundation Initiative
        </Text>
      </View>
    );
  }

  if (!isSignedIn && !isAuthRoute) {
    return <Redirect href="/sign-in" />;
  }

  if (isSignedIn && isAuthRoute) {
    return <Redirect href="/" />;
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
    </Stack>
  );
}
