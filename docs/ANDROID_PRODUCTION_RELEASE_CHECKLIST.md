# Android Production Release Checklist

Release candidate: Sapta Gita `1.0.2` (`versionCode` 3)

Package: `com.mahagathe.saptagita`

Build profile: EAS `production`

This checklist prepares a release but does not authorize a build, submission,
backend deployment, or Play Console change.

## 1. Choose the artifact path

Choose exactly one path before changing Play:

- **Promote the tested artifact:** Promote the existing closed-test
  `versionCode` 2 artifact without rebuilding it. This preserves the exact
  binary testers used. The `1.0.2`/code 3 metadata in this branch does not
  change that uploaded artifact.
- **Create the next artifact:** Use this branch to build the new
  `1.0.2`/code 3 AAB. Send that exact AAB through internal/closed testing and
  review its automated results before production. Do not describe it as the
  previously tested code 2 binary.

Record the chosen version code, EAS build URL/ID, AAB SHA-256, source commit,
tester track, and Play release name in the release record.

## 2. Pre-build gates

- [ ] Merge all approved release fixes and verify a clean source commit.
- [ ] Run `npx tsc --noEmit`.
- [ ] Use the Node version declared by `.nvmrc` (or a newer supported version)
      and run `npm test`.
- [ ] Run `npm run check:env-parity`.
- [ ] Run `npx expo-doctor` and disposition every warning.
- [ ] Confirm resolved Expo config reports version `1.0.2`, Android
      `versionCode` 3, and package `com.mahagathe.saptagita`.
- [ ] Confirm resolved EAS production config is a store/AAB build using the
      existing EAS project, remote signing credentials, production Clerk
      publishable key, and production Convex URL. Do not rotate credentials.
- [ ] If the release includes the Social ranking backend, an authorized backend
      owner must deploy it and complete
      `docs/GLOBAL_STREAK_RANKING_RUNBOOK.md` before Android rollout. Record the
      deployment and backfill evidence; do not treat the mobile build as
      authorization for backend changes.
- [ ] Smoke-test sign-up/sign-in, Today completion, bookmarks, streaks,
      notifications, offline/reconnect, sign-out, and in-app account deletion
      on a release build.

### Physical Android smoke test with Expo Go

Before creating or promoting the production AAB:

1. Install the current Expo Go release that supports SDK 54 on the Android
   device.
2. Put the computer and phone on the same Wi-Fi network.
3. From the release branch, run `npm run start:go:clean` and scan the printed QR
   code with Expo Go.
4. If the LAN connection is blocked by the network, stop Metro and run
   `npm run start:go:tunnel` instead.
5. Verify cold start, email-code and Google sign-in, daily reading and
   completion, bookmarks, community membership, reminder settings, sign-out,
   relaunch/session restoration, and account deletion.

Expo Go does not apply custom native config plugins and cannot validate the
final Play-signed Android binary. Repeat the release-critical smoke test on the
production-profile AAB before rollout.

## 3. Build and closed-test verification

For a new artifact, an authorized release owner runs:

```bash
eas build --platform android --profile production
```

- [ ] Verify EAS produced an AAB with package
      `com.mahagathe.saptagita`, version `1.0.2`, and code 3.
- [ ] Install through Play internal/closed testing; do not rely only on a local
      debug or APK build.
- [ ] Review Play's pre-launch report for crashes, ANRs, accessibility,
      security, and device compatibility. Resolve or explicitly accept every
      issue.
- [ ] Verify upgrade behavior from the currently tested code 2 artifact and
      verify a fresh install on at least one supported Android version.

## 4. Play declarations and submission

- [ ] Reconcile Play **Data safety** answers with actual collection, sharing,
      encryption, retention, authentication, analytics, notification, and
      account-deletion behavior. Do not copy prior answers without checking the
      release.
- [ ] Confirm the store listing privacy-policy URL is public, accurate, and
      reachable without authentication.
- [ ] Confirm Play's account-deletion declaration includes both the in-app
      Profile deletion flow and a working public web deletion-request URL.
      Verify deletion covers Clerk identity and associated Convex user data,
      and documents any legally required retention.
      Current verified URL:
      `https://sapta-gita-account-deletion.ynsameer.chatgpt.site`.
- [ ] Complete content rating, ads, target audience, app access/reviewer
      instructions, and any other Play policy forms shown for this release.
- [ ] Upload/submit only the recorded artifact. If using EAS Submit, the
      authorized release owner runs:

```bash
eas submit --platform android --profile production --latest
```

- [ ] In Play Console, verify package, signing certificate, version code,
      countries, release notes, and artifact before confirming the release.

## 5. Staged rollout and monitoring

- [ ] Start production at **5–10%**, not 100%.
- [ ] Observe at least 24 hours and a representative number of sessions before
      increasing the rollout; repeat review at each increase.
- [ ] Monitor Play Android vitals, crash/ANR reports, user feedback, and install
      and upgrade success.
- [ ] Monitor Convex function failures, latency, database I/O, calls, storage,
      and concurrency. Investigate unexpected full-table reads or rapid
      movement toward Free-plan quotas.
- [ ] Monitor Clerk sign-in/sign-up failure reports, active-user usage, and
      auth/account-deletion errors. Confirm the production Clerk instance is
      receiving the expected traffic.

Pause the rollout immediately for a reproducible data-loss/cross-user access
issue, broken authentication or account deletion, startup/upgrade failure,
backend error spike, crash/ANR regression, or projected Convex/Clerk quota
exhaustion. Record an incident owner and preserve logs/build IDs. Play cannot
downgrade installed users to code 2; remediation requires halting the rollout
and shipping a fixed build with a version code greater than 3.

## 6. Post-release verification

- [ ] Install from the production listing with a new account and upgrade an
      existing code 2 installation.
- [ ] Repeat the core smoke flows and verify notifications after an app
      restart.
- [ ] Confirm new user, reading, bookmark, and deletion activity appears only
      in the intended production Convex and Clerk instances.
- [ ] After supported alpha installations have upgraded, disable the temporary
      legacy alpha compatibility bridge with
      `npx convex env remove ALLOW_LEGACY_ALPHA_UNAUTHENTICATED_ACCESS --prod`.
      Also remove the superseded `ALLOW_LEGACY_EXISTING_USER_SYNC` flag if it
      remains set. Verify an
      unauthenticated `users:getOrCreateUserFromAuth` call is rejected with
      `UNAUTHENTICATED`, while an installed production build still syncs.
- [ ] Confirm Play vitals and backend dashboards remain healthy after 24 and
      72 hours before completing rollout.
- [ ] Archive the approved commit, EAS build ID, Play release ID, final rollout
      timeline, policy declarations, known issues, and verification results.
