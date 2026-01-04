# Sapta Gita - Project Status

> **Instructions:** This file is the primary context document. Always include when starting a new chat session.

## Development Workflow (Summary)

- **T3 Chat** (orchestrator):
  - Designs phases and tasks
  - Produces detailed prompts for the repo-aware agent
  - Reviews results and defines next steps

- **Cursor / repo-aware agent** (implementer):
  - Receives full task prompts from T3 Chat
  - Edits the codebase and runs checks
  - Updates `docs/PROJECT_STATUS.md`, `docs/CHANGELOG.md`, and `docs/ARCHITECTURE.md` as instructed

- **Human developer**:
  - Bridges T3 Chat and Cursor
  - Runs the app and tests behavior
  - Reports back to T3 Chat using each task’s report template

For the full process description, see `docs/PROCESS.md`.

## Current State
- **Phase:** 3 (Auth & Profile)
- **Current Task:** 3.2 (Profile Tab)
- **Last Updated:** 2026-01-04
- **App Status:** Runnable, core reading flow working

## Phase 1: Reading Loop

| Task | Description | Status |
|------|-------------|--------|
| 1.1 | Project Setup | ✅ Complete |
| 1.2 | Dataset Import | ✅ Complete |
| 1.2.1 | NativeWind Fix | ✅ Complete |
| 1.3 | Today Tab UI | ✅ Complete |
| 1.4 | Swipe Interactions | ✅ Complete |
| 1.5 | Daily Set Generation | ✅ Complete |
| 1.6 | Streak Logic | ✅ Complete |
| 1.6.1 | Dev Testing Tools | ✅ Complete |
| 1.7 | Completion Screen | ✅ Complete |

## Phase 2: Bookmarks & Notes

| Task | Description | Status |
|------|-------------|--------|
| 2.1 | Swipe Left Action Drawer | ✅ Complete |
| 2.2 | Bookmark Buckets CRUD | ✅ Complete |
| 2.3 | Bucket Detail & Bookmark Management | ✅ Complete |
| 2.4 | Private Notes per Verse | ⏸ Deferred |

## Future Phases (Not Started)

| Phase | Focus | Status |
|-------|-------|--------|
| 2 | Bookmarks & Notes | ✅ (Notes deferred) |
| 3 | Auth & Profile | ⏳ In Progress |
| 4 | Communities & Leaderboards | ⬜ |
| 5 | Polish & Launch | ⬜ |

## Tech Stack
- **Framework:** Expo SDK 52+ with React Native
- **Language:** TypeScript (strict mode)
- **Navigation:** Expo Router (tab-based)
- **Backend:** Convex (database + serverless functions)
- **Auth:** Clerk (placeholder/test user for now)
- **Styling:** NativeWind (Tailwind CSS for RN)
- **Gestures:** react-native-gesture-handler
- **Animations:** react-native-reanimated
- **Haptics:** expo-haptics

## Database Tables (Convex)

| Table | Purpose | Status |
|-------|---------|--------|
| users | User profiles | ✅ Implemented |
| userState | Reading mode, sequential pointer | ✅ Implemented |
| verses | 701 Bhagavad Gita verses | ✅ Seeded |
| dailySets | Daily 7-verse assignments | ✅ Implemented |
| readEvents | Track which verses read | ✅ Implemented |
| streaks | Streak tracking | ✅ Implemented |
| bookmarkBuckets | Bookmark folders | ✅ Implemented |
| bookmarks | Saved verses | ✅ Implemented |
| notes | Private reflections | ⬜ Deferred |
| communities | Groups | ⬜ Phase 4 |
| communityMembers | Group membership | ⬜ Phase 4 |
| comments | Verse comments | ⬜ Phase 4 |
| commentLikes | Likes on comments | ⬜ Phase 4 |
| reports | Content moderation | ⬜ Phase 4 |

## Key Files

Verified: all listed paths exist in the repo.

### App Screens
- `app/(tabs)/index.tsx` - Today screen (main reading view)
- `app/(tabs)/leaderboards.tsx` - Placeholder
- `app/(tabs)/bookmarks.tsx` - Bucket list and management (Phase 2)
- `app/bucket/[id].tsx` - Bucket detail with bookmark list and actions
- `app/(tabs)/community.tsx` - Placeholder
- `app/(tabs)/profile.tsx` - Dev tools panel (temporary)
- `app/_layout.tsx` - Root layout with providers
- `app/sign-in.tsx` - Clerk sign-in screen
- `app/sign-up.tsx` - Clerk sign-up screen

### Components
- `components/verses/SwipeableCard.tsx` - Card with gesture handling
- `components/verses/CardStack.tsx` - Manages stack of cards
- `components/verses/VerseCard.tsx` - Verse display component
- `components/verses/index.ts` - Verse component exports
- `components/today/TodayHeader.tsx` - Header with streak display
- `components/today/SwipeHint.tsx` - Swipe instructions
- `components/today/index.ts` - Today component exports
- `components/today/CompletionScreen.tsx` - Animated completion UI with streak badge
- `components/dev/DevPanel.tsx` - Dev-only streak/daily-set testing UI
- `components/bookmarks/BucketPickerModal.tsx` - Modal to add/remove verse in buckets
- `components/bookmarks/BucketCard.tsx` - Bucket list tile
- `components/bookmarks/index.ts` - Bookmark component exports
- `components/bookmarks/BookmarkRow.tsx` - Row layout for verses in a bucket
- `components/bookmarks/BookmarkDetailSheet.tsx` - Bottom sheet with bookmark actions
- `components/verses/ActionDrawer.tsx` - Action sheet for swipe-left
- `components/auth/` - Buttons and layout for Clerk sign-in (Apple/Google/Email)

### Backend (Convex)
- `convex/schema.ts` - Database schema
- `convex/verses.ts` - Verse queries
- `convex/users.ts` - User management
- `convex/dailySets.ts` - Daily set generation & read tracking
- `convex/streaks.ts` - Streak tracking logic
- `convex/debug.ts` - Dev-only mutations for streak/daily-set testing
- `convex/bookmarks.ts` - Bookmark buckets and bookmark CRUD
- `convex/auth.config.ts` - Clerk JWT issuer configuration

### Hooks
- `lib/hooks/useTodayReading.ts` - Main hook for Today screen
- `lib/hooks/useBookmarkBuckets.ts` - Helper for bucket queries
- `lib/hooks/useCurrentUser.ts` - Sync Clerk user to Convex user record

### Data
- `data/gita.json` - All 701 verses (static JSON)

## Key Decisions Made

1. **Verse Order:** Sequential (Chapter 1 Verse 1 → 1.2 → ... → 18.78)
2. **Daily Count:** Fixed at 7 verses per day
3. **Swipe Right:** Mark as read, advance to next card
4. **Swipe Left:** Show action drawer for bookmark/bucket/share
5. **Light Mode:** Forced light mode regardless of device settings
6. **Test User:** Using hardcoded test user for development (real auth in Phase 3)
7. **Timezone:** Day boundary based on user's local timezone
8. **Dev Tools:** Profile tab temporarily hosts dev panel with debug mutations for streak/daily-set testing

## Current Working Features

- ✅ App launches without crashes
- ✅ 5-tab navigation (Today, Leaderboards, Bookmarks, Community, Profile)
- ✅ Today tab shows 7 verse cards in a stack
- ✅ Swipe right dismisses card and advances
- ✅ Swipe left opens action drawer with share/bookmark/bucket options and springs back
- ✅ Progress dots update as cards are read
- ✅ Completion screen shows after 7 verses
- ✅ Default "Saved" bucket auto-creates; buckets can be created/renamed/deleted; quick bookmark toggles saved state
- ✅ Bucket emoji icons selectable; picker/input layouts no longer clip or overflow
- ✅ Bucket detail shows saved verses with share/move/remove actions and empty states
- ✅ Bucket emojis persist across views; bucket detail header uses custom title (no route placeholders)
- ✅ Clerk auth (Apple/Google/email) with protected routes and Convex user sync
- ✅ Haptic feedback on swipe
- ✅ Visual indicators (green checkmark right, orange ellipsis left)
- ✅ Progress persists across app restart
- ✅ New day generates new verse set

## Known Issues / Blockers

- Streak/day rollover issue: after midnight on day 3, the app shows the day as completed with no verses visible (streak display inconsistent). Dev panel includes controls to reproduce (simulate next/missed day).

## Deferred / Revisit Later

- **Task 2.4: Private Notes per Verse** — deferred. Previous implementation removed due to flow issues; specs remain in `docs/SPEC_DOC_0.md` (notes schema, per-verse note UX). Reintroduce by re-adding notes table/functions and note UI when ready.

## Environment

- Node version: v25.2.1
- Expo SDK version: ~54.0.30
- Convex version: ^1.31.2
- iOS Simulator / Device: Not recorded

---

*To continue development, provide this file to the AI assistant and state which task to work on.*
