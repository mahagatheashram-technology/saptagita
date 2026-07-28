export type AccountDeletionPhase =
  | "configuration"
  | "reauthentication"
  | "app_data"
  | "clerk_identity"
  | "sign_out";

export interface AccountDeletionCheckpoint {
  appDataDeleted: boolean;
  clerkIdentityDeleted: boolean;
  signedOut: boolean;
}

export interface AccountDeletionFailure {
  ok: false;
  phase: AccountDeletionPhase;
  checkpoint: AccountDeletionCheckpoint;
  message: string;
  cause: unknown;
  requiresSignInAgain: boolean;
}

export interface AccountDeletionSuccess {
  ok: true;
  checkpoint: AccountDeletionCheckpoint;
}

export type AccountDeletionResult =
  | AccountDeletionFailure
  | AccountDeletionSuccess;

export interface AccountDeletionOperations {
  canDeleteClerkIdentity: boolean;
  requiresRecentSignIn?: boolean;
  deleteAppData: () => Promise<unknown>;
  deleteClerkIdentity: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const EMPTY_DELETION_CHECKPOINT: AccountDeletionCheckpoint = {
  appDataDeleted: false,
  clerkIdentityDeleted: false,
  signedOut: false,
};

function clerkErrorCode(cause: unknown): string | null {
  if (!cause || typeof cause !== "object") return null;
  const error = cause as {
    code?: unknown;
    errors?: Array<{ code?: unknown }>;
  };
  const code = error.errors?.[0]?.code ?? error.code;
  return typeof code === "string" ? code : null;
}

function failureMessage(
  phase: AccountDeletionPhase,
  requiresSignInAgain = false
): string {
  if (requiresSignInAgain) {
    return "Clerk requires a recent identity check to delete this account. Sign out, sign in again, then retry account deletion.";
  }

  switch (phase) {
    case "configuration":
      return "Account deletion is not enabled in the authentication service. Your data has not been deleted. Please contact support.";
    case "reauthentication":
      return "For your security, sign out and sign in again before deleting your account. Your data has not been deleted.";
    case "app_data":
      return "We could not delete your app data. Nothing else was deleted. Check your connection and retry.";
    case "clerk_identity":
      return "Your app data was deleted, but your sign-in identity still exists. Retry to finish account deletion.";
    case "sign_out":
      return "Your account was deleted, but local sign-out cleanup did not finish. Retry sign out or restart the app.";
  }
}

/**
 * Runs the two-provider deletion workflow in a resumable order.
 *
 * Convex data is removed first in the same transaction as a durable deletion
 * marker. That marker prevents user sync from recreating data if Clerk is
 * temporarily unavailable. The returned checkpoint lets the UI retry only the
 * unfinished stage.
 */
export async function runAccountDeletion(
  operations: AccountDeletionOperations,
  previous: AccountDeletionCheckpoint = EMPTY_DELETION_CHECKPOINT
): Promise<AccountDeletionResult> {
  let checkpoint = { ...previous };

  if (
    !checkpoint.clerkIdentityDeleted &&
    !operations.canDeleteClerkIdentity
  ) {
    return {
      ok: false,
      phase: "configuration",
      checkpoint,
      message: failureMessage("configuration"),
      cause: new Error("Clerk self-service account deletion is disabled"),
      requiresSignInAgain: false,
    };
  }

  if (
    !checkpoint.appDataDeleted &&
    operations.requiresRecentSignIn
  ) {
    return {
      ok: false,
      phase: "reauthentication",
      checkpoint,
      message: failureMessage("reauthentication"),
      cause: new Error("A recent Clerk factor verification is required"),
      requiresSignInAgain: true,
    };
  }

  if (!checkpoint.appDataDeleted) {
    try {
      await operations.deleteAppData();
      checkpoint = { ...checkpoint, appDataDeleted: true };
    } catch (cause) {
      return {
        ok: false,
        phase: "app_data",
        checkpoint,
        message: failureMessage("app_data"),
        cause,
        requiresSignInAgain: false,
      };
    }
  }

  if (!checkpoint.clerkIdentityDeleted) {
    try {
      await operations.deleteClerkIdentity();
      checkpoint = { ...checkpoint, clerkIdentityDeleted: true };
    } catch (cause) {
      const requiresSignInAgain =
        clerkErrorCode(cause) === "session_reverification_required";
      return {
        ok: false,
        phase: "clerk_identity",
        checkpoint,
        message: failureMessage("clerk_identity", requiresSignInAgain),
        cause,
        requiresSignInAgain,
      };
    }
  }

  if (!checkpoint.signedOut) {
    try {
      await operations.signOut();
      checkpoint = { ...checkpoint, signedOut: true };
    } catch (cause) {
      return {
        ok: false,
        phase: "sign_out",
        checkpoint,
        message: failureMessage("sign_out"),
        cause,
        requiresSignInAgain: false,
      };
    }
  }

  return { ok: true, checkpoint };
}
