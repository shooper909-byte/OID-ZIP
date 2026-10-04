# OID v1 Validation Record — 2026-08-08

## Outcome

The repository is verified as locally buildable and deployable to a controlled development environment. It was not deployed to production. Production validation remains blocked by the unchecked security, infrastructure, owner-review, and governance items in `PRODUCTION_GATE.md`.

## Provenance and environment

- Supplied source archive SHA-256: `9E4B3168EE46A7B1351DBD3B468EE3F5D909C3F8B9A7B81EDCA74F8AB9DDFBEA`.
- EDB PostgreSQL 17.10 Windows binary archive SHA-256: `EF9B1E5E23D2E8A83914BA13D9DC536A72210FBA53FD1808FF1F7E06BB22B106`.
- PostgreSQL: 17.10, isolated on `127.0.0.1:55432` with a dedicated application database and role.
- Node.js: 26.4.0; npm: 11.17.0; Prisma: 6.19.3; TypeScript: 5.9.3; Next.js: 16.3.0; Vitest: 3.2.7.
- Working tree: `C:\Users\Shelby Frederick\Documents\Codex\OID_v1_20260808\oid-app`.

## Changes made

1. Expanded all one-line Prisma enum declarations into valid Prisma syntax without changing any enum member.
2. Added `TestOrder.isIndependent` with a default of `false` and filtered release eligibility to reviewed independent PASS results.
3. Added a database release-transition trigger requiring traceability, human release identity/time, reviewed independent PASS, and no open RELEASE/ALL blocker.
4. Seeded the configured internal actor and Founder assignment so release/allocation/document audit records satisfy the user foreign key.
5. Added PostgreSQL-backed passing and failed workflow tests, direct database bypass checks, concurrent allocation checks, audit immutability checks, and duplicate-document checks.
6. Made core validation cross-platform and added `npm run typecheck`.
7. Upgraded Next.js from 15.5.23 to 16.3.0, renamed `middleware.ts` to `proxy.ts`, adopted required TypeScript settings, and made token comparison timing-safe.
8. Added and retained `package-lock.json`; Docker now installs with `npm ci`.
9. Removed embedded Docker Compose credentials and made database/auth/user values required external inputs.
10. Added a database-count helper used to verify backup restoration.
11. Corrected the seed-file em dash encoding and formatted the seed for maintainability.

## Gate evidence

- `npm install` and clean `npm ci`: passed; 112 packages audited after upgrade.
- `npm audit`: passed with 0 known vulnerabilities.
- `npx prisma validate`: passed.
- `npx prisma generate`: passed.
- Fresh PostgreSQL migration: all 3 migrations applied; `isIndependent` and all 3 triggers verified.
- Seed: passed; demonstration data remains explicitly non-approved.
- `npm run typecheck`: passed.
- `npm run validate:core`: passed.
- `npm test`: passed, 3 files and 9 tests. Machine-readable output: `..\validation-evidence\vitest-results.json`.
- `npm run build`: passed with Next.js 16.3.0/Turbopack.
- Production-mode HTTP gate: login 200; anonymous page 307 to login; anonymous/bad-token API 401; valid bearer and HttpOnly cookie access 200; private-storage URL probe 404.
- Backup/restore: source and restored counts matched at `12 Lot | 24 AuditLog | 3 migrations`; `allocation_guard`, `audit_immutable_update`, and `lot_release_guard` were restored.
- Recovery artifact: `..\validation-evidence\oid-development-20260808.dump`, 135,194 bytes, SHA-256 `874C14844C5923DBA943D530AD39F4F4DBB7DE354B67F2E5126E4A143E99E53B`.

## Synthetic workflow evidence

Passing path:

`Supplier → Purchase Order → Receipt → QUARANTINE Lot → Sample → Independent Test → Human APPROVED Review → RELEASED/PASS → Receipt-derived Inventory → Allocation`

- QUARANTINE allocation was rejected by both service validation and the database trigger.
- Release without testing was rejected.
- A reviewed non-independent PASS was rejected as release evidence.
- A reviewed independent PASS enabled the controlled release transaction.
- Two concurrent 5 g requests against 8 g available yielded exactly one success; 3 g remained after the earlier 2 g allocation.

Failed path:

`Independent FAIL → Human Review → HOLD/BLOCKED → CRITICAL RELEASE Exception → Investigation → CAPA EFFECTIVE/CLOSED → REJECTED/FAIL disposition`

- Release remained blocked even after adding a reviewed independent PASS while the release exception was open.
- Allocation was rejected in HOLD and REJECTED states at both service and database layers.
- RECALLED allocation was also rejected at both layers.

## Remaining risks and production blockers

- No production deployment target was configured or changed.
- TLS termination, managed secrets, network isolation, private object-storage configuration, production backup scheduling/retention, and infrastructure restore are not verified.
- The shared internal token is only a temporary single-owner gate. Access revocation, rate limiting, session lifecycle, and managed SSO are not complete for multi-user use.
- RBAC has not been formally reviewed by the system owner and quality owner.
- Container/image and infrastructure vulnerability scans were not run because Docker and a deployment target were unavailable; npm dependency audit is clean.
- Quality vocabulary, founder-reserved decisions, retention/correction rules, AI retrieval/sensitive-data rules, and any required counsel review remain unapproved.
- Document duplicate detection rejects sequential active duplicates. A database-level partial uniqueness control for simultaneous duplicate uploads is not yet implemented and requires an approved versioning policy.
- The PostgreSQL dump covers the database only. Private document bytes require a coordinated, encrypted backup and restore procedure.
- Node 26 passed locally, while the Docker image remains pinned to Node 22. A Docker build and runtime smoke test remain required on infrastructure with Docker.
