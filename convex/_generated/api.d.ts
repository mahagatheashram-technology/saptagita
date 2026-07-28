/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as bookmarks from "../bookmarks.js";
import type * as communities from "../communities.js";
import type * as dailySets from "../dailySets.js";
import type * as debug from "../debug.js";
import type * as maintenanceAuth from "../maintenanceAuth.js";
import type * as streakMath from "../streakMath.js";
import type * as streaks from "../streaks.js";
import type * as users from "../users.js";
import type * as validators from "../validators.js";
import type * as verses from "../verses.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  bookmarks: typeof bookmarks;
  communities: typeof communities;
  dailySets: typeof dailySets;
  debug: typeof debug;
  maintenanceAuth: typeof maintenanceAuth;
  streakMath: typeof streakMath;
  streaks: typeof streaks;
  users: typeof users;
  validators: typeof validators;
  verses: typeof verses;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
