# Web release 1.0.4

## Branches and source

- Release: `codex/release-webapp-1.0.4`, created from `origin/webapp` at `5ca5c00`.
- Feature: `codex/feature-webapp-1.0.4-parity`, created from that web release.
- Snapshot commit: `ca67b50`, copies the tracked tree of Android release `08b3cee`.
- No Android release merge or ancestry was introduced. The Android release remains available for its separate merge into `Android`.
- The web release branch remains at its original baseline until the feature is reviewed and merged.

## Browser adaptations

- Restored Today-card audio, retaining explicit Previous / Mark as read, Save, and Share controls. Audio resets when switching verses; controls respect the interaction lock.
- Ported leave/delete/transfer community controls into the web dropdown, retaining its modal positioning and constraining it to the viewport.
- Replaced no-op React Native Web alerts with an accessible HTML modal dialog. Existing named actions, errors, confirmations, cancellation, and nested dialogs now work in browsers. Native builds still use React Native Alert.
- Added a web-only Google redirect flow using Clerk's installed `authenticateWithRedirect` API, `/sso-callback`, and a completion screen for additional signup requirements. Native Google SSO remains separate.
- Added a centered, scrollable web sign-in layout and consistent light background / safe-area viewport settings.
- Made the complete Social page scroll on web, including its header, reader count,
  search, leaderboard, Top 50 action, and foundation footer. Community leaderboard
  rows render inside the page scroll instead of creating a nested scroll region.
- Replaced the bookmark-only web bottom sheet with a stable, scrollable modal.
  Selecting a saved verse now keeps that verse mounted while the detail view opens,
  and the content and actions remain accessible above the browser and tab bars.
  The native bookmark sheet and the already-working Read-tab sheet are unchanged.

Clerk API reference for the installed SDK generation: https://clerk.com/docs/guides/development/custom-flows/authentication/legacy/oauth-connections

## Hosting and authentication

`npm run export:web` produces `dist-web`. Vercel's existing configuration serves this directory with an SPA fallback. Static export includes `/sso-callback` and `/sign-up`.

The existing production publishable key is restricted to `mahagathe.org` and its subdomains. A localhost browser check on 2026-09-05 returned Clerk's explicit production-domain restriction. A successful Vercel build alone does not verify login on a `vercel.app` preview URL.

Use an appropriately configured `mahagathe.org` staging hostname with the live instance, or an isolated Clerk/Convex development pair for preview testing. Verify the actual target domain, callback behavior, and environment before release. Do not weaken the shipping environment checks or mix a test Clerk identity provider with the production database.

The current production Convex URL in project configuration is `https://quick-tiger-684.convex.cloud`. Backend source was copied for parity; no Convex deployment, migration, seed, or production-data mutation was performed. Verify deployed backend compatibility separately before publishing this client. Never deploy the old web branch's backend over the current release backend.

## Validation and remaining acceptance

- Node 22.18.0; dependency installation from the committed lockfile.
- TypeScript `--noEmit` passes.
- All 100 tests pass (94 existing plus six dialog tests covering cancellation, action selection, duplicate callbacks, nested queues, and server rendering).
- Production web export passes, with 18 static routes.
- Production web export passes after the Social and bookmark-detail fixes; the
  generated web bundle contains the web-only bookmark modal.
- Chromium isolated-dialog check: owner menu opens, delete requires a second confirmation, Escape cancels without invoking the action and restores focus.
- Chromium mobile viewport (390 × 844): sign-in layout renders with no console errors when local assets are served through a browser-only route interception on an allowed-domain test origin. No DNS or hosting configuration was changed. Empty-email validation opens the real web dialog; no verification email was sent.
- Real-account Google/email sign-in, reading/streak synchronization, audio on iPhone Safari, saved collections, user search, and community lifecycle flows still require end-to-end acceptance on a configured preview environment.
- Browser notification reminders remain explicitly unavailable; browser push/PWA support is outside this initial parity pass.

No production web deployment is part of this work. The next merge target for this feature is the web release branch, followed by `webapp` after acceptance.
