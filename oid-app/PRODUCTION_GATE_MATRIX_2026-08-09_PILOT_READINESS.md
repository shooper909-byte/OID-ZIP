# OID v1 Production Gate Matrix — Pilot Readiness

Assessment date: 2026-08-09. Allowed classifications are `PASS`, `FAIL`, `BLOCKED_EXTERNAL`, `REQUIRES_OWNER_APPROVAL`, `REQUIRES_PROFESSIONAL_REVIEW`, and `NOT_TESTED`. A local design or test is not evidence that a future managed resource is configured correctly.

| Gate | Classification | Objective evidence | Exact next action |
|---|---|---|---|
| Clean dependency installation | PASS | Final `npm ci` completed; lockfile retained | Preserve evidence on every release |
| Dependency vulnerability audit | PASS | `npm audit --audit-level=low`: 0 vulnerabilities | Continue release-time audit and SBOM review |
| Source secret scan | PASS | Committed-source scan passed | Keep real secrets outside source |
| CycloneDX SBOM | PASS | `sbom.cdx.json`, 137,226 bytes | Attach to image/release scan |
| Prisma schema/client | PASS | Validate and generate passed with Prisma 6.19.3 | Preserve sequence after every clean install |
| Fresh PostgreSQL migrations | PASS | All five migrations applied to empty PostgreSQL 17.10 | Run with migration-only role in staging |
| Typecheck | PASS | `tsc --noEmit` passed | Retain release evidence |
| Unit/integration/security workflows | PASS | 4 files, 21/21 tests | Retain machine JSON |
| Next.js production build | PASS | Next.js 16.3.0 optimized build passed | Build immutable image by digest |
| Passing synthetic workflow | PASS | Supplier through released-only allocation passed | Repeat in staging |
| Failed-test workflow | PASS | FAIL -> HOLD/BLOCKED -> CRITICAL exception -> CAPA -> REJECTED; allocation denied | Repeat in staging |
| Backup/restore drill | PASS | Source/restore matched `42 Lot / 105 AuditLog / 5 migrations / 3 triggers`; restored audit mutation rejected | Repeat using managed PITR and object backup |
| TLS-ready application configuration | PASS | HTTPS origin validation, HSTS and secure cookies; production HTTP check confirms headers | Preserve; terminate only at approved TLS edge |
| Actual TLS certificate/HTTPS endpoint | BLOCKED_EXTERNAL | No provider endpoint, certificate or DNS exists | Shelby approves provider/hostname; configure staging TLS and scan it |
| Managed secrets architecture | PASS | Key Vault/private endpoint/managed identity design; no committed secret; split migration/runtime credentials | Security owner reviews design |
| Actual managed secret store and rotation | BLOCKED_EXTERNAL | No vault or production secret exists | After approval, create staging vault, rotate and audit |
| Least-privilege database design | PASS | Separate migration/runtime URLs and SQL grant/verification templates | Apply and verify on staging role |
| Production DB private networking | NOT_TESTED | Local DB is loopback; production DB does not exist | Create approved staging private PostgreSQL; prove public 5432 denial |
| Local private document controls | PASS | Path containment, `0600`, SHA-256, authenticated/audited download, duplicate lock/index, version history and negative tests | Preserve adapter contract |
| Production private object storage | NOT_TESTED | Blob architecture documented; no bucket/container exists | Create approved staging private endpoint; prove public/anonymous/Shared Key denial |
| Object encryption and recovery | BLOCKED_EXTERNAL | Managed encryption/versioning/soft-delete design only | Configure approved staging storage; restore objects and verify all hashes |
| SSO/MFA integration plan | PASS | Entra OIDC/Conditional Access trusted-proxy plan and fail-closed MFA assertion adapter | Security/identity owner reviews claims and topology |
| Actual production SSO/MFA | BLOCKED_EXTERNAL | No Entra application, proxy or Conditional Access policy exists | After approval, configure staging and run identity acceptance tests |
| Inactive OID user denial | PASS | Database-backed actor rejects non-active user | Repeat through staging IdP |
| Individual internal session revocation | PASS | Opaque hash-only session, logout 200, replay 401; integration revocation test | Preserve as emergency/internal bootstrap control |
| Master bearer revocation | PASS | Token rotation invalidates prior bearer in negative test | Store/rotate only through managed vault |
| Production IdP session revocation | BLOCKED_EXTERNAL | No provider session exists to revoke | Disable staging user, revoke tokens, measure denial latency |
| Formal RBAC implementation review | PASS | Explicit role matrix; server/service denials; Founder-only payment authority | Retain code review evidence |
| System-owner and quality-owner RBAC approval | REQUIRES_OWNER_APPROVAL | No signed owner approval | Shelby and named quality owner sign assignments/toxic-combination rules |
| Unauthorized lot release | PASS | Auditor and AI route calls return 403; Operations/System Admin lack release permission | Repeat with staging users |
| Unauthorized inventory allocation | PASS | Auditor service allocation fails `FORBIDDEN:inventory.allocate`; DB state guards remain | Repeat through staging API when exposed |
| Operations cannot override Quality | PASS | Operations lacks test review, release, exception close and CAPA close | Owner/quality sign matrix |
| Commercial restricted-data isolation | PASS | Commercial lacks supplier/document/test/audit/admin reads; negative assertions pass | Confirm UI/API with staging account |
| Auditor read-only | PASS | All Auditor permissions are reads; negative assertions pass | Confirm staging session |
| AI privileged actions prohibited | PASS | AI lacks supplier qualify, PO write, payment authorize, release, allocation and exception close; human gate denies release | Preserve nonhuman actor gate |
| Ask OID retrieval isolation | PASS | Missing entity permission rejects; test/exception records are never queried without read permission; unknowns reported | Repeat adversarial review before external model use |
| Ask OID data/provider governance | REQUIRES_PROFESSIONAL_REVIEW | No approved field allowlist/provider legal-security review | Security, governance and counsel approve provider, retention and sensitive fields |
| Security headers/CSP/cookies/CSRF | PASS | Production check: CSP/HSTS/no-store/nosniff present; exact-origin tests; Secure/HttpOnly/SameSite session cookie | Re-scan actual HTTPS endpoint |
| Authentication/sensitive-route rate limiting | PASS | Login and sensitive routes have bounded limits; unit exhaustion test passes | Add managed edge/distributed limiter before multi-replica pilot |
| Distributed rate limiting | BLOCKED_EXTERNAL | Current limiter is per process | Configure managed edge limiter and prove multi-replica enforcement |
| Sensitive-data logging protection | PASS | Structured event allowlist; production errors redact unexpected details; production DB logs error-only | Central pipeline redaction test remains external |
| Central logging/monitoring/alerting | BLOCKED_EXTERNAL | Runbook/spec exists; no Log Analytics/Application Insights workspace | After approval, configure staging and trigger every critical alert |
| Backup scheduling/PITR/failure alerts | BLOCKED_EXTERNAL | Local dump/restore passed; no managed schedule/PITR alert exists | Configure managed backups; induce safe failure and restore |
| Security/access/incident/recovery runbooks | PASS | Required four runbooks exist and reflect revocable sessions | Owner/security tabletop and sign-off |
| Static container configuration hardening | PASS | Automated checks: nonroot, read-only, cap-drop, no-new-privileges, internal DB network, no DB port, split DB credentials | Keep check in CI |
| Container image/Compose runtime scan | NOT_TESTED | Docker runtime unavailable | Build by digest in staging; scan OS/packages/config; block high/critical findings |
| Infrastructure security scan | NOT_TESTED | No deployed infrastructure exists | Scan IaC/cloud configuration after approved staging creation |
| Independent threat model/penetration review | REQUIRES_PROFESSIONAL_REVIEW | No independent assessment exists | Qualified security professional reviews and retests remediation |
| Staging/production separation design | PASS | Separate subscriptions/resource groups/VNets/identities/vaults/DB/storage/logs/DNS specified | Preserve architecture boundary |
| Actual staging/production separation | NOT_TESTED | Neither environment exists | Create staging first only after Shelby approval; verify no shared resources |
| Quality workflow/status vocabulary | REQUIRES_OWNER_APPROVAL | Controls tested but no signed quality approval | Named quality owner approves vocabulary and disposition rules |
| Founder-reserved decisions | REQUIRES_OWNER_APPROVAL | Permissions explicit; reservations not confirmed | Shelby confirms reserved actions and delegates |
| Retention/correction/legal-hold policy | REQUIRES_PROFESSIONAL_REVIEW | Proposed values only | Governance/security/counsel approve records schedule and correction procedure |
| Business/regulatory/privacy use | REQUIRES_PROFESSIONAL_REVIEW | No legal opinion or approved intended-use statement | Shelby defines intended use; qualified counsel reviews |
| RPO/RTO and pilot go/no-go | REQUIRES_OWNER_APPROVAL | Proposed targets and entry criteria only | Shelby and named owners approve targets, users, duration and start |

## Result

No gate is classified `FAIL`. All locally completable code/control gates now have objective evidence. External managed services, actual SSO/private networking/object storage/TLS/monitoring/scanning, and owner/professional approvals remain mandatory pilot-entry blockers.
