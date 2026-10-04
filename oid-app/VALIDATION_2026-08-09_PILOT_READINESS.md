# OID v1 Pilot-Readiness Validation — 2026-08-09

## Scope

This continuation preserved `VALIDATION_2026-08-08.md`, `VALIDATION_2026-08-09.md`, and both earlier evidence directories. No deployment, paid resource, DNS change, real data, WooCommerce connection or live OligoPoly change occurred.

## Additional hardening

- Added explicit Founder-only `payment.authorize`; AI and Procurement cannot authorize payment.
- Added a fifth migration with opaque 256-bit browser sessions stored only as SHA-256 hashes, expiry, individual revocation, active-user checks and `LOGOUT` audit events.
- Added negative evidence for unauthorized allocation, Operations/Quality separation, expanded Commercial isolation, Auditor read-only behavior, disabled users, bearer rotation, individual session revocation/replay and all requested AI exclusions.
- Added dependency-free static container configuration scanning.

## Final results

| Validation | Result |
|---|---|
| `npm ci` | PASS; 111 packages installed, 112 audited |
| `npm audit --audit-level=low` | PASS; 0 vulnerabilities |
| Source secret scan | PASS |
| CycloneDX SBOM | PASS; 137,226 bytes |
| Prisma validate/generate | PASS; client 6.19.3 |
| Empty PostgreSQL 17.10 migration | PASS; 5/5 migrations |
| Typecheck | PASS |
| Lint | NOT CONFIGURED |
| Unit/integration/security/e2e | PASS; 4 files, 21/21 tests |
| Next.js build | PASS; 16.3.0 optimized build |
| Passing synthetic workflow | PASS through release and allocation |
| Failed synthetic workflow | PASS through HOLD, exception, CAPA and REJECTED disposition; release/allocation denied |
| Production HTTP/security | PASS; live/ready 200, anonymous 401, bearer 200, CSP/HSTS/no-store/nosniff |
| Login/session revocation | PASS; login 200, cookie-authenticated request 200, logout 200, revoked replay 401 |
| Backup/restore | PASS; source/restore `42 Lot / 105 AuditLog / 5 migrations / 3 triggers`; restored audit mutation rejected |
| Static container configuration | PASS; ten hardening assertions |
| Executable container/infrastructure scan | NOT TESTED; Docker and infrastructure unavailable |

Expected Prisma errors in the integration output are asserted service/database denials and not failures.

## Evidence

New evidence is isolated at `../validation-evidence/2026-08-09-pilot-readiness/`.

- Machine tests: `vitest-results.json` (21 passed, 0 failed).
- Migration: `fresh-migration.txt`, `fresh-migration-status.txt`.
- Recovery: `oid-development-20260809.dump`, SHA-256 `CA835C05ED9C54F8F79D9C77036EE12747B20E87AC6E204EEB6ADA399F527C27`; `backup-restore-counts.txt`; `restore-audit-trigger.txt`.
- Supply chain: `npm-ci.txt`, `npm-audit.txt`, `npm-audit.json`, `secret-scan.txt`, `sbom.cdx.json`.
- Build: `prisma-validate.txt`, `prisma-generate.txt`, `typecheck.txt`, `next-build.txt`.
- Runtime/security: `production-http-acceptance.txt`, `container-config-scan.txt`, `docker-runtime.txt`.

## Remaining risks

- Entra/OIDC/MFA, provider disablement/revocation and direct-ingress denial are not configured.
- Managed private hosting, PostgreSQL, Blob, Key Vault, TLS/DNS, logging/alerts and backup/PITR do not exist.
- Docker/image/infrastructure scanning and independent security testing remain unperformed.
- Per-process rate limiting requires a managed distributed edge control for multi-replica use.
- The production object-storage adapter, malware quarantine, orphan reconciliation and coordinated object recovery remain external work.
- Owner, quality, security, governance and legal approvals remain unsigned.

## Conclusion

The local repository is fully revalidated and materially closer to pilot readiness, but the mandatory external and approval gates prevent pilot activation.
