# Sapta Gita - Architecture Reference

> **Instructions:** Technical reference document. Include when agent needs detailed context about structure, schema, or patterns.
Last Updated: 2026-01-04

---

## Project Overview

**Sapta Gita** is an iOS app for daily Bhagavad Gita reading.
- Users read 7 verses per day
- Swipe-based card interface
- Streak tracking for consistency
- Community leaderboards (future)

---

## Folder Structure

sapta-gita/
    ├── app/
    │   ├── (tabs)/
    │   │   ├── _layout.tsx
    │   │   ├── bookmarks.tsx
    │   │   ├── community.tsx
    │   │   ├── index.tsx
    │   │   ├── leaderboards.tsx
    │   │   └── profile.tsx
    │   ├── +html.tsx
    │   ├── +not-found.tsx
    │   ├── _layout.tsx
    │   └── modal.tsx
    ├── assets/
    │   ├── fonts/
    │   │   └── SpaceMono-Regular.ttf
    │   └── images/
    │       ├── adaptive-icon.png
    │       ├── favicon.png
    │       ├── icon.png
    │       └── splash-icon.png
    ├── components/
    │   ├── __tests__/
    │   │   └── StyledText-test.js
    │   ├── common/
    │   ├── today/
    │   │   ├── index.ts
    │   │   ├── SwipeHint.tsx
    │   │   └── TodayHeader.tsx
    │   ├── ui/
    │   ├── verses/
    │   │   ├── CardStack.tsx
    │   │   ├── index.ts
    │   │   ├── SwipeableCard.tsx
    │   │   └── VerseCard.tsx
    │   ├── EditScreenInfo.tsx
    │   ├── ExternalLink.tsx
    │   ├── StyledText.tsx
    │   ├── Themed.tsx
    │   ├── useClientOnlyValue.ts
    │   ├── useClientOnlyValue.web.ts
    │   ├── useColorScheme.ts
    │   └── useColorScheme.web.ts
    ├── constants/
    │   ├── Colors.ts
    │   └── fonts.ts
    ├── convex/
    │   ├── _generated/
    │   │   ├── api.d.ts
    │   │   ├── api.js
    │   │   ├── dataModel.d.ts
    │   │   ├── server.d.ts
    │   │   └── server.js
    │   ├── functions/
    │   ├── dailySets.ts
    │   ├── README.md
    │   ├── schema.ts
    │   ├── streaks.ts
    │   ├── tsconfig.json
    │   ├── users.ts
    │   └── verses.ts
    ├── data/
    │   └── gita.json
    ├── docs/
    │   ├── ARCHITECTURE.MD
    │   ├── CHANGELOG.md
    │   └── PROJECT_STATUS.md
    ├── lib/
    │   ├── hooks/
    │   │   └── useTodayReading.ts
    │   ├── convex.ts
    │   └── utils.ts
    ├── scripts/
    │   └── seedVerses.ts
    ├── app.json
    ├── babel.config.js
    ├── expo-env.d.ts
    ├── global.css
    ├── metro.config.js
    ├── nativewind-env.d.ts
    ├── package-lock.json
    ├── package.json
    ├── tailwind.config.js
    └── tsconfig.json

---

## Database Schema (Convex)

Verified against convex/schema.ts on 2026-01-04.

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  verses: defineTable({
    chapterNumber: v.number(),
    verseNumber: v.number(),
    sanskritDevanagari: v.string(),
    transliteration: v.string(),
    translationEnglish: v.string(),
    sourceKey: v.string(),
  }).index("byChapterVerse", ["chapterNumber", "verseNumber"]),
  users: defineTable({
    authId: v.string(),
    displayName: v.string(),
    avatarUrl: v.string(),
    timezone: v.string(),
    createdAt: v.number(),
  })
    .index("byAuthId", ["authId"]),
  userState: defineTable({
    userId: v.id("users"),
    mode: v.string(), // "sequential" | "random" | etc.
    sequentialPointer: v.number(),
    lastDailyDate: v.string(), // YYYY-MM-DD format
    currentDailySetId: v.union(v.id("dailySets"), v.null()),
  })
    .index("byUser", ["userId"]),
  dailySets: defineTable({
    userId: v.id("users"),
    localDate: v.string(), // YYYY-MM-DD format
    verseIds: v.array(v.id("verses")),
    createdAt: v.number(),
    completedAt: v.union(v.number(), v.null()),
  })
    .index("byUser", ["userId"])
    .index("byUserAndDate", ["userId", "localDate"]),
  readEvents: defineTable({
    userId: v.id("users"),
    dailySetId: v.id("dailySets"),
    verseId: v.id("verses"),
    readAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_dailySet", ["dailySetId"]),
  streaks: defineTable({
    userId: v.id("users"),
    currentStreak: v.number(),
    longestStreak: v.number(),
    lastCompletedLocalDate: v.string(), // YYYY-MM-DD format
    updatedAt: v.number(),
  })
    .index("byUser", ["userId"]),
});
```

Key Patterns

1. Test User Pattern (Development)

	// convex/users.ts
	export const getOrCreateTestUser = mutation({
	  handler: async (ctx) => {
	    const testAuthId = "test-user-dev";
	    // Check if exists, create if not
	    // Returns user document
	  },
	});

Usage in app:


	// app/(tabs)/index.tsx
	const getOrCreateTestUser = useMutation(api.users.getOrCreateTestUser);
	
	useEffect(() => {
	  getOrCreateTestUser()
	    .then((user) => setUserId(user._id))
	    .catch(console.error);
	}, []);

2. Daily Set Generation

	// convex/dailySets.ts - getTodaySet
	// 1. Get user and userState
	// 2. Check if today's set exists (by localDate)
	// 3. If exists, return with verses and read status
	// 4. If not, create new set:
	//    - Get next 7 verses from sequential pointer
	//    - Create dailySet record
	//    - Update userState pointer (+7)
	//    - Return new set

3. Swipe Gesture Pattern

	// components/verses/SwipeableCard.tsx
	const panGesture = Gesture.Pan()
	  .enabled(isTop) // Only top card responds
	  .onUpdate((event) => {
	    translateX.value = event.translationX;
	    translateY.value = event.translationY * 0.5;
	    rotation.value = interpolate(...);
	  })
	  .onEnd((event) => {
	    if (event.translationX > SWIPE_THRESHOLD) {
	      // Swipe right - animate out, call onSwipeRight
	    } else if (event.translationX < -SWIPE_THRESHOLD) {
	      // Swipe left - animate out, call onSwipeLeft
	    } else {
	      // Return to center with spring
	    }
	  });

4. Hook Pattern for Screen Data

	// lib/hooks/useTodayReading.ts
	export function useTodayReading(userId: Id<"users"> | null) {
	  // Mutations
	  const getTodaySet = useMutation(api.dailySets.getTodaySet);
	  const markVerseRead = useMutation(api.dailySets.markVerseRead);
	  
	  // Local state
	  const [todayData, setTodayData] = useState(...);
	  
	  // Initialize on mount
	  useEffect(() => { /* fetch today's set */ }, [userId]);
	  
	  // Handler functions
	  const handleSwipeRight = useCallback(async () => {
	    // Mark read, update local state
	  }, [deps]);
	  
	  return {
	    verses,
	    currentIndex,
	    isComplete,
	    isLoading,
	    handleSwipeRight,
	    // ...
	  };
	}


---

API Reference (Convex Functions)

verses.ts

Function	Type	Purpose
getVerseCount	Query	Returns total verse count
getVerseByPosition	Query	Get verse by chapter + verse number
getVersesFromIndex	Query	Get N verses starting from index
getAllVersesOrdered	Query	Get all 701 verses sorted

users.ts

Function	Type	Purpose
getOrCreateUser	Mutation	Create/get user by authId
getOrCreateTestUser	Mutation	Get/create dev test user
getUserByAuthId	Query	Lookup user by auth ID

dailySets.ts

Function	Type	Purpose
getTodaySet	Mutation	Get or create today's verse set
markVerseRead	Mutation	Record a read event
getTodayProgress	Query	Get read count for today

streaks.ts (Task 1.6)

Function	Type	Purpose
getStreak	Query	Get user's streak data
updateStreakOnCompletion	Mutation	Increment streak on day complete
checkAndUpdateStreak	Mutation	Reset streak if day missed

---

Color System

	// constants/colors.ts (or tailwind.config.js)
	const colors = {
	  primary: "#FF6B35",      // Saffron orange - CTAs, streak flame
	  secondary: "#1A365D",    // Deep blue - headers, Sanskrit text
	  background: "#FFFBF5",   // Warm white - app background
	  surface: "#FFFFFF",      // Pure white - cards, modals
	  textPrimary: "#2D3748",  // Dark gray - body text
	  textSecondary: "#718096", // Medium gray - captions, hints
	  success: "#38A169",      // Green - completion states
	  accent: "#D69E2E",       // Gold - badges, achievements
	};

NativeWind usage:


	<View className="bg-background">
	  <Text className="text-secondary font-bold">Header</Text>
	  <Text className="text-textPrimary">Body text</Text>
	</View>


---

Dependencies

	{
	  "dependencies": {
	    "@clerk/clerk-expo": "^2.19.14",
	    "@expo/cli": "^54.0.20",
	    "@expo/vector-icons": "^15.0.3",
	    "@react-navigation/native": "^7.1.8",
	    "convex": "^1.31.2",
	    "expo": "~54.0.30",
	    "expo-auth-session": "~7.0.10",
	    "expo-constants": "~18.0.12",
	    "expo-font": "~14.0.10",
	    "expo-haptics": "^15.0.8",
	    "expo-linking": "~8.0.11",
	    "expo-notifications": "^0.32.15",
	    "expo-router": "~6.0.21",
	    "expo-splash-screen": "~31.0.13",
	    "expo-status-bar": "~3.0.9",
	    "expo-web-browser": "~15.0.10",
	    "nativewind": "^4.2.1",
	    "react": "19.1.0",
	    "react-dom": "19.1.0",
	    "react-native": "0.81.5",
	    "react-native-gesture-handler": "~2.28.0",
	    "react-native-reanimated": "4.1.1",
	    "react-native-safe-area-context": "~5.6.0",
	    "react-native-screens": "~4.16.0",
	    "react-native-web": "~0.21.0",
	    "react-native-worklets": "0.5.1",
	    "tailwindcss": "3.4.19"
	  },
	  "devDependencies": {
	    "@types/react": "~19.1.0",
	    "dotenv": "^16.4.7",
	    "tsx": "^4.19.2",
	    "react-test-renderer": "19.1.0",
	    "typescript": "~5.9.2"
	  }
	}


---

Development Commands

	# Start development
	npx expo start
	
	# Start with cache clear
	npx expo start -c
	
	# Run Convex dev server (separate terminal)
	npx convex dev
	
	# Seed verses to database
	npm run seed:verses
	
	# iOS Simulator
	npx expo start --ios
	
	# Type checking
	npx tsc --noEmit


---

Testing Checklist

After Each Task

1. App launches without crash

2. No red error screens

3. No TypeScript errors (npx tsc --noEmit)

4. Convex dashboard shows expected data

5. Core flow still works (swipe through 7 verses)

Full Flow Test

1. Fresh app launch → sees Today screen

2. Card stack shows 7 verses

3. Swipe right 7 times → completion screen

4. Close app completely

5. Reopen → shows completion (not reset)

6. Change device date to next day

7. Reopen → new set of 7 verses
