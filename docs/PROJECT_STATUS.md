# Sapta Gita - Project Status

> **Instructions:** This file is the primary context document. Always include when starting a new chat session.

## Current State
- **Phase:** 2 (Bookmarks & Notes) — Phase 1 complete
- **Current Task:** Phase 2 - Task 2.1
- **Last Updated:** 2026-01-04
- **App Status:** Runnable, core reading flow working

## Phase 1: Reading Loop

| Task | Description | Status |
|------|-------------|--------|
| 1.1 | Project Setup (Expo + Convex + Clerk + NativeWind) | ✅ Complete |
| 1.2 | Dataset Import (701 verses seeded) | ✅ Complete |
| 1.2.1 | NativeWind Fix + Force Light Mode | ✅ Complete |
| 1.3 | Today Tab UI (Card Stack) | ✅ Complete |
| 1.4 | Swipe Interactions | ✅ Complete |
| 1.5 | Daily Set Generation & Persistence | ✅ Complete |
| 1.6 | Streak Logic | ✅ Complete |
| 1.7 | Completion Screen Polish | ✅ Complete |

## Future Phases (Not Started)

| Phase | Focus | Status |
|-------|-------|--------|
| 2 | Bookmarks & Notes | ⏳ In Progress |
| 3 | Auth & Profile | ⬜ |
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
| streaks | Streak tracking | ⏳ Task 1.6 |
| bookmarkBuckets | Bookmark folders | ⬜ Phase 2 |
| bookmarks | Saved verses | ⬜ Phase 2 |
| notes | Private reflections | ⬜ Phase 2 |
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
- `app/(tabs)/bookmarks.tsx` - Placeholder
- `app/(tabs)/community.tsx` - Placeholder
- `app/(tabs)/profile.tsx` - Dev tools panel (temporary)
- `app/_layout.tsx` - Root layout with providers

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

### Backend (Convex)
- `convex/schema.ts` - Database schema
- `convex/verses.ts` - Verse queries
- `convex/users.ts` - User management
- `convex/dailySets.ts` - Daily set generation & read tracking
- `convex/streaks.ts` - Streak tracking logic
- `convex/debug.ts` - Dev-only mutations for streak/daily-set testing

### Hooks
- `lib/hooks/useTodayReading.ts` - Main hook for Today screen

### Data
- `data/gita.json` - All 701 verses (static JSON)

## Key Decisions Made

1. **Verse Order:** Sequential (Chapter 1 Verse 1 → 1.2 → ... → 18.78)
2. **Daily Count:** Fixed at 7 verses per day
3. **Swipe Right:** Mark as read, advance to next card
4. **Swipe Left:** Show options drawer (not yet implemented, springs back)
5. **Light Mode:** Forced light mode regardless of device settings
6. **Test User:** Using hardcoded test user for development (real auth in Phase 3)
7. **Timezone:** Day boundary based on user's local timezone
8. **Dev Tools:** Profile tab temporarily hosts dev panel with debug mutations for streak/daily-set testing

## Current Working Features

- ✅ App launches without crashes
- ✅ 5-tab navigation (Today, Leaderboards, Bookmarks, Community, Profile)
- ✅ Today tab shows 7 verse cards in a stack
- ✅ Swipe right dismisses card and advances
- ✅ Swipe left springs back (placeholder for options)
- ✅ Progress dots update as cards are read
- ✅ Completion screen shows after 7 verses
- ✅ Haptic feedback on swipe
- ✅ Visual indicators (green checkmark right, orange ellipsis left)
- ✅ Progress persists across app restart
- ✅ New day generates new verse set

## Known Issues / Blockers

- Streak/day rollover issue: after midnight on day 3, the app shows the day as completed with no verses visible (streak display inconsistent). Dev panel includes controls to reproduce (simulate next/missed day).

## Environment

- Node version: v25.2.1
- Expo SDK version: ~54.0.30
- Convex version: ^1.31.2
- iOS Simulator / Device: Not recorded

---

*To continue development, provide this file to the AI assistant and state which task to work on.*
