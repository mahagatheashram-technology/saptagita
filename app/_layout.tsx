import { convex } from "@/lib/convex";
import {
  cancelDailyReminder,
  getReminderPreference,
  getStoredReminderTime,
  isDailyReminderScheduled,
  requestNotificationPermissions,
  scheduleDailyReminder,
} from "@/lib/notifications";
import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { useFonts } from "expo-font";
import { Redirect, Stack, usePathname, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
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

export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env.local");
  }

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
          <ClerkLoaded>
            <ConvexAuthSync />
            <NotificationEffects />
            <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
              <ThemeProvider value={DefaultTheme}>
                <AuthStack />
              </ThemeProvider>
            </ConvexProviderWithClerk>
          </ClerkLoaded>
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

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!isSignedIn) return;

    let Notifications: typeof import("expo-notifications") | null = null;
    let subscription: import("expo-notifications").Subscription | null = null;

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

        const alreadyScheduled = await isDailyReminderScheduled();
        if (!alreadyScheduled) {
          const storedTime = await getStoredReminderTime();
          const [storedHour, storedMinute] = (storedTime ?? "20:00")
            .split(":")
            .map((v: string) => Number(v) || 0);
          await scheduleDailyReminder(storedHour, storedMinute);
        }

        subscription = Notifications.addNotificationResponseReceivedListener(
          () => {
            router.replace("/(tabs)");
          }
        );
      } catch (error) {
        console.log("Notification setup failed", error);
      }
    };

    setupNotifications();

    return () => {
      subscription?.remove();
    };
  }, [isSignedIn]);

  return null;
}

function AuthStack() {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const isAuthRoute = pathname === "/sign-in" || pathname === "/sign-up";
  const isWelcomeRoute = pathname === "/welcome";

  if (!isLoaded) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text className="text-textSecondary mt-2">Loading account...</Text>
      </View>
    );
  }

  if (!isSignedIn && !isAuthRoute && !isWelcomeRoute) {
    return <Redirect href="/welcome" />;
  }

  if (isSignedIn && (isAuthRoute || isWelcomeRoute)) {
    return <Redirect href="/" />;
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="bucket/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="sign-up" options={{ headerShown: false }} />
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
    </Stack>
  );
}
