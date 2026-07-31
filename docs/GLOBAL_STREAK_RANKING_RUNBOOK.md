# Global Streak Ranking Release Runbook

The global Top 5 and Top 50 queries use the existing streak index and remain
available independently of this migration. The aggregate is used only for the
signed-in user's exact global rank.

This runbook does not authorize a production deployment. An authorized release
owner must run these steps after the reviewed Convex code is deployed and
before the Android rollout begins.

## Configuration decision

The ranking aggregate uses a lazy root and `maxNodeSize` 64. The larger node
size reduces write overlap from the package default while keeping exact-rank
reads logarithmic. Changing it later requires clearing and fully rebuilding the
tree, so production must initialize it with 64.

## Pre-production rehearsal

Run the entire sequence on an isolated development or staging deployment first.
Verify that normal streak reconciliation, debug utilities, and rank #1 and #11
scenarios leave the aggregate count and exact ranks correct.

## Production initialization

1. Record the reviewed source commit and take a deployment backup.
2. Deploy the reviewed Convex functions using the normal authorized backend
   release process.
3. Confirm the aggregate is not ready yet:

   ```bash
   npx convex run --prod streakRankingMigration:getGlobalStreakRankingStatus '{}'
   ```

4. Clear and initialize the tree exactly once with the approved tuning:

   ```bash
   npx convex run --prod streakRankingMigration:resetGlobalStreakRanking \
     '{"confirm":"RESET_GLOBAL_STREAK_RANKING","maxNodeSize":64}'
   ```

5. Run the resumable page mutation repeatedly. Each successful page stores its
   cursor, so the empty argument object resumes from the last completed page:

   ```bash
   npx convex run --prod streakRankingMigration:backfillGlobalStreakRankingPage '{}'
   ```

   Repeat until the response reports `isDone: true` and `ready: true`. Do not
   run reset again merely because a page invocation failed; fix the failure and
   resume with another empty argument object.

6. Confirm the durable completion state:

   ```bash
   npx convex run --prod streakRankingMigration:getGlobalStreakRankingStatus '{}'
   ```

   Required result: `initialized: true`, `ready: true`, `maxNodeSize: 64`, a
   populated `completedAt`, and no cursor.

7. With authenticated release-test accounts, verify one user inside the Top 5
   and one outside it. The latter must show the peach exact-rank row.

## Failure behavior and monitoring

Until the backfill is ready, Top 5 and Top 50 continue to work. Exact personal
rank fails closed and logs an explicit client error instead of presenting an
uninitialized aggregate as a valid missing rank.

During rehearsal and staged rollout, monitor Convex mutation failures, OCC
retries, aggregate component writes, query latency, and rank/count drift. Pause
the rollout if retries or rank inconsistencies rise materially.

## Deliberate community-leaderboard follow-up

This release bounds the requested global Top 5 and Top 50 paths. The existing
community leaderboard still reads all members of the selected community and is
therefore bounded by community size, not by a fixed query limit. Replacing it
properly requires a maintained per-community ranking projection (including
membership joins and streak updates); that schema/write-path change is outside
this release. Do not describe this PR as eliminating every unbounded Social
query. Schedule that projection before allowing communities to grow without a
documented membership cap.
