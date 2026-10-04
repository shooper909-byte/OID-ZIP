# OID v1 Validation — 2026-08-09

## Scope and disposition

This validation continues the retained 2026-08-08 verified-development evidence. It validates local preproduction hardening only. It did not create cloud resources, spend money, change DNS, deploy publicly, connect real data, or touch live OligoPoly systems.

Result: local application/control validation passed. Production and pilot activation remain gated by external identity, managed infrastructure, provider scanning, revocation evidence, and owner/professional approvals.

## Changes validated

- Fail-closed production environment checks; secure internal sessions; trusted identity-proxy/MFA abstraction; CSRF, CSP/HSTS/security headers, safe errors, structured denials, rate limits, source-secret scan, and non-sensitive health endpoints.
- Explicit RBAC and human authority; server-side authorization for every protected API; narrower System Admin, Operations, Commercial, Auditor, and AI roles.
- Ask OID permission-aware retrieval, field minimization, unknown/scope reporting, evidence-reference validation, and no privileged AI writes.
- Private authenticated documents with path containment, owner-only writes, hash verification, audited download, active duplicate index/advisory lock, and supersession/version handling.
- Nonroot/read-only/capability-dropped container design; separate migration/runtime database URLs; least-privilege PostgreSQL templates.
- Production gate matrix, architecture/identity plans, RBAC matrix, storage/AI reviews, four runbooks, and internal pilot plan.

## Objective results

| Check | Result |
|---|---|
| `npm ci` | PASS; 111 packages installed/audited |
| `npm audit --audit-level=low` | PASS; 0 vulnerabilities |
| Committed-source secret scan | PASS |
| CycloneDX SBOM | PASS; generated |
| `prisma validate` | PASS |
| `prisma generate` | PASS; client 6.19.3 |
| Fresh PostgreSQL 17.10 migration | PASS; 4/4 migrations from empty |
| Migration status | PASS; schema current |
| TypeScript typecheck | PASS |
| Lint | NOT CONFIGURED; no lint script/config in repository |
| Unit/integration/security/e2e | PASS; 4 files, 17 tests, 17 passed |
| Next.js production build | PASS; Next.js 16.3.0 |
| Production-mode HTTP acceptance | PASS; live 200, ready 200, anonymous API 401, bearer search 200, CSP/HSTS/no-store/nosniff present |
| Passing synthetic workflow | PASS; supplier -> PO -> receipt -> quarantine -> sample -> independent test -> human review -> release -> allocation |
| Failed synthetic workflow | PASS; independent FAIL -> HOLD/BLOCKED -> CRITICAL exception -> CAPA/investigation -> REJECTED; release/allocation denied |
| RBAC/AI negative paths | PASS; Auditor and AI server-side release denial; scoped retrieval denial/unknowns |
| Document security | PASS; hash round-trip, audited/authorized download, unauthorized denial, versioning, serial/concurrent duplicate denial, traversal denial |
| Current backup/restore | PASS; source/restore `24 lots / 51 audits / 4 migrations / 3 control triggers`; restored audit tamper rejected |
| Docker Compose execution/image scan | NOT TESTED; Docker is not installed |

Expected Prisma error logs in the integration output are asserted negative tests proving database rejections; they are not suite failures.

## Evidence

New evidence is under `../validation-evidence/2026-08-09/`; the 2026-08-08 evidence was not deleted or overwritten.

- `vitest-results.json`: machine-readable 17/17 result.
- `fresh-migration.txt`, `fresh-migration-status.txt`: empty-database migration evidence.
- `oid-development-20260809.dump`: custom-format backup; SHA-256 `00B9B37F6D31E50041620527668CAAF8175AC777949AA32D1AE183BE45B362D6`.
- `backup-restore-counts.txt`, `restore-audit-trigger.txt`: recovery equivalence and immutable-audit evidence.
- `npm-ci.txt`, `npm-audit.txt`, `npm-audit.json`, `secret-scan.txt`, `sbom.cdx.json`.
- `prisma-validate.txt`, `prisma-generate.txt`, `typecheck.txt`, `next-build.txt`, `production-http-acceptance.txt`.

## Remaining risks and gates

- No production SSO/OIDC tenant/app, MFA policy, end-to-end session revocation, or break-glass drill exists.
- No managed app/database/object storage/secret store/private network/TLS/DNS/monitoring/backup schedule exists; cloud configuration is untested.
- In-memory throttling is per replica. A managed edge/distributed limiter is required for multi-replica deployment.
- Docker execution and image/infrastructure vulnerability scanning were unavailable. SBOM and npm audit do not replace them.
- The local filesystem storage adapter is not the production object-storage adapter. Malware quarantine and orphan-object reconciliation remain required.
- RBAC, quality vocabulary, retention/correction, Founder-reserved decisions, AI data rules, RPO/RTO, and intended legal/regulatory use lack signed approval.
- No penetration test or independent security review has occurred.

## Validation conclusion

Development and local preproduction controls are verified. OID is not authorized to begin a controlled internal production pilot until the external and approval gates in `PRODUCTION_GATE_MATRIX_2026-08-09.md` and the entry criteria in `CONTROLLED_PILOT_PLAN.md` pass.
