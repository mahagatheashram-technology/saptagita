# Webapp Notes (branch: `webapp`)

Purpose: mobile-friendly web build on Vercel while keeping native builds intact.

Environment:
- Branch: `webapp`
- Convex (prod): `https://quick-tiger-684.convex.cloud`
- Clerk publishable key: test key in `.env.production` / Vercel envs
- Vercel config: `vercel.json` with SPA rewrite, build `npm run export:web`, output `dist-web`

Recent web-specific changes:
- Web-safe notifications/haptics/share fallbacks (`lib/notifications.ts`, `lib/haptics.ts`, `lib/shareText.ts`)
- Welcome screen centered and responsive (`app/welcome.tsx`)
- Today screen web fallback: static card with explicit actions (no gesture) (`components/verses/CardStack.tsx`)

Known issues to track (web):
- Today card actions: ensure a single set of buttons, make them clickable, avoid duplication
- Card spacing: keep full card visible above bottom bar (add bottom padding)
- Welcome/sign-in vertical centering for mobile Safari

Flow to build/deploy web:
1) `npm run export:web` (outputs `dist-web`)
2) Vercel deploy from `webapp` branch with env vars (`EXPO_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_JWT_ISSUER_DOMAIN`)
3) Allow Vercel domain in Clerk allowed origins/redirects
