import { api } from "@/convex/_generated/api";
import {
  AccountDeletionCheckpoint,
  EMPTY_DELETION_CHECKPOINT,
  runAccountDeletion,
} from "@/lib/accountDeletion";
import { clearUserSyncCache } from "@/lib/userSyncCoordinator";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useConvexAuth, useQuery } from "convex/react";
import { ReactNode, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

interface AccountDeletionGateProps {
  children: ReactNode;
  onRetryAuth?: () => void;
}

const PENDING_CHECKPOINT: AccountDeletionCheckpoint = {
  ...EMPTY_DELETION_CHECKPOINT,
  appDataDeleted: true,
};

export function AccountDeletionGate({
  children,
  onRetryAuth,
}: AccountDeletionGateProps) {
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const { isAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth();
  const pendingDeletion = useQuery(
    api.users.getAccountDeletionStatus,
    isSignedIn && isAuthenticated ? {} : "skip"
  );
  const [checkpoint, setCheckpoint] =
    useState<AccountDeletionCheckpoint>(PENDING_CHECKPOINT);
  const [isRetrying, setIsRetrying] = useState(false);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [requiresSignInAgain, setRequiresSignInAgain] = useState(false);
  const [showAuthRecovery, setShowAuthRecovery] = useState(false);

  useEffect(() => {
    if (!isSignedIn || isConvexAuthLoading || isAuthenticated) {
      setShowAuthRecovery(false);
      return;
    }

    const timer = setTimeout(() => setShowAuthRecovery(true), 8_000);
    return () => clearTimeout(timer);
  }, [isAuthenticated, isConvexAuthLoading, isSignedIn]);

  if (
    isSignedIn &&
    !isConvexAuthLoading &&
    !isAuthenticated &&
    showAuthRecovery
  ) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-lg font-semibold text-textPrimary text-center mb-2">
          Secure connection unavailable
        </Text>
        <Text className="text-sm text-textSecondary text-center mb-5">
          We could not connect your signed-in account to Sapta Gita. Retry the
          connection or sign out and sign in again.
        </Text>
        {failureMessage ? (
          <Text className="text-sm text-red-600 text-center mb-4">
            {failureMessage}
          </Text>
        ) : null}
        <Pressable
          onPress={() => {
            setShowAuthRecovery(false);
            setFailureMessage(null);
            onRetryAuth?.();
          }}
          className="bg-primary rounded-xl py-3 px-5 min-w-48 items-center"
        >
          <Text className="text-white font-semibold">Retry connection</Text>
        </Pressable>
        <Pressable
          onPress={async () => {
            try {
              await signOut();
              clearUserSyncCache();
            } catch (error) {
              console.error("Auth recovery sign out failed", error);
              setFailureMessage(
                "We couldn't sign you out. Check your connection and retry."
              );
            }
          }}
          className="py-3 px-5 mt-2"
        >
          <Text className="text-primary font-semibold">Sign out</Text>
        </Pressable>
      </View>
    );
  }

  if (!isSignedIn || (!isConvexAuthLoading && !isAuthenticated)) {
    return children;
  }

  if (isConvexAuthLoading || pendingDeletion === undefined) {
    return children;
  }

  if (!pendingDeletion) {
    return children;
  }

  const finishDeletion = async () => {
    if (!user) {
      setFailureMessage(
        "Authentication is still loading. Wait a moment and retry."
      );
      return;
    }

    setIsRetrying(true);
    setFailureMessage(null);
    setRequiresSignInAgain(false);
    const result = await runAccountDeletion(
      {
        canDeleteClerkIdentity: user.deleteSelfEnabled,
        deleteAppData: async () => undefined,
        deleteClerkIdentity: () => user.delete(),
        signOut: async () => {
          await signOut();
          clearUserSyncCache();
        },
      },
      checkpoint
    );
    setCheckpoint(result.checkpoint);

    if (!result.ok) {
      console.error("Account deletion recovery failed", {
        phase: result.phase,
        cause: result.cause,
      });
      setFailureMessage(result.message);
      setRequiresSignInAgain(result.requiresSignInAgain);
    }
    setIsRetrying(false);
  };

  return (
    <View className="flex-1 bg-background items-center justify-center px-6">
      <Text className="text-lg font-semibold text-textPrimary text-center mb-2">
        Finish deleting your account
      </Text>
      <Text className="text-sm text-textSecondary text-center mb-4">
        Your Sapta Gita reading data has been deleted. Your sign-in identity
        still needs to be removed from Clerk.
      </Text>
      {failureMessage ? (
        <Text className="text-sm text-red-600 text-center mb-4">
          {failureMessage}
        </Text>
      ) : null}
      <Pressable
        onPress={finishDeletion}
        disabled={isRetrying}
        className="bg-red-600 rounded-xl py-3 px-5 min-w-48 items-center"
      >
        {isRetrying ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-white font-semibold">Retry account deletion</Text>
        )}
      </Pressable>
      {requiresSignInAgain ? (
        <Pressable
          onPress={async () => {
            try {
              await signOut();
              clearUserSyncCache();
            } catch (error) {
              console.error("Sign out for account reverification failed", error);
              setFailureMessage(
                "We couldn't sign you out. Check your connection and retry."
              );
            }
          }}
          disabled={isRetrying}
          className="py-3 px-5 mt-2"
        >
          <Text className="text-primary font-semibold">
            Sign out to verify again
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
