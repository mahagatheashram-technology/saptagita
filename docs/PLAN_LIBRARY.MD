Plan

Library “Read” History (Option 2)
Summary
Add a Library screen (renamed Bookmarks tab) with a Bookmarks | Read segmented control.
Implement a Read list that shows unique verses you’ve read, sorted Most recent by default with a Canonical toggle.
Build a new Convex query that aggregates readEvents into per‑verse history and returns verse data + last-read metadata.
UI / UX Plan
Tab label: Rename bottom tab “Bookmarks” → Library (icon stays bookmark).
Library header:
Title: “Library”
Subtitle: “Saved and read verses.”
Segmented control:
Two tabs: Bookmarks (default) and Read.
Keep all existing bookmark bucket UI under Bookmarks tab.
Hide bucket creation when Read tab is selected.
Read Tab Layout
Progress summary card
“Read 123 / 701 verses”
Optional small progress bar.
Sort toggle chips
“Most recent” (default) and “Canonical order”.
Read list (FlatList)
Row style similar to BookmarkRow, plus meta line: “Last read Jan 31, 2026”.
Tap row → detail bottom sheet with verse text + actions.
Read Detail Bottom Sheet
Title: Chapter X • Verse Y
Body: Devanagari + transliteration + translation (same as BookmarkDetailSheet style)
Actions:
Add to bucket → opens BucketPickerModal
Quick bookmark → uses bookmarks.quickBookmark
Share verse
Empty / Loading
Empty: “No verses read yet” + CTA “Go to Today”.
Loading: “Loading read history…” placeholder text.
Backend Plan (Convex)
New Query: dailySets.getReadVerses
Args:
userId: Id<"users">
sort?: "recent" | "canonical"
Behavior:
Query readEvents by by_user index for the user.
Aggregate into a map by verseId:
lastReadAt (max), firstReadAt (min), readCount.
Fetch verses docs for unique verse IDs.
Build items: { verse, lastReadAt, readCount }.
Sort:
recent: lastReadAt DESC
canonical: by chapterNumber, then verseNumber
Return:
items
totalReadVerses
totalVerses (use constant 701 to match dailySets logic)
No schema changes required (use existing readEvents + verses).

Frontend Implementation Steps
Update tab label
_layout.tsx: change Bookmarks title to Library.
Library screen refactor
bookmarks.tsx:
Add activeTab state (“bookmarks” | “read”).
Add segmented control UI.
Extract existing content to a BookmarksTabContent block.
Read data hook
useReadHistory.ts (new): useQuery(api.dailySets.getReadVerses, { userId, sort }).
Read list UI components
ReadVerseRow.tsx (new) or place under components/bookmarks/.
ReadVerseDetailSheet.tsx (new) with Add/Bookmark/Share actions.
Wire up Read tab
Use ReadVerseRow in FlatList.
Show summary and sort chips.
Handle empty state + CTA to Today tab.
Integrate BucketPickerModal and quickBookmark.
Date formatting
Use currentUser.timezone (from useCurrentUser) when formatting lastReadAt.
Public API / Interface Changes
New Convex query: api.dailySets.getReadVerses
Returns { items: ReadItem[], totalReadVerses: number, totalVerses: number }
ReadItem: { verse: Verse, lastReadAt: number, readCount: number }
New hook: useReadHistory(userId, sort)
Testing / QA Scenarios
User with no read events → empty state shown, CTA navigates to Today.
User with some reads → list populates, correct counts.
Sort toggle switches between “recent” and “canonical.”
Tap row opens detail sheet; Add to bucket, Quick bookmark, Share all work.
Ensure Bookmarks tab behavior unchanged (bucket creation/rename/delete still works).
Assumptions & Defaults
Unique verses only (no timeline of repeated reads).
Default sort = Most recent.
No full-text search in this iteration.
No “mark as unread” action (to avoid affecting streak logic).