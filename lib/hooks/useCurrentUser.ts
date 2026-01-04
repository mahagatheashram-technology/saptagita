import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useUser } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";

interface ConvexUser {
  _id: Id<"users">;
  authId: string;
  displayName: string;
  avatarUrl: string;
  timezone: string;
  createdAt: number;
}

export function useCurrentUser() {
  const { isLoaded, isSignedIn, user } = useUser();
  const syncUser = useMutation(api.users.getOrCreateUserFromAuth);

  // ADD THIS DEBUG LOG
  console.log("[useCurrentUser] Clerk state:", { isLoaded, isSignedIn, hasUser: !!user, userId: user?.id });

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
    console.log("[useCurrentUser] useEffect triggered:", { isLoaded, isSignedIn, hasUser: !!user });

    if (!isLoaded || !isSignedIn || !user) {
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
          (user.publicMetadata as any)?.timezone ||
          Intl.DateTimeFormat().resolvedOptions().timeZone ||
          "UTC";

        console.log("[useCurrentUser] Calling syncUser with:", { authId: user.id, timezone });
        
        const syncedUser = await syncUser({
          authId: user.id,
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
  }, [isLoaded, isSignedIn, user, syncUser]);

  return {
    user: state.user,
    isLoading: state.isLoading || !isLoaded || !isSignedIn,
    error: state.error,
    isSignedIn,
    clerkUser: user,
  };
}

