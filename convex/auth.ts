import { ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

type AuthContext = {
  auth: Pick<QueryCtx["auth"], "getUserIdentity">;
  db: Pick<QueryCtx["db"], "get" | "query">;
};

export const LEGACY_ALPHA_AUTH_ENV =
  "ALLOW_LEGACY_ALPHA_UNAUTHENTICATED_ACCESS";

export function isLegacyAlphaAuthEnabled() {
  return process.env[LEGACY_ALPHA_AUTH_ENV] === "true";
}

export async function requireIdentity(ctx: AuthContext) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "Authentication is required.",
    });
  }
  return identity;
}

export async function requireCurrentUser(
  ctx: AuthContext
): Promise<Doc<"users">> {
  const identity = await requireIdentity(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("byAuthId", (q) => q.eq("authId", identity.subject))
    .first();

  if (!user) {
    throw new ConvexError({
      code: "USER_NOT_SYNCED",
      message: "Your account is not synced yet. Please sign in again.",
    });
  }

  return user;
}

export async function requireOwnedUser(
  ctx: AuthContext,
  requestedUserId: Id<"users">
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity && isLegacyAlphaAuthEnabled()) {
    const legacyUser = await ctx.db.get(requestedUserId);
    if (!legacyUser) {
      throw new ConvexError({
        code: "USER_NOT_FOUND",
        message: "User not found.",
      });
    }
    return legacyUser as Doc<"users">;
  }

  const user = await requireCurrentUser(ctx);
  if (String(user._id) !== String(requestedUserId)) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "You cannot access another user's data.",
    });
  }
  return user;
}

export function assertIdentitySubject(
  identitySubject: string,
  requestedAuthId?: string
) {
  if (requestedAuthId && requestedAuthId !== identitySubject) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "The requested account does not match the authenticated user.",
    });
  }
}
