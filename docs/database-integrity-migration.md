# Database integrity repair

This migration repairs duplicate daily sets and user-related orphan records.
It does not run automatically during deployment.

## Safety properties

- Both functions are internal-only and can be invoked only through authenticated
  Convex deployment tooling, not by app clients.
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

1. Save a production snapshot in the Convex dashboard.
2. Run the read-only audit and retain its JSON output:

   ```sh
   npx convex run integrityMigration:auditIntegrity '{}' --prod
   ```

3. Review `byType` and every sampled action. Resolve anything unexpected
   before continuing.
4. Confirm the repair function still defaults to no writes:

   ```sh
   npx convex run integrityMigration:repairIntegrityBatch '{}' --prod
   ```

5. Execute one small batch:

   ```sh
   npx convex run integrityMigration:repairIntegrityBatch \
     '{"mode":"execute","confirm":"REPAIR_DATABASE_INTEGRITY","batchSize":5}' \
     --prod
   ```

6. Re-run the audit, inspect application telemetry, then repeat batches until
   `complete` is `true` and a final audit reports `pendingActions: 0`.
7. Run one additional execute batch to prove repeat-run safety; it must report
   zero attempted/executed actions and zero writes.

Never execute these commands against production without a current snapshot and
an approved audit report.
