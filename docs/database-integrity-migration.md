# Database integrity repair

This migration repairs duplicate daily sets and user-related orphan records.
It does not run automatically during deployment.

## Safety properties

- Both functions require `ADMIN_MAINTENANCE_TOKEN`.
- `repairIntegrityBatch` defaults to `dryRun`.
- Writes additionally require `mode: "execute"` and the exact confirmation
  phrase `REPAIR_DATABASE_INTEGRITY`.
- Repairs are bounded to at most 25 planned items per invocation.
- Every action re-reads its target before writing and is safe to retry.
- Duplicate daily sets retain a completed record when one exists, use the
  earliest valid completion timestamp, repoint user state, and merge read
  events. Valid reads that cannot remain sequence progress are retained as
  rereads.
- Orphan read events/bookmarks are reassigned when their authoritative parent
  and referenced verse still exist. Irrecoverable records are deleted.

## Production procedure

Deploy the functions and index first. Do not combine deployment with a repair
execution.

1. Set a unique deployment secret:

   ```sh
   npx convex env set ADMIN_MAINTENANCE_TOKEN '<random-secret>' --prod
   ```

2. Save a production snapshot in the Convex dashboard.
3. Run the read-only audit and retain its JSON output:

   ```sh
   npx convex run integrityMigration:auditIntegrity \
     '{"token":"<random-secret>"}' --prod
   ```

4. Review `byType` and every sampled action. Resolve anything unexpected
   before continuing.
5. Confirm the repair function still defaults to no writes:

   ```sh
   npx convex run integrityMigration:repairIntegrityBatch \
     '{"token":"<random-secret>"}' --prod
   ```

6. Execute one small batch:

   ```sh
   npx convex run integrityMigration:repairIntegrityBatch \
     '{"token":"<random-secret>","mode":"execute","confirm":"REPAIR_DATABASE_INTEGRITY","batchSize":5}' \
     --prod
   ```

7. Re-run the audit, inspect application telemetry, then repeat batches until
   `complete` is `true` and a final audit reports `pendingActions: 0`.
8. Run one additional execute batch to prove repeat-run safety; it must report
   zero attempted/executed actions and zero writes.
9. Rotate or remove `ADMIN_MAINTENANCE_TOKEN` after the repair window.

Never execute these commands against production without a current snapshot and
an approved audit report.
