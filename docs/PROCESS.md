# Sapta Gita – Development Process

This document explains **how we work with AI assistants** (T3 Chat + Cursor)
and how each task should be executed and documented.

It is meant so that:
- Future sessions with T3 Chat can resume smoothly
- Any developer (or future AI) can understand the workflow
- The code-editing agent (Cursor) knows what is expected after each task

---

## 1. Roles

### 1.1 T3 Chat (Orchestrator – GPT-5.1 Reasoning)

- Has **no direct access** to the repo or runtime.
- Designs phases and tasks.
- Writes detailed task prompts for the code agent (Cursor).
- Specifies:
  - Context
  - Requirements
  - Files to modify/create
  - Output expectations
  - Success criteria
  - Report-back template
  - Documentation updates to perform
- Helps with:
  - Architecture decisions
  - API and schema design
  - Debugging based on error messages and screenshots
  - Test plans and dev tools

### 1.2 Cursor / Repo-aware Agent (Implementer)

- Has **direct access** to the codebase.
- Executes the task prompts produced by T3 Chat.
- Modifies/creates files, runs type checks, and locally verifies behavior.
- Fills in `[AGENT: ...]` placeholders in docs with real values from the repo.
- Updates documentation files as instructed (PROJECT_STATUS, CHANGELOG, etc.).

### 1.3 Human (You)

- Acts as the bridge between T3 Chat and Cursor.
- Copies prompts from T3 Chat into Cursor.
- Runs the app and manually tests the behavior.
- Reports results back to T3 Chat using the provided report templates.
- Decides priorities and approves changes.

---

## 2. Standard Task Loop

For every task (e.g., `Task 2.1: Swipe Left Action Drawer`), follow this loop.

### Step 1 – Start / Resume with T3 Chat

When opening a new T3 Chat session:

1. Open `docs/PROJECT_STATUS.md`.
2. Copy its full contents into the T3 Chat prompt.
3. Add a short line like:

   > “Continuing Sapta Gita development. Current task: 2.1 Swipe Left Action Drawer.”

4. Optionally:
   - Paste the most recent relevant entries from `docs/CHANGELOG.md` (if useful).
   - Describe any current issues you are seeing (screenshots, error messages, etc.).

T3 Chat will then:
- Confirm understanding of the current state.
- Generate a **detailed task prompt** for Cursor:
  - Context and constraints
  - Exact files to create/modify
  - Code snippets or full modules
  - Expected behavior and tests
  - A report-back template

### Step 2 – Execute in Cursor

1. Open the Sapta Gita repo in Cursor.
2. Copy the **entire prompt block** from T3 Chat into a new Cursor chat.
3. Let Cursor:
   - Edit/create files
   - Run `tsc`, `npx expo start`, or other checks as it sees fit
   - Follow instructions about documentation updates
4. If Cursor asks for clarification that only T3 Chat can give (e.g., product decisions),
   you answer or go back to T3 Chat for a refined prompt.

### Step 3 – Manual Testing

After Cursor finishes:

1. Run the app (typically):

   ```bash
   npx convex dev     # in one terminal
   npx expo start     # in another
   ```

2. Follow the **Success Criteria** section from the task prompt.
3. Use dev tools if relevant (for example, the DevPanel in the Profile tab for streak testing).
4. Note:
   - Whether each checklist item passes
   - Any visual issues
   - Any runtime or TypeScript errors

### Step 4 – Report Back to T3 Chat

Return to T3 Chat and provide:

1. The **Report Back Template** from the task prompt, filled in:
   - `TASK X.Y STATUS: COMPLETE / PARTIAL / BLOCKED`
   - Checklist with [YES/NO] or comments
   - Issues and questions (if any)
2. Screenshots if relevant (visual features).
3. Any unexpected behavior you observed.

T3 Chat will then:

- Decide whether the task is truly complete or needs another iteration.
- Possibly refine the same task or move to the next task.
- Update the overall phase plan if needed.
- Generate the next task prompt for Cursor.

---

## 3. Documentation Responsibilities

We maintain three key docs:

- `docs/PROJECT_STATUS.md` – high-level snapshot (ALWAYS share with T3 Chat).
- `docs/CHANGELOG.md` – detailed history (updated per task).
- `docs/ARCHITECTURE.md` – technical reference (updated when architecture changes).

### 3.1 After Each Task

The **Cursor agent** should:

1. **Update `PROJECT_STATUS.md`:**
   - Mark the current task as complete (✓).
   - Set `Current Task` to the next planned task.
   - Update `Last Updated` date.
   - Add/remove any key files/decisions if they changed.

2. **Append to `CHANGELOG.md`:**
   - Add an entry at the top:
     - Task number and name
     - Date
     - What was built
     - Files created/modified
     - Any issues resolved
   - Do not reorder or heavily edit old entries unless explicitly asked.

3. **Update `ARCHITECTURE.md`** when:
   - The database schema changes.
   - The folder structure changes.
   - New important patterns (hooks, services, providers) are introduced.
   - Dependencies significantly change.

### 3.2 `[AGENT: ...]` Placeholders

Wherever a doc contains:

```markdown
[AGENT: ...]
```

The **Cursor agent** must fill it with real values based on the repo
(e.g., actual dependencies, actual file paths, `tree` output).

T3 Chat **does not** edit those sections directly.

---

## 4. Naming and Structure of Tasks

- Tasks follow the format: `Phase.TaskNumber` (e.g., `1.6`, `2.1`).
- Phases are thematic:
  - Phase 1: Reading Loop
  - Phase 2: Bookmarks & Notes
  - Phase 3: Auth & Profile
  - Phase 4: Communities & Social
  - Phase 5: Polish & Launch
- Each task has:
  - A clear title
  - A concrete set of deliverables
  - Success criteria and a report-back template

---

## 5. Testing Conventions

- Use the **DevPanel** (Profile tab) for:
  - Streak testing (force complete day, simulate next day, simulate missed day).
  - Resetting progress to verse 1.1.
  - Inspecting userState, streaks, dailySets, readEvents.

- After any change, at minimum:
  - Launch the app and ensure no red error screens.
  - Verify that the **Today** tab still works (7 cards, swipe right to complete).
  - Run type checks if possible:
    - `npx tsc --noEmit`

For new features, each task defines a small test plan under “Success Criteria”.

---

## 6. Starting a Completely New Session (Cold Start)

If you come back after a long break or on a new machine:

1. Open the repo and pull latest changes.
2. Open `docs/PROJECT_STATUS.md` to see:
   - Current phase and task
   - Tech stack and tables
   - Current issues.
3. Start a new T3 Chat conversation:
   - Paste `PROJECT_STATUS.md`.
   - Add: “Resuming work; please give me the next task prompt.”
4. Follow the standard loop (T3 Chat → Cursor → Manual Test → Report Back).

---

_Last updated: 2026-01-04_
```