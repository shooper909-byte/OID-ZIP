# Incident Response

## Severity

- SEV-1: confirmed unauthorized release/allocation, audit tampering, credential compromise with privileged access, material data disclosure, or production unavailable with no safe workaround.
- SEV-2: attempted control bypass, contained account compromise, repeated backup failure threatening RPO, or serious degradation.
- SEV-3: isolated denied attempt, non-sensitive defect, or policy deviation without impact.

## Process

1. Declare incident, timestamp it in UTC, name incident commander, security lead, quality lead, and scribe.
2. Contain reversibly: revoke identity sessions, disable affected OID user, block source, remove compromised revision, rotate secret, and place affected lots/workflows on hold. Never delete evidence or weaken controls.
3. Preserve evidence: export central logs, Entra sign-ins, deployment/config history, database snapshot/logical backup, object version metadata/hashes, alerts, and exact affected IDs. Record chain of custody and hashes.
4. Determine scope: actors, roles, records, documents, lots, allocations, time window, and whether controls actually changed state.
5. Eradicate root cause through reviewed change. Restore only from verified evidence. Re-run migrations, security tests, passing/failed workflows, and hash/audit checks.
6. Recover gradually: staging, one internal pilot user, then approved users. Heighten monitoring and keep affected lots blocked until quality review.
7. Notify Shelby immediately for SEV-1/2. Legal/privacy/quality owners determine external notification obligations; engineers do not speculate or notify customers/suppliers independently.
8. Complete a blameless post-incident report within five business days: timeline, impact, root cause, evidence, remediation, control gaps, owner, due date, and effectiveness test.

Emergency actions do not authorize production deployment, data destruction, audit editing, or quality override.
