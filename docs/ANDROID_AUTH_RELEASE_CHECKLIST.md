# Android authentication release checklist

This checklist covers the Clerk/Convex account lifecycle for the production
Android release.

## Automated gates

Run before creating a store build:

```sh
npm run check:auth-release
npx tsc --noEmit
node --test tests/*.test.mjs
```

The auth release check enforces these repository invariants:

- Clerk session tokens use Clerk's `tokenCache`, which is backed by
  `expo-secure-store` on native devices.
- `ConvexProviderWithClerk` is the only owner of Convex token refresh. Do not
  add a second `convex.setAuth` effect.
- Account deletion has a durable Convex deletion marker, prevents automatic
  user recreation, and has a restart-safe retry screen.
- The deletion marker retains only a one-way SHA-256 digest of the Clerk user
  ID. Document this narrow integrity retention in the privacy policy and define
  the operational removal process after support confirms any failed deletion.
- The in-app flow invokes Clerk's supported `User.delete()` API.
- Clerk can require a fresh factor verification for account deletion. The
  recovery UI directs the user to sign out, sign in again, and resume from the
  durable deletion marker instead of repeating Convex deletion.

## Clerk production instance

Complete these checks in the **production** Clerk instance:

- Native API is enabled.
- User & authentication > User model > **Allow users to delete their
  accounts** is enabled. The app checks `deleteSelfEnabled` before deleting any
  Convex data, so a disabled setting becomes a visible configuration failure
  rather than a partially deleted account.
- The production publishable key is used by the production EAS environment.
- The production Clerk issuer configured in `convex/auth.config.ts` is deployed
  to the production Convex deployment.
- Test email-code, Google OAuth, sign-out, relaunch/session restoration,
  temporary network failure, and account deletion on a physical Android
  production-profile build.

Clerk references:

- Expo secure token cache:
  https://clerk.com/docs/expo/getting-started/quickstart
- JavaScript `User.delete()`:
  https://clerk.com/docs/reference/clerkjs/user
- User self-deletion setting:
  https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options
- Convex provider token lifecycle:
  https://docs.convex.dev/auth/clerk

## Google Play external requirement

The in-app implementation does **not** satisfy the entire Play policy by
itself. Before production rollout:

1. Publish a functional web resource where a former user can request deletion
   without reinstalling the app.
2. Make the deletion path prominent and identify **Sapta Gita** or the exact
   developer name used in the Play listing.
3. State which associated data is deleted and disclose any data retained for a
   legitimate reason and its retention period.
4. Enter that URL in Play Console > App content > Data safety > Data deletion.
5. Verify the public URL in a signed-out/incognito browser and submit a real
   deletion request through the support process.

Official Play requirement:
https://support.google.com/googleplay/android-developer/answer/13327111

This external deletion page and its operational support workflow are release
blockers that cannot be created or verified by the mobile repository alone.
