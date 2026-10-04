# Changelog

## 2026-08-11 — Controlled staging pilot closeout

- Classified the deployed environment as **READY FOR CONTROLLED STAGING PILOT — NOT PRODUCTION**, limited to Shelby and synthetic/non-sensitive data on the Azure-generated staging hostname.
- Reconciled live read-only deployment, sole-revision health, liveness/readiness, unauthenticated denial, fresh Easy Auth `pwd,mfa`, enterprise-app/group membership, five workload-identity assignments, immutable runtime digest, private PostgreSQL readiness, empty database baseline, and non-running migration digest evidence.
- Reconciled the existing Entra `amr` optional claim and group-only enterprise-app assignment: Shelby's redundant direct assignment had already been removed, and no identity change was needed during closeout.
- Verified the exact `$55/month` resource-group budget and all five enabled actual/forecast notifications; every notification currently routes to `labs@oligopolypeptides.com`. Recorded the timestamped `$0.0766131652857826 USD` actual/forecast budget baseline with the 8–24-hour cost-ingestion caveat.
- Recorded the current 13-entry resource-group inventory and associated child controls, diagnostics, budget, role assignments, Key Vault secret objects, and Entra pilot objects.
- Identified and preserved the obsolete invalid Key Vault secret object `entra-client-secret`; confirmed the deployed app and workload identity use `entra-oid-client-secret`. No secret was deleted.
- Expanded the operational runbook with startup, scale-to-zero/PostgreSQL shutdown, immutable-image rollback, incident response, isolated backup/restore, controlled secret rotation, cost monitoring, Shelby's eight-section synthetic navigation test, and explicit production/expansion gates.
- Refreshed the staging checklists and deployment report. The authoritative non-synced checkout is not a Git working tree; the active workspace repository has no commits yet on `master` and `OID_v1_working/` is entirely untracked. No files were copied, staged, committed, or pushed.
- Made no Azure/Entra resource, access, user, secret, DNS, schema, migration, or data change during closeout.

## 2026-08-10 — Application-stage predeployment preparation

- Revalidated a clean install, source-secret scan, container hardening, Azure identity bridge, Prisma schema/generation, five current synthetic PostgreSQL migrations, typecheck, 23/23 tests, Next.js production build, and zero-vulnerability npm audit.
- Narrowed the application identity from vault-wide secret access to three secret-scoped assignments so it cannot read PostgreSQL bootstrap-administrator or migration credentials.
- Added explicit application identity/image/migration readiness outputs without enabling experimental Bicep assertions.
- Completed `deployApplication=true`, `deployMigrationJob=false` Bicep build, ARM validation, and what-if using unmistakably validation-only identity/image values: 14 creates, zero modifies, and zero deletes.
- Recorded the deterministic provider URL, revised application-inclusive cost range, and blocking Entra, immutable-image, private-database-role, migration, and connectivity gates. No application resource was deployed.

## 2026-08-10 — OID staging foundation/data deployment

- Registered the nine owner-approved Azure resource providers and verified all 12 required providers are registered.
- Deployed and live-verified the 19 Bicep-declared East US 2 foundation/data resources with `deployApplication=false`, `deployMigrationJob=false`, synthetic-data-only tags, and the $55 monthly budget.
- Verified private PostgreSQL 17/B1ms networking and TLS, protected Blob/Key Vault settings, VNet integration, diagnostics, Log Analytics/Application Insights, five enabled budget notifications, and zero application-stage resources.
- Fixed the cost-management module output to return the approved integer input instead of Azure's provider-normalized float, then completed an idempotent deployment reconciliation and a zero-create/modify/delete post-deployment what-if.
- Recorded Azure's additional provider-managed `Application Insights Smart Detection` action group; it was not declared in Bicep or shown in the approved 19-resource what-if and was preserved without modification.

## 2026-08-10 — Zero-credit Pay-As-You-Go cost controls

- Rebased Lean Azure staging estimates on a company-controlled Pay-As-You-Go subscription with zero promotional credits after the free-account application was declined.
- Added a mandatory resource-group Azure Budget Bicep module with a $55 default and five actual/forecast company-email notifications.
- Verified the company Azure context read-only: subscription Owner, Global Administrator, active Microsoft Customer Agreement, zero existing resources, live ARM validation, and a 19-create/no-delete foundation-data what-if.
- Changed the portable staging default to East US 2 because East US PostgreSQL provisioning is restricted for this subscription; confirmed East US 2 advertises PostgreSQL 17 `Standard_B1ms` and all required resource categories.
- Deferred Entra P1 for the synthetic pilot in favor of Entra Free plus Security Defaults, subject to live MFA evidence; documented the current password-only session, single externally backed administrator, unverified company domain, and nine unregistered providers as blockers.
- Documented minimum, normal, worst-expected, and retained-idle monthly ranges plus safe PostgreSQL stop, Container Apps scale-to-zero, and full synthetic-staging teardown options.
- Preserved the permanent UHV prohibition and all OID identity, RBAC, audit, release, allocation, private-storage, TLS, secret, backup, and PostgreSQL integrity controls.

## 2026-08-09 — Preproduction hardening

- Added fail-closed production configuration validation, exact-origin CSRF checks, secure opaque internal sessions, security headers/CSP/HSTS, safe production errors and logs, structured security denials, bounded sensitive-route throttling, and non-sensitive liveness/readiness probes.
- Added database-backed production actors, trusted identity-proxy abstraction with MFA assertion, explicit Founder/System Admin permissions, human-only quality authority, narrower Commercial/AI roles, permission-aware search/Ask OID retrieval, and negative route tests.
- Hardened private documents with traversal protection, exclusive `0600` writes, authenticated audited downloads, SHA-256 verification, active-hash uniqueness, concurrent duplicate serialization, and document supersession/version tests.
- Hardened container/compose defaults, split migration/runtime database credentials, documented least-privilege grants, pinned required dependency install scripts, added committed-secret scanning, and generated a CycloneDX SBOM.
- Added production gate/RBAC/identity/infrastructure/AI/storage documentation, incident/security/access/backup runbooks, and the controlled internal pilot plan.
- Added a fifth migration for opaque, hash-only, individually revocable sessions and distinct logout auditing; proved replay denial after revocation.
- Made payment authorization an explicit Founder-only permission and added negative tests for unauthorized allocation, Operations/Quality separation, disabled users, Commercial restrictions, Auditor read-only access, and AI privilege exclusions.
- Added a dependency-free static container-configuration security check; executable image and infrastructure scanning remain externally gated.

## 1.0.1 — 2026-08-08

- Made the Prisma enum syntax valid without changing any status vocabulary.
- Added explicit `TestOrder.isIndependent` provenance and restricted release eligibility to reviewed independent PASS results.
- Added a database-level lot-release transition guard alongside the existing allocation and immutable-audit guards.
- Added PostgreSQL-backed passing and failed-lot workflow tests, concurrency checks, duplicate-document handling, and direct database bypass tests.
- Seeded the configured internal actor and Founder role assignment so audited application writes satisfy foreign keys.
- Upgraded to Next.js 16.3.0, migrated middleware to Proxy, added timing-safe token comparison, and cleared the npm dependency audit.
- Made core validation cross-platform, added a typecheck script, locked dependency installation, and hardened Docker secret injection.
- Tested clean migration, production build, local production access behavior, and PostgreSQL dump/restore recovery.

## 1.0.0 — 2026-08-07

Completed OID MVP source architecture through M4:

- M0 Foundation
- M1 Traceability
- M2 Control
- M3 Intelligence
- M4 Migration

Added canonical Prisma-compatible PostgreSQL initialization migration, production internal access gate, RBAC, document hashing/storage adapter, Command Center and drill-down screens, exception/action/CAPA/decision controls, organization records, search, Ask OID evidence responses, migration conflict controls, Docker packaging, production gate, and validation runbook.
