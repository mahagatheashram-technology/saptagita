# Sapta Gita — Final Product Specification Document

---

## 1. PRODUCT OVERVIEW

### 1.1 Name
**Working Name:** Sapta Gita

### 1.2 One-Liner
Read 7 Bhagavad Gita verses daily. Maintain a streak. Compete with your community.

### 1.3 Platform
iOS Mobile App (iPhone-first)

### 1.4 Goals
1. Build a daily reading habit through consistent verse delivery
2. Make consistency visible via streaks
3. Make community discipline fun via leaderboards
4. Keep the reading experience calm and fast

### 1.5 Non-Goals for V1
1. Full commentary library
2. Long-form discussions
3. Complex social feeds
4. AI features (deferred to V2)

---

## 2. CORE CONCEPTS

| Concept | Definition |
|---------|------------|
| **Verse** | One shloka with chapter and verse number (Gita has ~700 verses) |
| **Daily Set** | 7 verses assigned for a given local day |
| **Read Mark** | Signal that user finished a verse card |
| **Day Completion** | User marks all 7 verses as read |
| **Streak** | Count of consecutive completed days |
| **Community** | A group with its own leaderboard |
| **Bookmark Bucket** | A folder for saved verses |
| **Note** | Private reflection stored per verse |
| **Comment** | Public message tied to a verse inside a community |

---

## 3. USER TYPES

| Type | Description | Primary Need |
|------|-------------|--------------|
| **Solo Reader** | Individual seeking discipline | Calm reading, personal progress |
| **Community Competitor** | Wants streak rank and friendly pressure | Leaderboard visibility |
| **Collector** | Saves verses into buckets and revisits | Organization and reflection |

---

## 4. CONTENT RULES

### 4.1 First-Time User
- Daily sets follow **sequential order** from Chapter 1, Verse 1 onward
- Daily set size fixed at **7 verses**
- If user joins mid-day, app still serves today's set

### 4.2 Returning User (After Completing All 700 Verses)
**Options (Decision Pending with Pavan Bandhu):**
1. Restart sequential from 1.1
2. Switch to random mode
3. Let user choose in settings
4. Stop and show completion badge

### 4.3 Random Mode Spec Proposal
1. Sample 7 verses using deterministic daily seed (userId + localDate) for stability
2. Exclude verses read in last 14 days to reduce repeats
3. Optionally favor verses user bookmarked/noted less for spaced review

---

## 5. FEATURE SET (MVP)

### 5.1 Core Features
| # | Feature | Priority |
|---|---------|----------|
| 1 | Daily 7 verses reading flow | P0 |
| 2 | Swipe right marks read | P0 |
| 3 | Swipe left opens actions | P0 |
| 4 | Bookmark verse into bucket | P0 |
| 5 | Create and manage buckets | P0 |
| 6 | Add private notes per verse | P0 |
| 7 | Streak counter (Duolingo-style) | P0 |
| 8 | Global leaderboard by streak | P0 |
| 9 | Community creation and joining | P1 |
| 10 | Community leaderboard by streak | P1 |
| 11 | Verse comments inside community | P1 |
| 12 | Like comments | P1 |
| 13 | Top liked comments view per community | P2 |

---

## 6. USER INTERACTION DESIGN

### 6.1 Primary User Loop
```
1. App sends daily reminder at user-chosen time
2. User opens Today tab
3. User sees stack of 7 verse cards
4. User reads top card
5. User swipes right → App marks verse read
6. User swipes left → App reveals actions
7. User finishes all 7
8. App shows completion screen
9. App updates streak and leaderboards
```

### 6.2 Swipe Interactions

**Swipe Right:**
- Mark as read
- Advance to next card
- Animate card off-screen (AirBnB-style)

**Swipe Left → Action Drawer:**
| Action | Description |
|--------|-------------|
| Bookmark | Quick save to default bucket |
| Add to Bucket | Choose specific bucket |
| Add Note | Private reflection |
| View Comments | Community comments for verse |
| Share Verse | Native iOS share sheet |
| Report | Only inside comments view |

### 6.3 Gesture Specifications
- Swipe threshold: 40% of card width
- Swipe velocity trigger: 500pt/s
- Spring animation on return
- Haptic feedback on complete swipe

---

## 7. UI/UX DESIGN

### 7.1 Design Direction
**Reference:** AirBnB iOS Application
- Clean bottom tab bar
- Large hero cards
- Simple icon-driven actions
- Generous whitespace
- Smooth micro-interactions
- Card-based layouts

### 7.2 Information Architecture

```
Tab Bar (5 tabs)
├── Today
├── Leaderboards
├── Bookmarks
├── Community
└── Profile
```

### 7.3 Screen Specifications

#### Tab 1: Today
| Element | Description |
|---------|-------------|
| Header | Day number, current streak with flame icon |
| Card Stack | 7 verse cards, stacked with depth effect |
| Progress | "3 of 7" pill indicator |
| Completion | Celebration screen with streak update |

#### Tab 2: Leaderboards
| Element | Description |
|---------|-------------|
| Segment Control | Global / Community toggle |
| Community Switcher | Dropdown to select active community |
| Rank List | Top 50 users with avatar, name, streak |
| Your Rank Card | Pinned at bottom with your position |

#### Tab 3: Bookmarks
| Element | Description |
|---------|-------------|
| Bucket List | Grid/list of user-created buckets |
| Default Bucket | "Saved" bucket always exists |
| Bucket Detail | Verses saved with note preview |
| Search | Filter within bookmarks |

#### Tab 4: Community
| Element | Description |
|---------|-------------|
| Join Community | Search public / Enter invite code |
| Create Community | Name, type (public/private) |
| Community Feed | Top liked comments (TBD) |
| Members List | V2 feature |

#### Tab 5: Profile
| Element | Description |
|---------|-------------|
| Streak Stats | Current, longest, total days |
| Reading Calendar | GitHub-style contribution grid |
| Notification Settings | Reminder time, streak warning |
| Mode Selection | Sequential/Random (decision pending) |
| Account | Sign out, delete account |

---

## 8. VISUAL STYLE

### 8.1 Color Palette
| Role | Color | Usage |
|------|-------|-------|
| Primary | Saffron/Orange (#FF6B35) | CTAs, streak flame, highlights |
| Secondary | Deep Blue (#1A365D) | Headers, important text |
| Background | Warm White (#FFFBF5) | App background |
| Surface | Pure White (#FFFFFF) | Cards, modals |
| Text Primary | Dark Gray (#2D3748) | Body text |
| Text Secondary | Medium Gray (#718096) | Captions, hints |
| Success | Green (#38A169) | Completion states |
| Accent | Gold (#D69E2E) | Badges, special achievements |

### 8.2 Typography
| Style | Font | Size | Weight |
|-------|------|------|--------|
| Sanskrit Verse | Noto Sans Devanagari | 20pt | Regular |
| Transliteration | SF Pro Text | 16pt | Regular Italic |
| Translation | SF Pro Text | 18pt | Regular |
| Chapter/Verse | SF Pro Display | 14pt | Semibold |
| Tab Labels | SF Pro Text | 10pt | Medium |
| Headers | SF Pro Display | 24pt | Bold |

### 8.3 Icons
**Style:** SF Symbols (iOS native) with custom spiritual icons where needed

| Icon | Purpose |
|------|---------|
| flame.fill | Streak indicator |
| bookmark.fill | Saved/bookmark action |
| text.bubble | Comments |
| heart.fill | Like |
| person.3.fill | Community |
| calendar | Reading history |
| gearshape | Settings |
| arrow.right | Swipe hint |
| folder.fill | Bucket |
| note.text | Notes |

### 8.4 Card Design (Verse Card)
```
┌─────────────────────────────────────┐
│  Chapter 2 • Verse 47               │ ← Subtle header
│                                     │
│  कर्मण्येवाधिकारस्ते               │ ← Sanskrit (large)
│  मा फलेषु कदाचन।                    │
│  मा कर्मफलहेतुर्भूः                 │
│  मा ते सङ्गोऽस्त्वकर्मणि॥           │
│                                     │
│  karmaṇy evādhikāras te...          │ ← Transliteration
│                                     │
│  You have a right to perform        │ ← Translation
│  your prescribed duties, but        │
│  you are not entitled to the        │
│  fruits of your actions...          │
│                                     │
│  ← Swipe      [3/7]      Swipe →   │ ← Hint & progress
└─────────────────────────────────────┘
```

---

## 9. STREAK LOGIC

### 9.1 Definition
- Streak **increments** when user completes all 7 verses for local day
- Streak **resets** when user misses a full day completion

### 9.2 Time Zone Handling
- Store user timezone on signup
- Day boundary uses user's local time (midnight to midnight)
- Timezone changes update future days only; past history unchanged

### 9.3 Grace Rules (V1 Default)
- No streak freeze
- One missed day resets streak

**Optional V1 Upgrade (Decision Pending):**
- One streak freeze earned per 14 completed days

### 9.4 Completion Criteria Options
| Option | Description |
|--------|-------------|
| **Option 1** | Read all 7 verses (recommended) |
| Option 2 | Read 5 of 7 verses |
| Option 3 | Read 7 and add one note |
| Option 4 | Read 7 and add one comment |

---

## 10. LEADERBOARDS

### 10.1 Global Leaderboard
- Rank users by **current streak length**
- Tie-break by **earliest completion time** for today
- Show top 50 + user's own rank window (±2 positions)

### 10.2 Community Leaderboard
- Same ranking rules as global
- Filtered by community membership
- Community switcher to toggle between joined communities

---

## 11. COMMUNITIES

### 11.1 Community Types
| Type | Description |
|------|-------------|
| **Public** | Anyone can join via search |
| **Private** | Requires invite code |

### 11.2 Membership Rules
- One user can join **multiple communities**
- User picks **one active community** for verse comments
- Leaderboard screen allows community switching

### 11.3 Community Scope Options for V1
| Option | Features |
|--------|----------|
| Option 1 | Leaderboard only |
| Option 2 | Leaderboard + comments |
| Option 3 | Leaderboard + comments + top liked |

### 11.4 Roles
| Role | Permissions |
|------|-------------|
| Owner | Full admin, delete community |
| Admin | Moderate comments, remove members |
| Member | View, comment, like |

---

## 12. BOOKMARKS & NOTES

### 12.1 Bookmark Behavior
- One verse can exist in **multiple buckets**
- Default bucket "Saved" always exists
- Users create custom buckets with names

### 12.2 Notes Behavior
- Notes are **private** (only visible to author)
- Plain text input
- Edit history support in V2 only

---

## 13. COMMENTS & LIKES

### 13.1 Comments Behavior
- Comments attach to **verse + community** (scoped)
- Comment author shows display name and avatar
- Sort options: Top (by likes), New, Old
- Character limit: 500

### 13.2 Likes Behavior
- Like attaches to a comment
- One like per user per comment
- Like count visible

### 13.3 Likes Scope Options for V1
| Option | Description |
|--------|-------------|
| Option 1 | Likes on comments only (recommended) |
| Option 2 | Likes on verses only |
| Option 3 | Likes on both |
| Option 4 | No likes in V1 |

---

## 14. NOTIFICATIONS

| Notification | Timing | Content |
|--------------|--------|---------|
| Daily Reminder | User-selected time | "Your 7 verses await 🕉️" |
| Streak Warning | 8 PM local (if incomplete) | "Don't break your X-day streak!" |
| Community Nudge | When friend passes rank | V2 feature |

---

## 15. MODERATION

### 15.1 Report Flow
1. User reports comment with reason
2. Report enters admin queue
3. Admin reviews and takes action

### 15.2 Admin Actions
- Delete comment
- Ban user from community
- Block user (V2)

---

## 16. DATABASE SCHEMA (Convex)

### 16.1 Tables

```typescript
// users
{
  id: Id<"users">,
  authId: string,          // from Clerk
  displayName: string,
  avatarUrl: string,
  timezone: string,
  createdAt: number
}

// verses
{
  id: Id<"verses">,
  chapterNumber: number,
  verseNumber: number,
  sanskritDevanagari: string,
  transliteration: string,
  translationEnglish: string,
  translationHindi?: string,
  wordMeaning?: string,
  sourceKey: string,
  licenseKey: string
}

// userState
{
  userId: Id<"users">,
  mode: "sequential" | "random",
  sequentialPointer: number,    // next verse index
  lastDailyDate: string,        // yyyy-mm-dd in user timezone
  currentDailySetId: Id<"dailySets">
}

// dailySets
{
  id: Id<"dailySets">,
  userId: Id<"users">,
  localDate: string,
  verseIds: Id<"verses">[],     // array of 7
  createdAt: number,
  completedAt?: number
}

// readEvents
{
  id: Id<"readEvents">,
  userId: Id<"users">,
  localDate: string,
  verseId: Id<"verses">,
  readAt: number
}

// streaks
{
  userId: Id<"users">,
  currentStreak: number,
  longestStreak: number,
  lastCompletedLocalDate: string,
  updatedAt: number
}

// communities
{
  id: Id<"communities">,
  name: string,
  type: "public" | "private",
  inviteCodeHash?: string,
  createdBy: Id<"users">,
  createdAt: number
}

// communityMembers
{
  id: Id<"communityMembers">,
  communityId: Id<"communities">,
  userId: Id<"users">,
  role: "owner" | "admin" | "member",
  joinedAt: number
}

// activeCommunity
{
  userId: Id<"users">,
  communityId: Id<"communities">
}

// bookmarkBuckets
{
  id: Id<"bookmarkBuckets">,
  userId: Id<"users">,
  name: string,
  createdAt: number
}

// bookmarks
{
  id: Id<"bookmarks">,
  userId: Id<"users">,
  verseId: Id<"verses">,
  bucketId: Id<"bookmarkBuckets">,
  createdAt: number
}

// notes
{
  id: Id<"notes">,
  userId: Id<"users">,
  verseId: Id<"verses">,
  text: string,
  updatedAt: number
}

// comments
{
  id: Id<"comments">,
  communityId: Id<"communities">,
  verseId: Id<"verses">,
  userId: Id<"users">,
  text: string,
  createdAt: number,
  deletedAt?: number
}

// commentLikes
{
  id: Id<"commentLikes">,
  commentId: Id<"comments">,
  userId: Id<"users">,
  createdAt: number
}

// reports
{
  id: Id<"reports">,
  reporterUserId: Id<"users">,
  commentId: Id<"comments">,
  reason: string,
  createdAt: number,
  status: "pending" | "reviewed" | "dismissed"
}
```

---

## 17. BACKEND FUNCTIONS (Convex)

### 17.1 Core Functions

| Function | Input | Output | Logic |
|----------|-------|--------|-------|
| `getTodaySet` | userId | dailySet + verses | Return existing or generate new |
| `generateDailySetSequential` | userId | dailySet | Pick next 7 verses, update pointer |
| `generateDailySetRandom` | userId | dailySet | Seed-based random, exclude recent |
| `markVerseRead` | userId, verseId | progress | Create readEvent, return count |
| `completeDayIfEligible` | userId | streak | If 7/7, mark complete, update streak |
| `getLeaderboardsGlobal` | — | ranked users | Sort by streak, return top 50 |
| `getLeaderboardsCommunity` | communityId | ranked users | Filter by membership |
| `createCommunity` | name, type | community | Create + add owner |
| `joinCommunity` | code/id | membership | Validate + insert member |
| `setActiveCommunity` | userId, communityId | — | Upsert active selection |
| `addBookmarkBucket` | userId, name | bucket | Create bucket |
| `addBookmark` | userId, verseId, bucketId | bookmark | Deduplicate + insert |
| `upsertNote` | userId, verseId, text | note | Create or update |
| `addComment` | communityId, verseId, text | comment | Rate limit + insert |
| `likeComment` | commentId, userId | like | Upsert (no duplicates) |
| `getTopLikedComments` | communityId | comments | Aggregate likes, sort |

---

## 18. AUTHENTICATION (Clerk)

### 18.1 Auth Methods
- Apple Sign In (required for iOS)
- Google Sign In
- Email + OTP (passwordless)

### 18.2 User Profile Fields
- Display name (editable)
- Avatar (from provider or custom)
- Email (from provider)

### 18.3 Session Handling
- JWT tokens via Clerk
- Token refresh handled by Clerk SDK
- Convex auth integration via `convex-clerk`

### 18.4 WorkOS (Future)
- Reserved for enterprise SSO
- Not in V1 unless corporate communities needed

---

## 19. TECH STACK

### 19.1 Client
| Layer | Technology |
|-------|------------|
| Framework | **Expo React Native** |
| Language | **TypeScript** |
| Navigation | Expo Router |
| Styling | NativeWind (Tailwind for RN) |
| Gestures | React Native Gesture Handler |
| Animations | React Native Reanimated |
| State | Convex React hooks |
| Push | Expo Notifications + APNs |

### 19.2 Backend
| Layer | Technology |
|-------|------------|
| Database + Functions | **Convex** |
| Auth | **Clerk** |
| File Storage | Convex File Storage (if needed) |

### 19.3 Development Tools
| Tool | Purpose |
|------|---------|
| **Cursor AI** | Primary IDE for building/maintaining |
| **Bolt.new** or **Rork** | Screen scaffolding/prototyping |
| GitHub | Version control |
| EAS (Expo Application Services) | Build + Deploy |

### 19.4 Why This Stack?
- **Expo**: Fastest path to iOS App Store, no native code
- **Convex**: Real-time sync, TypeScript end-to-end, serverless
- **Clerk**: Best React Native auth DX, Apple Sign In easy
- **Cursor**: AI-assisted multi-file edits, strong TS support

---

## 20. iOS CLIENT SPECIFICS

### 20.1 Minimum Requirements
- iOS 15.0+
- iPhone only (iPad deferred)

### 20.2 Offline Behavior
1. App stores today's verses locally after first load
2. Read marks queue locally if offline
3. Sync on reconnect
4. Streak calculation server-authoritative

### 20.3 Background Refresh
- Prefetch tomorrow's set when possible
- Update badge count for incomplete day

### 20.4 App Store Requirements
- Apple Sign In (mandatory)
- Privacy labels
- App Review guidelines compliance

---

## 21. DATASET

### 21.1 Source Options

| Option | Pros | Cons |
|--------|------|------|
| **Bhagavad Gita API** (gita project) | Ready API, open source | External dependency |
| **GitHub JSON repos** | Bundle into DB, offline | Manual import |
| **Vedic Scriptures dataset** | Multiple translations | Verify usage rights |
| **Kaggle datasets** | Structured, easy import | Quality varies |
| **Gita Supersite** | Rich content | Confirm distribution rights |

### 21.2 Recommended Approach for V1
1. Use GitHub JSON repository (self-hosted)
2. Import into Convex `verses` table
3. Store:
   - Sanskrit Devanagari
   - Transliteration (IAST)
   - English translation (clear rights)
4. Add Hindi translation in V2

### 21.3 Verse Data Structure
```json
{
  "chapter": 2,
  "verse": 47,
  "sanskrit": "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन...",
  "transliteration": "karmaṇy evādhikāras te mā phaleṣu kadācana...",
  "translation_en": "You have a right to perform your prescribed duties...",
  "word_meanings": "karmaṇi—in work; eva—only; adhikāraḥ—right...",
  "source": "public_domain"
}
```

---

## 22. ANALYTICS

### 22.1 Events to Track

| Event | Properties |
|-------|------------|
| `app_open` | source, streak_count |
| `today_set_view` | day_number, verses_remaining |
| `verse_read` | verse_id, chapter, position_in_set |
| `verse_bookmark` | verse_id, bucket_id |
| `note_saved` | verse_id, char_count |
| `comment_posted` | verse_id, community_id |
| `day_completed` | day_number, completion_time |
| `streak_updated` | old_streak, new_streak |
| `streak_lost` | previous_streak |
| `community_joined` | community_id, join_method |
| `community_created` | type |

### 22.2 Success Metrics

| Metric | Target (V1) |
|--------|-------------|
| Day 1 completion rate | >60% |
| Day 7 retention | >30% |
| Median streak length | >7 days |
| Community join rate | >20% of users |
| Comments per active user | >0.5/week |

---

## 23. BUILD PHASES

### Phase 1: Reading Loop (Week 1-2)
- [ ] Dataset import to Convex
- [ ] Today tab with 7 cards
- [ ] Swipe right → read
- [ ] Daily set generation (sequential)
- [ ] Streak update logic
- [ ] Basic completion screen

### Phase 2: Bookmarks & Notes (Week 3)
- [ ] Swipe left → action drawer
- [ ] Bucket CRUD
- [ ] Save verse to bucket
- [ ] Private notes per verse
- [ ] Bookmarks tab UI

### Phase 3: Auth & Profile (Week 4)
- [ ] Clerk integration
- [ ] Apple Sign In
- [ ] Profile tab
- [ ] Notification settings
- [ ] Daily reminder setup

### Phase 4: Communities & Leaderboards (Week 5-6)
- [ ] Community create/join
- [ ] Global leaderboard
- [ ] Community leaderboard
- [ ] Active community selection
- [ ] Comments on verses
- [ ] Like comments

### Phase 5: Polish & Launch (Week 7-8)
- [ ] Animations & transitions
- [ ] Offline handling
- [ ] Error states
- [ ] App Store assets
- [ ] TestFlight beta
- [ ] Launch

---

## 24. OPEN DECISIONS

### To Discuss with Pavan Bandhu:

| Question | Options | Recommendation |
|----------|---------|----------------|
| **Mode after 18.78** | 1. Restart sequential, 2. Switch to random, 3. User choice, 4. Completion badge | Option 3 |
| **Top liked across communities** | Yes / No / V2 | V2 |
| **Random order logic** | Fully random / Themed / Spaced repetition | Seeded random with 14-day exclusion |

### Product Decisions:

| Question | Options | Recommended |
|----------|---------|-------------|
| **Streak completion** | 7/7, 5/7, 7+note, 7+comment | 7/7 (simple) |
| **Communities per user** | One only, Multiple+one active, Multiple+all, Multiple+no comments | Multiple+one active |
| **Likes in V1** | Comments only, Verses only, Both, None | Comments only |
| **Streak freeze** | None, Earn 1 per 14 days | None in V1 |

---

## 25. RISKS & MITIGATIONS

| Risk | Impact | Mitigation |
|------|--------|------------|
| Low D1 completion | High churn | Reduce friction, celebrate small wins |
| Streak anxiety | User stress | Consider freeze mechanic in V2 |
| Community spam | Poor UX | Rate limits, report system |
| Dataset rights | Legal | Use verified public domain sources |
| Offline sync conflicts | Data loss | Server-authoritative, queue locally |

---

## 26. GLOSSARY

| Term | Definition |
|------|------------|
| Shloka | Sanskrit verse |
| Adhyaya | Chapter |
| IAST | International Alphabet of Sanskrit Transliteration |
| EAS | Expo Application Services |
| APNs | Apple Push Notification service |

---

## 27. APPENDIX: DECISION LOG

| Date | Decision | Rationale |
|------|----------|-----------|
| TBD | IDE: Cursor vs Windsurf | — |
| TBD | Prototype tool: Bolt vs Rork | — |
| TBD | Client: Expo RN vs SwiftUI | Expo (cross-platform potential) |
| TBD | AI in V1: Yes/No | No (focus on habit loop) |

---

**We Can WORK for Dharma**  
**We Will WORK for Dharma**  
**We Must WORK for Dharma**

*Swastham Shantam Sampoornam* 🙏