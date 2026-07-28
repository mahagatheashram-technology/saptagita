import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireCurrentUser, requireOwnedUser } from "./auth";
import { communityValidator } from "./validators";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No 0,O,1,I for clarity
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function resolveUser(ctx: any, userId?: Id<"users">) {
  return userId
    ? await requireOwnedUser(ctx, userId)
    : await requireCurrentUser(ctx);
}

async function upsertActiveCommunity(
  ctx: any,
  userId: Id<"users">,
  communityId: Id<"communities">
) {
  const existingActive = await ctx.db
    .query("activeCommunity")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  if (existingActive) {
    await ctx.db.patch(existingActive._id, { communityId });
  } else {
    await ctx.db.insert("activeCommunity", {
      userId,
      communityId,
    });
  }
}

export const createCommunity = mutation({
  args: {
    name: v.string(),
    type: v.union(v.literal("public"), v.literal("private")),
    userId: v.optional(v.id("users")),
  },
  returns: v.object({
    communityId: v.id("communities"),
    inviteCode: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const user = await resolveUser(ctx, args.userId);

    const name = args.name.trim();
    if (name.length < 3 || name.length > 30) {
      throw new Error("Name must be 3-30 characters");
    }

    const inviteCode = args.type === "private" ? generateInviteCode() : undefined;

    const communityId = await ctx.db.insert("communities", {
      name,
      type: args.type,
      inviteCode,
      createdBy: user._id,
      createdAt: Date.now(),
    });

    await ctx.db.insert("communityMembers", {
      communityId,
      userId: user._id,
      role: "owner",
      joinedAt: Date.now(),
    });

    await upsertActiveCommunity(ctx, user._id, communityId);

    return { communityId, inviteCode };
  },
});

export const getUserCommunities = query({
  args: {
    userId: v.optional(v.id("users")),
  },
  returns: v.array(
    v.object({
      _id: v.id("communities"),
      name: v.string(),
      type: v.union(v.literal("public"), v.literal("private")),
      inviteCode: v.optional(v.string()),
      role: v.union(
        v.literal("owner"),
        v.literal("admin"),
        v.literal("member")
      ),
      memberCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await resolveUser(ctx, args.userId);

    const memberships = await ctx.db
      .query("communityMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const communities = await Promise.all(
      memberships.map(async (membership) => {
        const community = await ctx.db.get(membership.communityId);
        if (!community) return null;

        const members = await ctx.db
          .query("communityMembers")
          .withIndex("by_community", (q) =>
            q.eq("communityId", membership.communityId)
          )
          .collect();

        return {
          _id: community._id,
          name: community.name,
          type: community.type,
          inviteCode: community.inviteCode,
          role: membership.role,
          memberCount: members.length,
        };
      })
    );

    return communities.filter(
      (community): community is NonNullable<typeof community> => Boolean(community)
    );
  },
});

export const getActiveCommunity = query({
  args: {
    userId: v.optional(v.id("users")),
  },
  returns: v.union(communityValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await resolveUser(ctx, args.userId);

    const active = await ctx.db
      .query("activeCommunity")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!active) return null;

    return await ctx.db.get(active.communityId);
  },
});

export const setActiveCommunity = mutation({
  args: {
    communityId: v.union(v.id("communities"), v.null()),
    userId: v.optional(v.id("users")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await resolveUser(ctx, args.userId);

    const existing = await ctx.db
      .query("activeCommunity")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const communityId = args.communityId;

    if (communityId === null) {
      if (existing) {
        await ctx.db.delete(existing._id);
      }
      return null;
    }

    const membership = await ctx.db
      .query("communityMembers")
      .withIndex("by_community_user", (q) =>
        q.eq("communityId", communityId).eq("userId", user._id)
      )
      .first();

    if (!membership) throw new Error("Not a member of this community");

    if (existing) {
      await ctx.db.patch(existing._id, { communityId });
    } else {
      await ctx.db.insert("activeCommunity", {
        userId: user._id,
        communityId,
      });
    }
    return null;
  },
});

export const getPublicCommunities = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("communities"),
      name: v.string(),
      type: v.union(v.literal("public"), v.literal("private")),
      memberCount: v.number(),
    })
  ),
  handler: async (ctx) => {
    await requireCurrentUser(ctx);
    const communities = await ctx.db
      .query("communities")
      .withIndex("by_type", (q) => q.eq("type", "public"))
      .order("desc")
      .take(50);

    const communitiesWithCounts = await Promise.all(
      communities.map(async (community) => {
        const members = await ctx.db
          .query("communityMembers")
          .withIndex("by_community", (q) =>
            q.eq("communityId", community._id)
          )
          .collect();

        return {
          _id: community._id,
          name: community.name,
          type: community.type,
          memberCount: members.length,
        };
      })
    );

    return communitiesWithCounts;
  },
});

export const joinPublicCommunity = mutation({
  args: {
    communityId: v.id("communities"),
    userId: v.optional(v.id("users")),
  },
  returns: v.object({
    success: v.boolean(),
    communityName: v.string(),
  }),
  handler: async (ctx, args) => {
    const user = await resolveUser(ctx, args.userId);

    const community = await ctx.db.get(args.communityId);
    if (!community) throw new Error("Community not found");
    if (community.type !== "public") {
      throw new Error("Cannot join private community without invite code");
    }

    const existing = await ctx.db
      .query("communityMembers")
      .withIndex("by_community_user", (q) =>
        q.eq("communityId", args.communityId).eq("userId", user._id)
      )
      .first();

    if (existing) throw new Error("Already a member");

    await ctx.db.insert("communityMembers", {
      communityId: args.communityId,
      userId: user._id,
      role: "member",
      joinedAt: Date.now(),
    });

    await upsertActiveCommunity(ctx, user._id, args.communityId);

    return { success: true, communityName: community.name };
  },
});

export const joinByInviteCode = mutation({
  args: {
    inviteCode: v.string(),
    userId: v.optional(v.id("users")),
  },
  returns: v.object({
    success: v.boolean(),
    communityName: v.string(),
  }),
  handler: async (ctx, args) => {
    const user = await resolveUser(ctx, args.userId);

    const code = args.inviteCode.trim().toUpperCase();
    if (!code) throw new Error("Invite code is required");

    const community = await ctx.db
      .query("communities")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", code))
      .first();

    if (!community) throw new Error("Invalid invite code");

    const existing = await ctx.db
      .query("communityMembers")
      .withIndex("by_community_user", (q) =>
        q.eq("communityId", community._id).eq("userId", user._id)
      )
      .first();

    if (existing) throw new Error("Already a member");

    await ctx.db.insert("communityMembers", {
      communityId: community._id,
      userId: user._id,
      role: "member",
      joinedAt: Date.now(),
    });

    await upsertActiveCommunity(ctx, user._id, community._id);

    return { success: true, communityName: community.name };
  },
});

export const leaveCommunity = mutation({
  args: {
    communityId: v.id("communities"),
    userId: v.optional(v.id("users")),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const user = await resolveUser(ctx, args.userId);

    const membership = await ctx.db
      .query("communityMembers")
      .withIndex("by_community_user", (q) =>
        q.eq("communityId", args.communityId).eq("userId", user._id)
      )
      .first();

    if (!membership) throw new Error("Not a member");
    if (membership.role === "owner") {
      throw new Error(
        "Owner cannot leave. Transfer ownership or delete the community."
      );
    }

    await ctx.db.delete(membership._id);

    const activeRecord = await ctx.db
      .query("activeCommunity")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (activeRecord && activeRecord.communityId === args.communityId) {
      await ctx.db.delete(activeRecord._id);
    }

    return { success: true };
  },
});
