import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useUser } from "@clerk/clerk-expo";
import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { coordinateUserSync } from "@/lib/userSyncCoordinator";

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
  const [retryNonce, setRetryNonce] = useState(0);
  const authId = user?.id ?? null;
  const displayName =
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress ||
    user?.username ||
    "Reader";
  const avatarUrl = user?.imageUrl || "";
  const metadataTimezone = (user?.publicMetadata as any)?.timezone;

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
    if (suspendSync) {
      setState((prev) => ({ ...prev, isLoading: false, error: null }));
      return;
    }

    if (
      !isLoaded ||
      !isSignedIn ||
      !authId ||
      isConvexAuthLoading ||
      !isConvexAuthenticated
    ) {
      setState({ user: null, isLoading: false, error: null });
      return;
    }

    let cancelled = false;
    const run = async () => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const timezone =
          Intl.DateTimeFormat().resolvedOptions().timeZone ||
          metadataTimezone ||
          "UTC";
        const fingerprint = JSON.stringify([
          authId,
          displayName,
          avatarUrl,
          timezone,
        ]);
        const syncedUser = await coordinateUserSync(
          fingerprint,
          () =>
            syncUser({
              displayName,
              avatarUrl,
              timezone,
            }),
          retryNonce > 0
        );

        if (!cancelled) {
          setState({ user: syncedUser as ConvexUser, isLoading: false, error: null });
        }
      } catch (error: any) {
        console.error("Account sync failed", error);
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
    authId,
    avatarUrl,
    displayName,
    isLoaded,
    isSignedIn,
    isConvexAuthenticated,
    isConvexAuthLoading,
    metadataTimezone,
    retryNonce,
    suspendSync,
    syncUser,
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
    retrySync: () => setRetryNonce((value) => value + 1),
  };
}
