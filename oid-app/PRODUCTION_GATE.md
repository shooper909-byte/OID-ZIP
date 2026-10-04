# OID v1 Production Gate

Do not represent OID as production-validated until all items below are complete and recorded.

## Build and database

- [x] `npm install` and clean `npm ci` succeed from the configured npm registry; lockfile retained.
- [x] `npx prisma validate` passes.
- [x] `npx prisma generate` passes.
- [x] All five migrations apply cleanly to a disposable PostgreSQL 17.10 database.
- [x] Forward-recovery procedure tested by custom-format dump/restore with row-count and trigger verification.
- [x] `npm run build` passes with Next.js 16.3.0.
- [x] Unit/integration/e2e suite passes: 4 files, 21 tests.

## Critical controls

- [x] Attempted allocation from QUARANTINE fails at service and database layers.
- [x] Attempted allocation from HOLD/REJECTED/RECALLED fails at service and database layers.
- [x] Attempted release without reviewed independent PASS fails at service and database layers; a reviewed non-independent PASS is insufficient.
- [x] Attempted release with an open RELEASE/ALL blocker fails at service and database layers.
- [x] Failed test places the lot into HOLD/BLOCKED and creates a CRITICAL release-blocking exception.
- [x] Concurrent over-allocation produces one success and one database rejection; final availability remains non-negative.
- [x] Audit UPDATE/DELETE attempts fail at the database trigger.
- [x] A second active document with the same SHA-256 is rejected by the document service.

## Traceability exercise

Run one synthetic passing lot through:

Supplier -> PO -> Receipt -> Lot -> Sample -> Lab -> Test -> Review -> Release -> Inventory -> Allocation

Run one synthetic failing lot through:

Test failure -> HOLD -> Exception -> CAPA/investigation -> final disposition

Retain screenshots/logs as validation evidence.

- [x] Passing synthetic workflow completed through allocation.
- [x] Failed synthetic workflow completed through HOLD, exception, CAPA/investigation, and REJECTED disposition.
- [x] Machine-readable test log retained at `../validation-evidence/vitest-results.json`.

## Security

- [ ] Replace all sample credentials and tokens.
- [ ] Use TLS at the reverse proxy/load balancer.
- [ ] Use a managed secret store.
- [ ] Confirm database is not publicly exposed.
- [ ] Confirm private document storage is not publicly exposed.
- [x] Test PostgreSQL backup and restore on the isolated development database; production scheduling and private-file backup remain deployment work.
- [ ] Test production-IdP access revocation. Local inactive-user denial, individual session revocation/replay rejection, logout, and master-token rotation are tested; Entra/OIDC revocation remains external.
- [ ] Review RBAC with system owner and quality owner.
- [ ] Replace the internal single-token gate with SSO before multi-user deployment.
- [ ] Perform full vulnerability/dependency/image scanning. `npm audit` reports 0 vulnerabilities; target container/image and infrastructure scanning remain outstanding.

## Governance

- [ ] Quality owner approves workflow/status vocabulary.
- [ ] Counsel reviews business/regulatory use where appropriate.
- [ ] Data-retention and correction policies are approved.
- [ ] Founder-reserved decisions are confirmed.
- [ ] AI retrieval scope and sensitive-data rules are approved.

## Validation status

Local application, database, and control gates passed again with security hardening on 2026-08-09. Production deployment remains blocked by the unchecked external security and governance items above. See `VALIDATION_2026-08-08.md`, `VALIDATION_2026-08-09.md`, and `PRODUCTION_GATE_MATRIX_2026-08-09.md`.
