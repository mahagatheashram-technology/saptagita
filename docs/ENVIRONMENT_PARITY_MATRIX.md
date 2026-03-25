# Environment Parity Matrix

This document is the source of truth for MAH-17 / MAH-18 / MAH-19 triage.

## Build Profiles

| Build Profile | Clerk Instance | Convex Deployment | Expected Data Set | Notes |
| --- | --- | --- | --- | --- |
| `development` | Live Clerk (managed via EAS env) | `quick-tiger-684` | Shipping-like | Use for parity debugging only |
| `preview` | Live Clerk (managed via EAS env) | `quick-tiger-684` | Shipping-like | Primary APK validation target |
| `production` | Live Clerk (managed via EAS env) | `quick-tiger-684` | Shipping | Release channel |
| local dev override (`.env.local.dev`) | Dev Clerk test keys | `joyous-warthog-33` | Dev-only | Do not use for bug acceptance |

## Required Variables

| Variable | Location | Required Value Shape |
| --- | --- | --- |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | EAS managed env (`development`, `preview`, `production`) | `pk_live_*` |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex deployment env + local `convex/.env.local` | `https://<live-clerk-domain>` |
| `EXPO_PUBLIC_CONVEX_URL` | `eas.json` build profile `env` | `https://quick-tiger-684.convex.cloud` |
| `CONVEX_DEPLOYMENT` | `.env.local` | `prod:quick-tiger-684` for parity mode |

## Setup Checklist

1. Set live Clerk keys/issuer in EAS environments for `development`, `preview`, and `production`.
2. Set `CLERK_JWT_ISSUER_DOMAIN` on the shipping Convex deployment to the same live Clerk issuer.
3. Confirm `.env.local` points to `quick-tiger-684` when running parity checks.
4. Keep `.env.local.dev` for isolated dev experiments only.
5. Run `npm run check:env-parity` before creating a preview/prod build.

## Quick Validation Commands

```bash
npm run check:env-parity
```

If this check fails, do not continue with bug acceptance testing.
