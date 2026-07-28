import { ConvexError } from "convex/values";

export function assertMaintenanceToken(token: string) {
  const expected = process.env.ADMIN_MAINTENANCE_TOKEN;
  if (!expected) {
    throw new ConvexError({
      code: "MAINTENANCE_DISABLED",
      message: "Maintenance operations are disabled on this deployment.",
    });
  }
  if (token !== expected) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Invalid maintenance credentials.",
    });
  }
}
