# Sapta Gita - Development Changelog

> **Instructions:** Agent appends to this file after completing each task. Most recent entries at top.

## Task 3.1: Clerk Auth Integration (Stabilized)
**Date:** 2026-01-04  
**Status:** ✅ Complete

### What Was Built
- Finalized Clerk auth routing with sign-in/sign-up screens (Google + email OTP) and protected navigation.
- Synced Clerk sessions into Convex with stable user creation and account-aware loading states.
- Added sign-out UI and dev-only gating for the DevPanel.

### Files Modified
- `app/_layout.tsx` - Auth routing and provider wiring stabilization
- `app/sign-in.tsx`, `app/sign-up.tsx` - Auth screens updated to Google + email
- `lib/hooks/useCurrentUser.ts` - Error logging and sync stability
- `app/(tabs)/index.tsx`, `app/(tabs)/profile.tsx` - User sync error handling and sign out

### Issues Resolved
- Prevented auth routing loops and clarified sign-in flow; app now reaches tabs after successful Clerk session.

## Task 3.1: Clerk Auth Integration
**Date:** 2026-01-04  
**Status:** ✅ Complete

### What Was Built
- Added Clerk provider with secure token cache, auth-gated navigation, and sign-in/sign-up screens covering Apple, Google, and email OTP.
- Synced authenticated users into Convex via new `useCurrentUser` hook and server mutation; removed reliance on test user across Today/Bookmarks/Profile/Bucket screens.
- Added env placeholders for Clerk keys and Convex JWT issuer plus auth config for Convex.

### Files Created
- `.env.local`, `convex/.env.local` - Clerk key and issuer placeholders
- `convex/auth.config.ts` - Clerk JWT provider config
- `components/auth/*` - Auth header and Apple/Google/Email buttons
- `app/sign-in.tsx`, `app/sign-up.tsx` - Auth flows
- `lib/hooks/useCurrentUser.ts` - Sync Clerk user to Convex

### Files Modified
- `app/_layout.tsx` - Clerk provider + auth gating and token cache
- `package.json` - Add `expo-secure-store` for token storage
- `app/(tabs)/index.tsx` - Use real user for Today flow
- `app/(tabs)/bookmarks.tsx` - Use real user for buckets
- `app/bucket/[id].tsx` - Use real user for bucket detail
- `app/(tabs)/profile.tsx` - Sign out + dev panel gated to dev builds
- `convex/users.ts` - Add auth-based user creation helper/mutation

### Issues Resolved
- App now routes unauthenticated users to Clerk sign-in, supports OAuth/OTP, and persists sessions while syncing users into Convex without test-user hacks.

## Deferred / Archived

### Task 2.4: Private Notes (Deferred)
- Notes feature is paused; related code and schema were removed. Refer to `docs/SPEC_DOC_0.md` for the intended schema/functions/UI when ready to reintroduce.

## Task 2.2: Bookmark Buckets CRUD
**Date:** 2026-01-04
**Status:** ✅ Complete

### What Was Built
- Added Convex schema tables for bookmark buckets and bookmarks with indexes for user/bucket/verse lookups.
- Implemented server-side CRUD for buckets (create, rename, delete with cascade) and bookmarks (quick default bucket toggle, add/remove to specific buckets, membership queries).
- Updated Today swipe action drawer to perform real quick bookmark toggles and open a bucket picker modal.
- Added bucket picker modal to add/remove a verse across buckets and create new buckets inline.
- Built Bookmarks tab UI to view buckets with counts, create buckets, rename/delete non-default buckets, and placeholder navigation to bucket detail (Task 2.3).

### Files Created
- `convex/bookmarks.ts` - Bucket and bookmark mutations/queries
- `components/bookmarks/BucketPickerModal.tsx` - Add/remove verse to buckets, create inline
- `components/bookmarks/BucketCard.tsx` - Bucket list tiles
- `components/bookmarks/index.ts` - Bookmark component exports
- `lib/hooks/useBookmarkBuckets.ts` - Helper for bucket queries

### Files Modified
- `convex/schema.ts` - Added bookmarkBuckets and bookmarks tables with indexes
- `app/(tabs)/index.tsx` - Quick bookmark toggle + bucket picker wiring on swipe-left drawer
- `components/verses/ActionDrawer.tsx` - Await action callbacks
- `app/(tabs)/bookmarks.tsx` - Bucket management UI (list/create/rename/delete)
- `convex/_generated/api.d.ts` - Expose bookmarks module for TS

### Issues Resolved
- Users can now manage buckets, save/remove verses, and organize via picker and Bookmarks tab; default "Saved" bucket is auto-created.

---

## Task 2.3: Bucket Detail & Bookmark Management
**Date:** 2026-01-04  
**Status:** ✅ Complete

### What Was Built
- Bucket detail screen (`app/bucket/[id].tsx`) showing bucket header, counts, empty states, and scrollable verse list.
- Bookmark detail bottom sheet with remove, move-to-bucket, and share actions.
- Bookmark row component for bucket lists and navigation from Bookmarks tab into bucket detail.
- Emoji-aware bucket picker supports moving a bookmark between buckets.

### Files Created
- `app/bucket/[id].tsx` - Bucket detail screen
- `components/bookmarks/BookmarkRow.tsx` - Verse row for buckets
- `components/bookmarks/BookmarkDetailSheet.tsx` - Bottom sheet with bookmark actions

### Files Modified
- `convex/bookmarks.ts` - Add bucket lookup, moveBookmark, and enhanced joins
- `components/bookmarks/BucketPickerModal.tsx` - Support move mode and icons
- `components/bookmarks/BucketCard.tsx` - Render emoji icons
- `app/(tabs)/bookmarks.tsx` - Navigate to bucket detail, emoji pickers scrollable
- `components/bookmarks/index.ts` - Export new components
- `app/bucket/[id].tsx` - Hide default header, use normalized emoji/name in bucket detail
- `convex/bookmarks.ts` - Normalize default icons for older buckets

### Issues Resolved
- Users can now open a bucket to browse saved verses, share/remove/move them, and choose target buckets without UI clipping.
- Fixed inconsistent bucket emojis between list and detail, and removed route placeholders from bucket detail header.

---

## Task 2.2 UI Polish: Bucket Picker & Icons
**Date:** 2026-01-04  
**Status:** ✅ Complete

### What Was Built
- Added emoji icon selection for bookmark buckets (both create and rename) and stored the icon in Convex schema/functions.
- Improved bucket picker and Bookmarks tab UI spacing: horizontal emoji scrollers to prevent overflow, padded inputs so text and controls don’t clip, and better action buttons.
- Bucket picker avatars now show the chosen emoji; defaults fall back to bookmark/folder icons.

### Files Modified
- `convex/schema.ts` - Store optional bucket `icon`
- `convex/bookmarks.ts` - Accept/save icon on create/rename; default bucket icon
- `components/bookmarks/BucketPickerModal.tsx` - Emoji avatar display and creation flow padding
- `components/bookmarks/BucketCard.tsx` - Render emoji icons for buckets
- `app/(tabs)/bookmarks.tsx` - Emoji selectors (scrollable), padding fixes, icon support on create/rename

### Issues Resolved
- Bucket icons were clipped/overflowing; inputs and controls were getting cut off. UI now scrolls and pads properly with emoji support.

---

## Task 2.1: Swipe Left Action Drawer
**Date:** 2026-01-04
**Status:** ✅ Complete

### What Was Built
- Added iOS-style action drawer that appears when swiping left on a verse card, with haptic feedback and dimmed backdrop.
- Drawer lists Bookmark, Add to Bucket, Add Note, and Share actions; non-share actions show a "Coming Soon" alert placeholder.
- Share action opens the native share sheet populated with the verse reference and content.
- Left swipes now spring the card back to center while opening the drawer (card is not dismissed).

### Files Created
- `components/verses/ActionDrawer.tsx` - Bottom sheet UI for verse actions

### Files Modified
- `app/(tabs)/index.tsx` - Wire swipe-left to open ActionDrawer, handle placeholders and sharing
- `components/verses/SwipeableCard.tsx` - Ensure left swipe springs back and invokes callback
- `package.json` / `package-lock.json` - Add `@gorhom/bottom-sheet` dependency

### Issues Resolved
- Swipe left now surfaces actionable options instead of doing nothing, preparing for upcoming bookmark/note flows.

---

## Task 1.7: Completion Screen
**Date:** 2026-01-04
**Status:** ✅ Complete

### What Was Built
- Animated completion experience with springing checkmark, staggered text, flame wiggle, and success haptic.
- Streak card shows current streak, longest streak, and new-record badge with contextual encouragement.
- Today screen now renders the new CompletionScreen after finishing all 7 verses.
- Streak updates returned from Convex when a day completes so the client can display record status immediately.

### Files Created
- `components/today/CompletionScreen.tsx` - Animated completion UI

### Files Modified
- `app/(tabs)/index.tsx` - Use CompletionScreen and pass streak data
- `lib/hooks/useTodayReading.ts` - Surface longest streak and new-record flag from mark-as-read flow
- `convex/dailySets.ts` - Return streak update info when a day completes
- `components/today/index.ts` - Export CompletionScreen
- `docs/PROJECT_STATUS.md` - Mark Task 1.7/Phase 1 complete and advance to Phase 2

### Issues Resolved
- Completion screen now rewards daily completion with streak visibility and record celebration, supporting habit formation.

---

## Task 1.6: Streak Logic Dev Tools
**Date:** 2026-01-04
**Status:** ✅ Complete

### What Was Built
- Dev-only Convex mutations to inspect state, simulate next/missed days, force-complete a daily set, and reset all progress for a user.
- React Native DevPanel rendering streak/daily-set state with action buttons and testing flow guidance.
- Profile tab now boots the test user and surfaces the DevPanel (temporary until real profile UI).
- Verified daily set reuse check continues to depend on `lastDailyDate` + `currentDailySetId`.

### Files Created
- `convex/debug.ts` - Debug queries/mutations for streak/daily-set testing
- `components/dev/DevPanel.tsx` - Dev tools UI for streak and daily-set simulation

### Files Modified
- `app/(tabs)/profile.tsx` - Render DevPanel and auto-create/get test user
- `docs/PROJECT_STATUS.md` - Mark task complete and record dev tools

### Issues Resolved
- Can test streak increments/resets and daily set rollover without waiting for real days; easier reproduction of rollover bugs.

---

## Task 1.5: Daily Set Generation & Persistence
**Date:** 2026-01-03
**Status:** ✅ Complete

### What Was Built
- User management system with test user for development
- Daily set generation (sequential, 7 verses)
- Read event tracking per verse
- Progress persistence across app restarts
- Custom hook for Today screen data management

### Files Created
- `convex/users.ts` - getOrCreateUser, getOrCreateTestUser, getUserByAuthId
- `convex/dailySets.ts` - getTodaySet, markVerseRead, getTodayProgress
- `lib/hooks/useTodayReading.ts` - Main reading hook

### Files Modified
- `convex/schema.ts` - Verified readEvents has dailySetId index
- `app/(tabs)/index.tsx` - Updated to use useTodayReading hook

### Key Logic
- Sequential pointer tracks user's position in 701 verses
- Daily set created on first app open each day
- Read events recorded when swiping right
- Day boundary uses user's timezone (en-CA locale for YYYY-MM-DD format)

### Issues Resolved
- None

---

## Task 1.4: Swipe Interactions
**Date:** 2026-01-03
**Status:** ✅ Complete

### What Was Built
- Full pan gesture handling on verse cards
- Swipe right to mark as read and dismiss
- Swipe left springs back (placeholder for options drawer)
- Visual indicators showing swipe intent
- Haptic feedback on swipe completion

### Files Created
- `components/verses/SwipeableCard.tsx` - Gesture-enabled card component

### Files Modified
- `components/verses/CardStack.tsx` - Updated to use SwipeableCard
- `app/(tabs)/index.tsx` - Added swipe callbacks and haptics
- `app/_layout.tsx` - Added GestureHandlerRootView wrapper

### Gesture Specifications
- Swipe threshold: 30% of screen width
- Rotation: ±15 degrees based on swipe distance
- Spring animation on return: damping 15, stiffness 150
- Exit animation: 300ms timing

### Issues Resolved
1. **withTiming callback crash** - Reanimated v4 changed API, replaced with withSequence
2. **Race condition** - Removed setTimeout in handleSwipeRight, direct state update
3. **Array bounds** - Added safety checks for empty/null verse arrays
4. **Worklet directive** - Added 'worklet' to resetPosition function

---

## Task 1.3: Today Tab UI (Card Stack)
**Date:** 2026-01-03
**Status:** ✅ Complete

### What Was Built
- VerseCard component displaying Sanskrit, transliteration, translation
- CardStack component managing stack of 7 cards
- TodayHeader with streak badge and progress dots
- SwipeHint showing swipe instructions
- Stack visual effect (scale, offset, opacity for depth)

### Files Created
- `components/verses/VerseCard.tsx`
- `components/verses/CardStack.tsx`
- `components/verses/index.ts`
- `components/today/TodayHeader.tsx`
- `components/today/SwipeHint.tsx`
- `components/today/index.ts`

### Files Modified
- `app/(tabs)/index.tsx` - Complete rewrite with card stack UI

### Visual Design
- Card: White (#FFFFFF) with rounded corners, subtle shadow
- Sanskrit: Large, deep blue (#1A365D)
- Transliteration: Italic, gray (#718096)
- Translation: Regular, dark gray (#2D3748)
- Progress dots: Orange (#FF6B35) for read, gray for unread

---

## Task 1.2.1: NativeWind Fix + Force Light Mode
**Date:** 2026-01-03
**Status:** ✅ Complete

### What Was Fixed
- NativeWind className styles not applying (was showing black-on-black)
- App was picking up device dark mode

### Configuration Verified/Fixed
- `tailwind.config.js` - Correct content paths and theme colors
- `babel.config.js` - NativeWind preset added
- `global.css` - Tailwind directives
- `metro.config.js` - withNativeWind wrapper
- `nativewind-env.d.ts` - TypeScript reference

### Light Mode Enforcement
- Added `userInterfaceStyle: "light"` to app.json
- ThemeProvider with DefaultTheme in _layout.tsx

### Files Modified
- `tailwind.config.js`
- `babel.config.js`
- `metro.config.js`
- `global.css`
- `app/_layout.tsx`
- `app.json`

---

## Task 1.2: Dataset Import
**Date:** 2026-01-03
**Status:** ✅ Complete

### What Was Built
- Static JSON file with all 701 Bhagavad Gita verses
- Convex mutations and queries for verses
- Seed script to populate database

### Files Created
- `data/gita.json` - All 701 verses with Sanskrit, transliteration, translation
- `convex/verses.ts` - insertVerse, insertVersesBatch, getVerseCount, getVersesByChapter, getVerseByPosition, getAllVersesOrdered, getVerseByIndex, getVersesFromIndex
- `scripts/seedVerses.ts` - Seeding script

### Verse Data Structure
```json
{
  "chapter": 1,
  "verse": 1,
  "sanskrit": "धृतराष्ट्र उवाच...",
  "transliteration": "dhṛtarāṣṭra uvāca...",
  "translation": "Dhritarashtra said..."
}
```

### Verification
- 701 verses seeded to Convex
- Verses ordered by chapter and verse number
- All fields populated (Sanskrit, transliteration, translation)

---

## Task 1.1: Project Setup
**Date:** 2026-01-03
**Status:** ✅ Complete

### What Was Built
- Fresh Expo project with TypeScript
- Tab-based navigation (5 tabs)
- Convex backend initialized
- Clerk auth placeholder
- NativeWind styling configured
- Base folder structure

### Dependencies Installed

Core:
- expo ~54.0.30
- react-native 0.81.5
- react 19.1.0
- react-dom 19.1.0
- expo-router ~6.0.21
- @react-navigation/native ^7.1.8
- @expo/cli ^54.0.20
- typescript ~5.9.2

Backend:
- convex ^1.31.2
- @clerk/clerk-expo ^2.19.14

Styling:
- nativewind ^4.2.1
- tailwindcss 3.4.19

Gestures/Animation:
- react-native-gesture-handler ~2.28.0
- react-native-reanimated 4.1.1

Utilities:
- @expo/vector-icons ^15.0.3
- expo-auth-session ~7.0.10
- expo-constants ~18.0.12
- expo-font ~14.0.10
- expo-haptics ^15.0.8
- expo-linking ~8.0.11
- expo-notifications ^0.32.15
- expo-splash-screen ~31.0.13
- expo-status-bar ~3.0.9
- expo-web-browser ~15.0.10
- react-native-safe-area-context ~5.6.0
- react-native-screens ~4.16.0
- react-native-web ~0.21.0
- react-native-worklets 0.5.1
- @types/react ~19.1.0
- react-test-renderer 19.1.0
- tsx ^4.19.2
- dotenv ^16.4.7

### Folder Structure Created

sapta-gita/

├── app/

│   ├── (tabs)/

│   └── _layout.tsx

├── components/

├── convex/

├── lib/

├── constants/

└── data/

### Tab Navigation
1. Today (book.fill icon)
2. Leaderboards (chart.bar.fill)
3. Bookmarks (bookmark.fill)
4. Community (person.3.fill)
5. Profile (person.circle.fill)

### Theme Colors Configured
- Primary: #FF6B35 (Saffron/Orange)
- Secondary: #1A365D (Deep Blue)
- Background: #FFFBF5 (Warm White)
- Surface: #FFFFFF (Pure White)
- Text Primary: #2D3748 (Dark Gray)
- Text Secondary: #718096 (Medium Gray)
- Success: #38A169 (Green)
- Accent: #D69E2E (Gold)

---

*[End of changelog - newest entries should be added above this line]*
