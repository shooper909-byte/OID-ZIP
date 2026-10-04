# Backup and Recovery Runbook

## Scope and objectives

Proposed targets pending owner/governance approval: database RPO <= 15 minutes, document RPO <= 24 hours, service RTO <= 8 hours. Managed PostgreSQL PITR and private object versioning/soft delete are required; an encrypted logical backup provides an independent recovery path.

## Backup checks

Daily automation must verify last successful database backup/PITR point, storage protection status, logical-backup job, backup-vault health, immutability/soft-delete state, age against RPO, and alert delivery. The application identity must not be able to delete backups.

## Quarterly isolated restore drill

1. Open an approved drill record; select a timestamp and record source backup IDs without exposing secrets.
2. Restore PostgreSQL into an isolated private recovery server with no application/public access.
3. Restore/copy matching object versions into an isolated private container.
4. Apply no new migrations until the restored schema version is recorded. Run `prisma migrate status` and compare migration table entries.
5. Verify table row counts, foreign-key consistency, release/allocation/audit triggers, audit update/delete rejection, active-document existence and SHA-256, role assignments, and synthetic pass/fail controls.
6. Measure achieved RPO/RTO; record hashes, commands, results, failures, and reviewer.
7. Destroy drill resources only after evidence retention approval, using the provider's recoverable deletion protections.

## Production recovery

Incident commander chooses PITR or logical restore. Restore to new infrastructure rather than overwriting the source. Validate privately, rotate credentials, reapply firewall/private DNS rules because restores may not preserve them, compare source/restore deltas, obtain security and quality sign-off, then switch traffic. Preserve the original read-only for forensics. Any post-restore reconciliation is append-only and audited.

## Local evidence

The 2026-08-08 isolated PostgreSQL custom-format dump/restore verified row counts and control triggers. The new 2026-08-09 validation repeats an isolated fresh migration and backup/restore check. This proves the procedure locally, not managed-service scheduling or production recoverability.
