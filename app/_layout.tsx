import { convex } from "@/lib/convex";
import {
  cancelDailyReminder,
  getReminderPreference,
  reconcileDailyReminder,
  requestNotificationPermissions,
} from "@/lib/notifications";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { useQuery } from "convex/react";
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
  // Force light mode regardless of device setting
  const colorScheme = "light";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <ClerkProvider
          publishableKey={publishableKey}
          tokenCache={tokenCache}
        >
          <ConvexAuthSync />
          <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            <NotificationEffects />
            <ThemeProvider value={DefaultTheme}>
              <AuthStack />
            </ThemeProvider>
          </ConvexProviderWithClerk>
        </ClerkProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

// Ensure Convex client always has the latest Clerk session token
function ConvexAuthSync() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    convex.setAuth(async () => {
      if (!isSignedIn) return null;
      // Prefer the Convex-specific template; fall back to the default session token
      let templated: string | null = null;
      try {
        templated = await getToken({ template: "convex" });
      } catch {
        templated = null;
      }
      if (templated) return templated;
      try {
        return (await getToken()) ?? null;
      } catch {
        return null;
      }
    });
  }, [getToken, isSignedIn]);

  return null;
}

function NotificationEffects() {
  const { isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const currentUser = useQuery(
    api.users.getUserByAuthId,
    isSignedIn && clerkUser ? { authId: clerkUser.id } : "skip"
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
    isSignedIn,
    todayProgress?.isComplete,
    todayProgress?.localDate,
  ]);

  return null;
}

function AuthStack() {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const isAuthRoute = pathname === "/sign-in";
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const [clerkProbe, setClerkProbe] = useState<string>("pending");
  const [nativeApiDisabled, setNativeApiDisabled] = useState(false);

  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const keyPreview = publishableKey
    ? `${publishableKey.slice(0, 12)}...${publishableKey.slice(-4)}`
    : "missing";
  const clerkDomain = "https://clerk.mahagathe.org";

  useEffect(() => {
    if (isLoaded) {
      setLoadTimedOut(false);
      setClerkProbe("loaded");
      setNativeApiDisabled(false);
      return;
    }

    setClerkProbe("probing");
    fetch(`${clerkDomain}/v1/client?_is_native=1`, {
      headers: {
        "x-mobile": "1",
      },
    })
      .then(async (res) => {
        const body = await res.text();

        try {
          const parsed = JSON.parse(body);
          const code = parsed?.errors?.[0]?.code;
          if (code === "native_api_disabled") {
            setNativeApiDisabled(true);
            setClerkProbe("error native_api_disabled");
            return;
          }
        } catch {
          // Keep fallback probe text for non-JSON payloads.
        }

        setClerkProbe(`ok ${res.status} (${body.slice(0, 80)}...)`);
      })
      .catch((error: any) => {
        setClerkProbe(`error ${String(error?.message ?? error)}`);
      });

    const timer = setTimeout(() => {
      setLoadTimedOut(true);
    }, 15000);

    return () => clearTimeout(timer);
  }, [isLoaded, clerkDomain]);

  if (!isLoaded) {
    if (loadTimedOut) {
      return (
        <View className="flex-1 bg-background items-center justify-center px-6">
          <Text className="text-base font-semibold text-textPrimary mb-2">
            Auth failed to initialize
          </Text>
          <Text className="text-sm text-textSecondary text-center mb-4">
            {nativeApiDisabled
              ? "Clerk Native API is disabled for this instance. Enable it in Clerk Dashboard."
              : "We couldn't load Clerk authentication. Check network/DNS and reinstall the latest preview build."}
          </Text>
          <Text className="text-xs text-textSecondary text-center mb-2">
            Convex URL: {process.env.EXPO_PUBLIC_CONVEX_URL ?? "missing"}
          </Text>
          <Text className="text-xs text-textSecondary text-center mb-2">
            Clerk Domain: {clerkDomain}
          </Text>
          <Text className="text-xs text-textSecondary text-center mb-2">
            Key: {keyPreview}
          </Text>
          <Text className="text-xs text-textSecondary text-center mb-5">
            Clerk Probe: {clerkProbe}
          </Text>
          <Pressable
            onPress={() => setLoadTimedOut(false)}
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
