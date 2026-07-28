import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useUser } from "@clerk/clerk-expo";
import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useState } from "react";

interface ConvexUser {
  _id: Id<"users">;
  authId: string;
  displayName: string;
  avatarUrl: string;
  timezone: string;
  createdAt: number;
}

interface UseCurrentUserOptions {
  suspendSync?: boolean;
}

export function useCurrentUser(options: UseCurrentUserOptions = {}) {
  const { isLoaded, isSignedIn, user } = useUser();
  const {
    isAuthenticated: isConvexAuthenticated,
    isLoading: isConvexAuthLoading,
  } = useConvexAuth();
  const syncUser = useMutation(api.users.getOrCreateUserFromAuth);
  const suspendSync = options.suspendSync ?? false;

  // ADD THIS DEBUG LOG
  console.log("[useCurrentUser] Clerk state:", {
    isLoaded,
    isSignedIn,
    hasUser: !!user,
    userId: user?.id,
    suspendSync,
  });

  const [state, setState] = useState<{
    user: ConvexUser | null;
    isLoading: boolean;
    error: Error | null;
  }>({
    user: null,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    // ADD THIS DEBUG LOG
    console.log("[useCurrentUser] useEffect triggered:", {
      isLoaded,
      isSignedIn,
      hasUser: !!user,
      suspendSync,
    });

    if (suspendSync) {
      setState((prev) => ({ ...prev, isLoading: false, error: null }));
      return;
    }

    if (
      !isLoaded ||
      !isSignedIn ||
      !user ||
      isConvexAuthLoading ||
      !isConvexAuthenticated
    ) {
      console.log("[useCurrentUser] Early return - not ready");
      setState({ user: null, isLoading: false, error: null });
      return;
    }

    let cancelled = false;
    const run = async () => {
      console.log("[useCurrentUser] Starting syncUser mutation...");
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const timezone =
          Intl.DateTimeFormat().resolvedOptions().timeZone ||
          (user.publicMetadata as any)?.timezone ||
          "UTC";

        console.log("[useCurrentUser] Calling syncUser with:", { timezone });
        
        const syncedUser = await syncUser({
          displayName:
            user.fullName ||
            user.primaryEmailAddress?.emailAddress ||
            user.username ||
            "Reader",
          avatarUrl: user.imageUrl || "",
          timezone,
        });

        console.log("[useCurrentUser] syncUser returned:", syncedUser);

        if (!cancelled) {
          setState({ user: syncedUser as ConvexUser, isLoading: false, error: null });
        }
      } catch (error: any) {
        console.error("[useCurrentUser] Failed to sync:", error);
        if (!cancelled) {
          setState({ user: null, isLoading: false, error });
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [
    isLoaded,
    isSignedIn,
    user,
    syncUser,
    suspendSync,
    isConvexAuthLoading,
    isConvexAuthenticated,
  ]);

  return {
    user: state.user,
    isLoading:
      state.isLoading ||
      !isLoaded ||
      !isSignedIn ||
      isConvexAuthLoading ||
      !isConvexAuthenticated,
    error: state.error,
    isSignedIn,
    clerkUser: user,
  };
}
