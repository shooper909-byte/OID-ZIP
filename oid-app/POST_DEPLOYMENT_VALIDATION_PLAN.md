# OID v1 Post-Deployment Validation Plan

Date: 2026-08-09  
Status: **NOT TESTED — no deployment exists**

## Evidence rules

- Run first in staging with synthetic data and repeat the required subset against the isolated pilot environment before activation.
- Record UTC timestamp, environment, application image digest, infrastructure-plan digest, tester, role, request/correlation ID and raw artifact path.
- Redact tokens, cookies, secret values, connection strings and sensitive payloads. Hash each evidence file and maintain an index.
- Expected denial is a passing result only when the denial is explicit, no state changes, and the denial/audit event is recorded.
- Any result without objective evidence is `NOT_TESTED`, not `PASS`.

## Tests after each infrastructure change

| Change | Tests immediately required | Evidence to retain | Failure response/rollback |
|---|---|---|---|
| Entra app/Conditional Access/group change | Approved user MFA success; no-MFA denial; unassigned user denial; wrong tenant/audience denial; disabled-user denial; session/token revocation; break-glass alert | Sanitized sign-in logs, policy/app export, HTTP results and audit event | Disable new policy/app assignment or revert last known export; block gateway route if bypass possible |
| Key Vault/identity/secret change | Public access denial; authorized managed-identity read; unauthorized identity/user denial; secret reference works; old version fails after rotation; access logged; source/image/log secret scan | Vault/RBAC/network export, audit event IDs, rotation and scan output | Revoke identity, restore prior secret version where safe, rotate all possibly exposed credentials, roll back app revision |
| PostgreSQL/network/migration change | Public connection denied; private TLS succeeds; runtime cannot migrate/admin; migration principal cannot exceed scope; `prisma migrate status`; schema validate/generate; smoke transaction; backup active | Connection outputs without credentials, server config, migration table/status, audit/diagnostic logs | Stop route, roll back app revision; restore isolated backup if migration recovery is required; never manually rewrite release/audit data |
| Blob/RBAC/data-protection change | Anonymous/public/Shared-Key/user direct access denied; authorized app upload/download succeeds; SHA-256 mismatch rejected; duplicate detection; new version retained; soft-delete recovery; download authorization and audit event | Storage config/RBAC, HTTP status, object/version IDs, hashes and correlated application/provider logs | Remove app role, disable route, restore prior version, rotate any exposed authorization; do not enable public access |
| Container image/revision change | Repeat npm gates; secret scan; SBOM; Trivy/Defender scan; non-root/read-only/runtime health; digest pin; rollback to previous revision | CI logs, SBOM, scan JSON, digest/provenance, revision/health/rollback log | Block promotion, restore traffic to last approved digest, preserve failed image for analysis without running it |
| Front Door/WAF/rate-rule change | Origin private; direct origin request fails; TLS/HSTS/CSP/cookies; WAF blocks test payloads; route limits return 429; ordinary usage unaffected; client IP/traces correct | Edge config, TLS scan, request/response corpus, WAF and app correlation | Disable/revert rule or route; never open origin as workaround |
| DNS/certificate change | Authoritative and recursive DNS answers; certificate hostname/chain/expiry; TLS 1.2+; correct Front Door endpoint; origin remains private; rollback record valid | Before/after zone export, `Resolve-DnsName`/TLS outputs and Front Door certificate state | Restore recorded DNS value, disable route, invalidate wrong hostname; do not point directly to Container Apps |
| Monitor/alert/retention change | All sources ingest; trace crosses edge/gateway/app; authentication, RBAC denial, privileged action, WAF, Key Vault, storage, DB and backup alerts fire; two humans receive/acknowledge; log sample contains no secrets/sensitive bodies | Source matrix, query results, alert IDs/timestamps/receipts, redaction sample | Restore prior rule/query; if audit source is lost, suspend affected pilot function or pilot |
| Backup/retention change | Current backup success; PITR to isolated server; logical restore; Blob version/soft-delete/vault recovery as configured; reconciliation and RPO/RTO; failure alert | Provider jobs, restore commands/targets, row/entity/hash counts and timed report | Restore prior policy; keep pilot inactive until a clean drill; source remains untouched |
| Azure Policy/IaC/RBAC change | Plan scan; drift scan; policy compliance; public-network denies; privilege diff; staging/pilot separation | Plan/diff, Checkov/Trivy output, Policy export, RBAC/resource graph exports | Revert reviewed IaC, remove unauthorized assignment, disable affected identity; require re-review |

## Application and security acceptance suite

| ID | Test | Actor/input | Expected result and audit evidence |
|---|---|---|---|
| AC-01 | Lot release authorization | Unauthenticated, Commercial, Operations, Auditor, AI | Denied; lot unchanged; denial/audit recorded |
| AC-02 | Valid lot release | Authorized Quality human with MFA after independent passing test and review | Release succeeds once; actor/time/evidence/status transition audited |
| AC-03 | Inventory allocation authorization | Unauthenticated, Commercial without allocation authority, Auditor, AI | Denied; allocation and inventory unchanged; denial audited |
| AC-04 | Released-only allocation | Authorized allocator attempts quarantined, failed, unreleased or exhausted lot | Denied with no mutation and appropriate exception/audit event |
| AC-05 | Operations/Quality separation | Operations attempts test review, release or override | Denied; Quality decision unchanged; audit recorded |
| AC-06 | Commercial isolation | Commercial requests restricted supplier, security, audit and document records, including through Ask OID | Denied/not retrieved; no sensitive fields in response/logs; audit recorded |
| AC-07 | Auditor read-only | Auditor attempts every create/update/delete/release/allocate/exception-close endpoint | All denied; no state change; audit evidence retained |
| AC-08 | AI privilege boundary | AI attempts supplier approval, purchase/payment authorization, lot release, allocation and critical-exception closure | All denied; no state change; attempt/audit retained |
| AC-09 | Ask OID authorization | Same query issued by users with different roles/record scopes | Only authorized records/citations returned; inaccessible record identifiers/content absent |
| AC-10 | Disabled user | Sign in, then disable user/remove group and revoke sessions | Existing and new access fail within approved revocation SLA; attempt logged |
| AC-11 | Revoked session | Revoke one active session without disabling user | Revoked session fails; other behavior follows policy; revocation audited |
| AC-12 | Document download | Authorized and unauthorized users request sensitive document | Authorized retrieval validates SHA-256 and creates audit event; unauthorized retrieval denied and audited |
| AC-13 | Header spoofing | External client supplies every trusted identity/MFA/proxy header | Gateway strips/replaces headers; request denied unless valid OIDC session exists |
| AC-14 | CSRF/cookie/session | Cross-origin unsafe requests, missing/invalid CSRF, insecure cookie inspection, logout/replay | Unsafe requests denied; cookies Secure/HttpOnly/SameSite per design; replay/revoked token denied |
| AC-15 | Rate limiting | Burst login, Ask OID, document download and mutation routes from controlled sources | Edge returns 429 at approved thresholds; alert/log emitted; ordinary workflow remains usable |
| AC-16 | Sensitive logging | Trigger auth errors, validation errors, document actions and failed database/storage calls | No passwords, tokens, cookies, secrets, connection strings or sensitive document bodies in logs |

## End-to-end passing workflow

Execute through the normal UI/API with separate named human roles and synthetic records:

1. Authorized supplier approver creates and approves a synthetic supplier.
2. Authorized purchasing user creates/authorizes a purchase order; verify AI and other roles cannot authorize it.
3. Operations records receipt and creates a quarantined lot; allocation must fail now.
4. Authorized sampler creates a sample with chain-of-custody evidence.
5. Independent tester records a passing test; tester must not perform the human Quality release unless separately authorized by the approved matrix.
6. Quality human reviews complete evidence and releases the lot.
7. Authorized inventory actor allocates only the released lot within available quantity.
8. Reconcile every status, quantity, evidence link and chronological immutable audit event in both the live and restored data sets.

Pass requires the exact supplier → PO → receipt → quarantined lot → sample → independent test → human review → release → allocation sequence, no bypass, and complete audit linkage.

## Failed-test workflow

1. Create a second synthetic receipt, quarantined lot and sample.
2. Record an independent failed test (also repeat with missing/incomplete evidence if the SOP requires).
3. Confirm a critical/required exception is created with correct lot, test, owner, severity and state.
4. Attempt release as Operations, AI, unauthorized user and authorized Quality. Every release attempt must fail while the failed-test condition is unresolved/non-releasable.
5. Attempt allocation as every role including otherwise authorized inventory staff. Every attempt must fail.
6. Attempt to close the critical exception as AI and unauthorized humans. All must fail; authorized closure must follow approved SOP and must not automatically release the lot.
7. Confirm denial attempts and exception lifecycle are audited and retrievable only by permitted roles.

Any release or allocation in this path is an immediate **FAIL** and pilot stop.

## Recovery and rollback drills

| Drill | Method | Required reconciliation | Acceptance |
|---|---|---|---|
| Container revision | Send staging traffic to previous approved digest | Health, auth and synthetic read checks | Service restored within approved RTO; no database rollback or audit loss |
| PostgreSQL PITR | Restore to new isolated server at a timestamp before a controlled synthetic mutation | Table counts, key entities, audit chain and release/allocation state | Within approved RPO/RTO; source untouched |
| Logical database restore | Restore encrypted `pg_dump` to clean isolated PostgreSQL | Schema/migrations, row counts, constraints and workflow records | Repeatable with documented commands and no credentials in artifacts |
| Blob recovery | Recover prior version and soft-deleted test object/container | SHA-256, metadata, version history, authorization and audit | Exact content restored within RTO |
| Secret rotation | Rotate proxy/OIDC/database secret using new version and revision | Old credential denied; new revision healthy; event/expiry alert visible | No bypass or unplanned outage beyond RTO |
| DNS/edge rollback | Revert test hostname CNAME/disable Front Door route | DNS answer, certificate/route state, origin privacy | External pilot access removed within approved window |

## Monitoring acceptance

Minimum dashboards/alerts:

- Front Door availability, 4xx/5xx, WAF blocks and rate-limit spikes.
- Gateway/OID authentication failures, invalid issuer/audience/MFA, identity-header rejection and session revocation.
- Privileged OID actions and denials: supplier approval, purchasing/payment, test review, lot release, allocation, critical-exception closure and document download.
- Container revision health, restart/crash, latency and dependency failures.
- PostgreSQL connections, storage, CPU/memory, errors, backup status and restore-job failure.
- Blob/Key Vault authorization failures, public-network policy changes, secret access/expiry and destructive operations.
- Azure Activity Log changes to RBAC, policy, DNS/Front Door, networking, backup and diagnostic settings.
- Budget forecast/thresholds and telemetry daily-cap approach.

Every critical alert must have a named owner, backup owner, severity, response SLA, runbook link, test timestamp and acknowledgement evidence.

## Final evidence index and decision

| Area | Result status | Evidence location/hash | Reviewer/date | Defects/exceptions |
|---|---|---|---|---|
| Identity/revocation | NOT_TESTED |  |  |  |
| Network/TLS/DNS | NOT_TESTED |  |  |  |
| Secrets | NOT_TESTED |  |  |  |
| Database/migrations/backups | NOT_TESTED |  |  |  |
| Blob/document controls/recovery | NOT_TESTED |  |  |  |
| Container/IaC scans | NOT_TESTED |  |  |  |
| Monitoring/alerts/redaction | NOT_TESTED |  |  |  |
| RBAC/AI/Ask OID negative tests | NOT_TESTED |  |  |  |
| Passing workflow | NOT_TESTED |  |  |  |
| Failed-test workflow | NOT_TESTED |  |  |  |

Do not mark OID ready for a controlled pilot from this plan. Readiness can change only after deployment is separately authorized, every mandatory test has objective evidence, all failures are resolved, and all required signatures are complete.
