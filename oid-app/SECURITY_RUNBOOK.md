# Security Runbook

## Routine checks

Review daily: failed login and authorization-denial rates, privileged role changes, release/allocation/critical-exception events, audit-integrity alert, application/database readiness, backup jobs, storage denials, secret access, image findings, and identity policy changes. Review weekly: dormant/duplicate accounts, Founder use, dependency/image findings, capacity, and unresolved critical exceptions. Review quarterly: role recertification, break-glass drill, database/document restore, and incident exercise.

Structured security events are JSON and omit credentials, tokens, database URLs, document bodies, and sensitive request payloads. Central ingestion must redact configured headers and limit log access. Never enable production debug output or Prisma query/body logging.

## Alert actions

| Alert | Immediate action | Escalate when |
|---|---|---|
| Login/authorization spike | Preserve logs, identify source/user, rate-limit/block at edge, verify IdP | sustained, distributed, privileged target, or any success follows failures |
| Release/allocation anomaly | Place affected workflow on administrative hold without editing history; identify actor and evidence | unauthorized actor, bypass attempt, or released inventory affected |
| Audit-integrity failure | Stop privileged writes, preserve database/log snapshots, page security/quality owners | any trigger disabled, update/delete succeeds, or sequence gap unexplained |
| Critical exception | Notify quality owner, verify lot HOLD/BLOCKED and allocation denial | release/shipment exposure or closure without evidence |
| Database/app unhealthy | Remove failing revision, inspect capacity/connections, invoke recovery if needed | data integrity risk or SLO breach |
| Backup failure | Retry once safely, preserve failure evidence, verify last restorable point | two consecutive failures or RPO threatened |

## Release safety

Do not disable database triggers, rewrite audit records, manually set lot `RELEASED`, or create allocations outside the service. A production repair uses an approved migration/change ticket, backup, two-person review, validation workflow, and immutable audit evidence.

## Secret rotation

Create a new version in the managed vault, roll it to the dependent service, verify health/authentication, revoke the old version, then review access logs. A proxy-secret rotation requires coordinated proxy and OID revision changes. Never place secret values in tickets, chat, source, logs, or validation reports.
