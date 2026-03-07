# Android Handoff (Webapp Parity + iOS-Style Interactions)

Last updated: 2026-03-04  
Workspace: `/Volumes/NithinSameer/Personal/Mahagathe/sapta-gita`

## 1. Goal

Build an Android version that:

- Matches **webapp** feature set (Library/Read, updated streak model, profile/calendar changes, web-driven product learnings)
- Keeps native interaction style from iOS (gesture/swipe card behavior on Today screen)
- Produces a downloadable **APK** for user testing

## 2. Branch Research Summary

Compared branches:

- `main` (iOS baseline): `87c5195`
- `webapp` (current web branch): `b615c3e`

Git relationship:

- `webapp` is **16 commits ahead** of `main`
- `main` is **1 commit ahead** of `webapp`, and that commit is only: `chore: normalize trailing newlines` (no functional feature impact)

### Recommended base branch for Android work

Use **`webapp`** as the base.

Reason:

1. It already contains all new product-level features you want parity with.
2. Native swipe/gesture card behavior is still present for non-web platforms.
3. It already has platform split patterns (`Platform.OS === "web"` and `*.web.tsx`) so Android naturally uses native paths.

## 3. What `webapp` Added Beyond `main` (Feature Delta)

## A) Library expansion (major)

- Bookmarks tab evolved into **Library** with segmented control: `Bookmarks | Read`
- New Read list of verses, progress meter, read metadata, and detail actions
- New components/hooks:
  - `components/library/ReadVerseRow.tsx`
  - `components/library/ReadVerseDetailSheet.tsx`
  - `lib/hooks/useReadHistory.ts`

## B) Reading/streak backend model upgrades (major)

- Sequential pointer now aligned with actual read history (`sequenceInitialized`)
- Read events now support `kind: "sequence" | "reread"`
- Added `logReread` mutation
- Added `getReadVerses` query for Library/Read tab
- Streak logic upgraded to track **first read of day** (`lastReadLocalDate`) instead of completion-only streaking

Schema changes:

- `userState.sequenceInitialized`
- `readEvents.kind`
- `streaks.lastReadLocalDate`

## C) Profile and progress UX improvements

- Calendar split into **Read days** vs **Perfect days**
- Streak stats now emphasize **Perfect** days
- Added **Reset reading progress** setting

## D) Cross-platform share/haptics/notifications wrappers

- New wrappers:
  - `lib/haptics.ts`
  - `lib/shareText.ts`
- Notifications refactored to be web-safe via dynamic imports and platform guards

## E) Web-specific deployment work (context only)

- Added web export script and Vercel config:
  - `package.json` -> `export:web`
  - `vercel.json`

## 4. iOS-Style Gesture Requirement Status

Requirement: Android should mimic iOS card swiping/gestures.

Status from code:

- `components/verses/SwipeableCard.tsx` still handles gesture-driven swipes for native.
- `components/verses/CardStack.tsx` has a web-only branch (`Platform.OS === "web"`) that uses button actions instead of gestures.
- Therefore Android (native) will use swipe/gesture behavior, not the web fallback.

Conclusion: current architecture already supports this requirement if Android is built from `webapp`.

## 5. Known Blockers To Fix First (before Android execution/build)

`npx tsc --noEmit` currently fails on `webapp` with:

1. Typed route mismatch:
   - `app/(tabs)/bookmarks.tsx`
   - `router.push("/(tabs)/index")` is not accepted by Expo typed routes
2. Notification refactor typing/runtime guards:
   - `lib/notifications.ts`
   - `Device` reference is invalid after refactor (dynamic import mismatch)
   - `Notifications` nullable typing issues in `scheduleDailyReminder`

These should be fixed first so Android work proceeds on a stable baseline.

## 6. Android Execution Plan (for new chat)

## Phase 0: Branch setup

1. Checkout `webapp`
2. Create Android work branch from it

Suggested branch name:

- `codex/android-webapp-parity-apk`

Commands:

```bash
git checkout webapp
git pull
git checkout -b codex/android-webapp-parity-apk
```

## Phase 1: Stabilize branch

1. Fix TypeScript errors listed above
2. Run:
   - `npx tsc --noEmit`
   - `npm run lint` (if configured)
3. Smoke test core flows locally:
   - Today swipes (right = mark read, left = action drawer)
   - Library Bookmarks tab
   - Library Read tab and detail sheet actions
   - Profile calendar/streak stats/settings

## Phase 2: Android parity validation

On Android device/emulator:

1. Swipe responsiveness and card animation parity with iOS
2. Bottom sheet behavior (ActionDrawer, ReadVerseDetailSheet)
3. Haptics behavior (degrades gracefully if unavailable)
4. Share flow behavior
5. Reminder settings and permissions behavior
6. No web-only UI leaks into Android

## Phase 3: Build APK

Use EAS internal distribution profile (`preview`) and force APK output if needed.

Check `eas.json`:

- `preview.distribution` is already `"internal"`
- If APK is not produced, set:
  - `build.preview.android.buildType = "apk"`

Build command:

```bash
eas build --platform android --profile preview
```

Deliverable:

- Shareable APK install link for testers

## Phase 4: Optional Google Play prep (later)

1. Google Play developer account ($25 one-time fee)
2. Move to AAB + production signing/release flow
3. Add store listing assets and policy declarations

## 7. Important File Map For Fast Re-entry

Today/native interactions:

- `app/(tabs)/index.tsx`
- `components/verses/CardStack.tsx`
- `components/verses/SwipeableCard.tsx`
- `components/verses/ActionDrawer.tsx`
- `components/verses/ActionDrawer.web.tsx`

Library/Read:

- `app/(tabs)/bookmarks.tsx`
- `components/library/ReadVerseRow.tsx`
- `components/library/ReadVerseDetailSheet.tsx`
- `lib/hooks/useReadHistory.ts`

Backend reading + streak:

- `convex/dailySets.ts`
- `convex/streaks.ts`
- `convex/schema.ts`
- `convex/users.ts`

Profile:

- `app/(tabs)/profile.tsx`
- `components/profile/ReadingCalendar.tsx`
- `components/profile/StreakStatsCard.tsx`
- `components/profile/SettingsSection.tsx`

Cross-platform wrappers:

- `lib/haptics.ts`
- `lib/shareText.ts`
- `lib/notifications.ts`
- `app/_layout.tsx`

Build/deploy config:

- `eas.json`
- `package.json`
- `vercel.json`

## 8. Paste-Ready Prompt For New Chat

Use this in the next chat:

```text
Continue from docs/ANDROID_HANDOFF.md in /Volumes/NithinSameer/Personal/Mahagathe/sapta-gita.

Task:
1) Create/checkout branch codex/android-webapp-parity-apk from webapp.
2) Fix current TypeScript blockers called out in the handoff.
3) Validate Android native behavior parity (especially Today swipe gestures).
4) Prepare and run EAS Android build to produce a downloadable APK.
5) Give me the exact test/install steps and any remaining risks.
```

