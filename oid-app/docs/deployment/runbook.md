# OID Controlled Staging Pilot Operational Runbook

Status: **READY FOR CONTROLLED STAGING PILOT — NOT PRODUCTION**  
Scope: existing `oid-staging-rg`, Shelby only, synthetic/non-sensitive data only  
Current app: `oid-staging-app-qgvnukjcy7jwk` in East US 2  
Current hostname: `https://oid-staging-app-qgvnukjcy7jwk.jollyfield-2bcf5822.eastus2.azurecontainerapps.io`

This runbook does not authorize resource, identity, access, DNS, secret, schema, or data changes. Commands that change state are examples for a separately approved maintenance or incident ticket. Before any such command, record the operator, UTC time, exact target, approval, expected diff, rollback owner, and evidence location. Use the explicit Azure CLI path on this Windows host when `az` is not on `PATH`: `C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd`.

## Fixed pilot boundaries

- Do not add users or assignments; Shelby remains the only direct member of `OID-STAGING-PILOT-USERS`.
- Do not run Prisma or Azure migration jobs.
- Do not connect or enter real data.
- Do not add a custom domain or change DNS.
- Do not weaken MFA, Easy Auth, OID RBAC, audit immutability, independent-test release, HOLD/BLOCKED behavior, or released-only allocation.
- Do not delete `entra-client-secret`; it is an identified obsolete invalid object pending separate cleanup approval.
- Do not commit or push without separate source-control authorization.

## Daily preflight and startup

1. Confirm the signed-in Azure tenant/subscription and the `oid-staging-rg` tags identify staging and `synthetic-internal-pilot-only`.
2. Check open incidents, maintenance, restore, migration, secret-rotation, or cost holds. Do not start if any hold is active.
3. Check the PostgreSQL server state. If it is `Stopped`, obtain the approved pilot-window ticket and start only `oid-staging-pg-qgvnukjcy7jwk`:

   ```powershell
   az postgres flexible-server start --resource-group oid-staging-rg --name oid-staging-pg-qgvnukjcy7jwk
   ```

4. Wait for PostgreSQL `Ready`; do not change SKU, storage, networking, backup, or authentication settings.
5. Confirm the Container App still has `minReplicas=0`, `maxReplicas=1`, one active revision, 100% traffic, and the approved runtime digest.
6. Send an approved authenticated request to the existing hostname. HTTP ingress wakes a scale-to-zero revision; do not raise the minimum replica count.
7. Require HTTP 200 from `/api/v1/health/live` and `/api/v1/health/ready`, then verify Shelby's authenticated page render. Confirm the current sign-in evidence contains MFA.
8. Review recent health, authentication, authorization, Key Vault, storage, PostgreSQL, and deployment logs. Record the preflight result before synthetic testing.

## Shutdown and scale-to-zero

Container Apps already uses HTTP scale `0–1` with a 300-second cooldown. End all pilot requests, log out, and wait at least the cooldown period; verify the active revision reaches zero replicas without changing its revision, traffic, ingress, or scale configuration. A later HTTP request can wake it. Azure documents that scale-to-zero has no application usage charge, although other resources continue to incur cost.

Stopping PostgreSQL is a separate, state-changing cost action:

1. Confirm no application request, document write, backup/restore, secret rotation, incident preservation, or approved job is running.
2. Capture health, last restorable point, open synthetic workflow count, active revision/digest, and cost state.
3. Obtain explicit approval for the exact server and window, then run:

   ```powershell
   az postgres flexible-server stop --resource-group oid-staging-rg --name oid-staging-pg-qgvnukjcy7jwk
   ```

4. Verify state `Stopped`; expect readiness to fail while the database is stopped. Do not treat this planned failure as pilot readiness loss.
5. PostgreSQL Flexible Server automatically starts after seven days. The operator must calendar that boundary, re-check state/cost daily, and either use the approved startup procedure or obtain a new stop approval. No automatic shutdown automation is authorized.

## Application rollback

1. Declare the change/incident, stop pilot testing, preserve logs/configuration, and confirm data compatibility. Never roll back across an incompatible schema.
2. Record the current revision, runtime digest, migration digest, traffic, replica state, Key Vault references, and database migration state.
3. Prefer redeploying the last approved immutable runtime digest through the reviewed Bicep/application pipeline. Do not edit a running container or use a mutable tag.
4. In single-revision mode, keep the current revision serving until the replacement is provisioned, healthy, and ready. If a prior revision is retained and reactivation/traffic change is chosen, that is a separately approved Azure mutation.
5. Verify liveness, readiness, MFA, Shelby-only access, negative authorization, database connectivity, audit immutability, release denial, and allocation denial before resuming.
6. If the failure may have changed data or schema, do not perform an app-only rollback; use the recovery procedure and quality/security review.

## Incident response

Use `INCIDENT_RESPONSE.md` and `SECURITY_RUNBOOK.md` as the detailed authorities.

1. Classify severity, timestamp in UTC, and name incident commander, security lead, quality lead, and scribe.
2. Contain reversibly within the approved incident authority: stop testing, revoke affected session/user access, remove a compromised revision, rotate a compromised secret, or place synthetic workflows on HOLD. Never delete evidence or weaken controls.
3. Preserve Log Analytics/Easy Auth, deployment/activity, Entra sign-in/assignment, PostgreSQL, Key Vault, storage, health, alert, configuration, and image-digest evidence. Do not record secret values.
4. Determine whether any unauthorized release/allocation, audit change, access expansion, real-data entry, or secret exposure occurred.
5. Recover through a reviewed immutable image or isolated restore; run the full negative and positive control checks before Shelby resumes.
6. Shelby must be notified immediately for SEV-1/2. No external notification is made without the authorized legal/privacy/quality decision.

Immediate stop conditions include unauthorized access, MFA/RBAC bypass, audit mutation, incorrect release/allocation, negative inventory, object/hash loss, inability to revoke, restore failure, secret exposure, real-data entry, or monitoring blindness.

## Backup and restore

Use `BACKUP_RECOVERY_RUNBOOK.md` for full evidence requirements. The current 35-day managed PostgreSQL backup setting and local dump/restore evidence do not by themselves prove a managed staging restore.

1. Daily, record PostgreSQL state and last restorable window, Blob versioning/change-feed/soft-delete controls, diagnostic ingestion, and alert state.
2. Before any approved schema/configuration change, capture the current migration table, row-count baseline, three database guard states, document hashes/versions, app revision/digest, and a separate encrypted logical backup where authorized.
3. For a drill or incident, restore PostgreSQL to a new isolated private server; never overwrite the source. Restore/copy the matching private object versions into an isolated private container.
4. Before any cutover, verify migrations, critical row counts, foreign keys, `allocation_guard`, audit update/delete rejection, lot-release guard, role assignments, document SHA-256, and both synthetic pass/fail workflows.
5. Record achieved RPO/RTO, discrepancies, reviewers, and retained evidence. Cutover and cleanup each require separate approval; preserve the source read-only for forensics until release is authorized.

## Secret rotation

1. Open an approved rotation ticket naming the secret, dependent service, owner, expiry, test, rollback, and old-version revocation time. Never place a secret value in source, chat, logs, command history, or the ticket.
2. Create a new Key Vault version through an approved private data-plane path. Keep the versionless secret name unless a reviewed design requires pinning.
3. Confirm the workload identity is scoped only to the required secret. For Entra rotation, use `entra-oid-client-secret`; do not use or delete obsolete `entra-client-secret` during routine rotation.
4. Restart or replace the dependent Container App revision so it loads the new value. A Key Vault update alone is not sufficient evidence that a running revision refreshed it.
5. Verify health, MFA login, negative access, database/storage access as applicable, and absence of secret values in logs. Then revoke/expire the old credential version and prove it is denied.
6. Preserve Key Vault access logs, revision/digest, test results, and reviewer approval. Roll back by re-enabling the immediately prior valid version only under the ticket; investigate any unexpected access.

## Cost monitoring

The active resource-group budget is `$55/month`; it alerts but does not cap or stop spend. Cost and usage data commonly lags 8–24 hours and budgets are evaluated periodically.

| Notification | Type | Threshold | Dollar reference | Recipient |
|---|---|---:|---:|---|
| `earlyActual55Percent` | Actual | 55% | `$30.25` | `labs@oligopolypeptides.com` |
| `earlyForecast73Percent` | Forecast | 73% | `$40.15` | `labs@oligopolypeptides.com` |
| `criticalActual90Percent` | Actual | 90% | `$49.50` | `labs@oligopolypeptides.com` |
| `criticalForecast95Percent` | Forecast | 95% | `$52.25` | `labs@oligopolypeptides.com` |
| `azureResourceCeiling100Percent` | Actual | 100% | `$55.00` | `labs@oligopolypeptides.com` |

At pilot start/end each day, record timestamped month-to-date actual, forecast, cost by resource type, resource inventory, PostgreSQL state, and Container App replica state. Investigate any new resource/SKU, replica above one, PostgreSQL auto-start, log-ingestion spike, restore resource, egress, license, or spend trajectory above the approved worst-case range. At any alert: acknowledge it, compare inventory/configuration to baseline, stop nonessential synthetic testing, scale the app to zero, and obtain approval before stopping PostgreSQL. Escalate before the budget is reached; at `$55` or an unexplained forecast, freeze new activity and seek Shelby's decision. Add `azure-noreply@microsoft.com` to the recipient mailbox's approved senders and retain notification-delivery evidence.

## Shelby synthetic navigation test

- **Command Center:** verify every metric renders and reconciles after the exercises.
- **Suppliers:** use only a `SYNTHETIC-PILOT-` supplier; verify qualification/risk/evidence boundaries.
- **Lots & Traceability:** run a complete synthetic pass path through reviewed independent PASS, release, and released-only allocation; verify exact PO/receipt/item links and timeline.
- **Exceptions:** run a synthetic fail/inconclusive path; verify HOLD/BLOCKED, exception, investigation/CAPA, and release/allocation denial.
- **Actions:** inspect a synthetic action's owner, priority, due date, status, and audit event.
- **Decisions:** record a synthetic evidence-linked human decision; verify unauthorized approval is denied.
- **Ask OID:** query only synthetic records; verify evidence, conflicts, unknowns, actions, and confidence remain separate and read-only.
- **Migration:** view only; verify no batch runs, no source connects, and nothing is automatically approved.

Finish by logging out, reviewing the audit trail, confirming zero negative inventory and no real data, and recording issues/decisions.

## Production and expansion gates

- Production requires separate production architecture/spend, availability, restore, security, penetration, governance, quality, legal, retention, training, monitoring, and signed go/no-go evidence.
- Additional users require named approval, MFA, least-privilege role mapping, assignment, denial-path validation, revocation testing, and recurring access review.
- A custom domain requires verified ownership, approved DNS/certificate/ingress design, change window, rollback, and separate authorization.
- Migration execution requires a fresh backup, approved migration role/digest/schema diff, disposable rehearsal, maintenance/rollback plan, explicit run authorization, and post-run reconciliation.
- Real data requires classification/minimization, source and legal/privacy/security approvals, connector/access design, recovery and reconciliation coverage, completed synthetic-pilot sign-off, and explicit real-data authorization.

## References

- Azure Container Apps scaling: https://learn.microsoft.com/azure/container-apps/scale-app
- Azure Container Apps revisions: https://learn.microsoft.com/azure/container-apps/revisions
- PostgreSQL Flexible Server limits/start-stop behavior: https://learn.microsoft.com/azure/postgresql/configure-maintain/concepts-limits
- Azure budgets: https://learn.microsoft.com/azure/cost-management-billing/costs/tutorial-acm-create-budgets
