# OID v1 Preproduction Readiness — 2026-08-09

## Executive decision

OID v1 has passed every locally completable build, database, security-control, RBAC, document, Ask OID, workflow and recovery check in scope. It has not passed the external managed-service and approval gates required to start a controlled internal production pilot. No production deployment is authorized.

## Gates now closed

- Clean install, zero-vulnerability npm audit, committed-secret scan and CycloneDX SBOM.
- Prisma validation/generation and all five migrations from an empty PostgreSQL 17.10 database.
- Typecheck, Next.js 16.3.0 production build and 21/21 tests.
- Independent reviewed-test release, open-exception blocking, database release guard, released-only allocation, concurrency/nonnegative inventory and immutable audit.
- Passing supplier-to-allocation workflow and failed-test HOLD/exception/CAPA/rejection workflow.
- Explicit RBAC including Founder-only payment authority; Operations cannot override Quality; Commercial is isolated from supplier/document/test/audit/admin records; Auditor is read-only; AI cannot qualify, purchase, pay, release, allocate or close exceptions.
- Ask OID retrieval respects entity/test/exception permissions; unauthorized records are not queried into context and missing scope is reported as unknown.
- Private local documents enforce SHA-256, path containment, authorization, audited downloads, active duplicate prevention and version history.
- Production configuration validation, secure cookies, CSP/HSTS/no-store/nosniff, exact-origin CSRF, safe errors, sensitive-route limits and structured security events.
- Disabled OID users fail authentication. Internal sessions are opaque/hash-only, expiring and individually revocable; logout replay returns 401. Master-token rotation invalidates prior bearers.
- Current database dump/restore has matching counts/migrations/triggers and restored audit immutability.
- Required runbooks, RBAC matrix, identity plan, managed architecture and controlled pilot plan exist.
- Static container hardening checks pass.

## Gates still open

| Classification | Open gate |
|---|---|
| BLOCKED_EXTERNAL | Actual TLS/certificate/DNS; managed Key Vault and secret rotation; Entra SSO/MFA; provider session revocation; private managed PostgreSQL; private Blob/object storage and coordinated recovery; distributed edge rate limiting; central logs/monitoring/alerts; managed backups/PITR/failure alerts |
| NOT_TESTED | Docker image/Compose runtime scan; infrastructure scan; actual public-network denial for database/storage; staging/production resource separation |
| REQUIRES_OWNER_APPROVAL | Provider/region/budget and permission to create staging; RBAC and quality-owner sign-off; Founder-reserved decisions; RPO/RTO; pilot users/duration/go-no-go |
| REQUIRES_PROFESSIONAL_REVIEW | Independent threat model/security/penetration review; business/regulatory/privacy use; records retention/correction/legal hold; AI provider/data/retention rules |

No current gate is `FAIL`.

## What requires Shelby

Shelby must approve the Azure provider/tenant/subscription/region/budget, staging creation, hostname and DNS change, named system/quality/security owners, pilot users and duration, RPO/RTO, Founder-reserved decisions, formal RBAC, intended use, and the eventual pilot go/no-go. These approvals do not authorize real customer/supplier data or live WooCommerce unless separately stated.

## What requires external providers

Microsoft Entra ID/Conditional Access and an identity-aware OIDC proxy; Azure Container Apps and Container Registry; Azure Database for PostgreSQL Flexible Server; private Azure Blob Storage; Azure Key Vault; managed certificates/DNS; Log Analytics/Application Insights; managed backups; and image/cloud configuration scanners. None has been created.

## What requires professional review

A qualified security reviewer must approve the identity/network/threat model and perform image/infrastructure/application testing. The named quality owner must approve workflow vocabulary, release evidence and disposition controls. Governance and counsel must approve intended use, privacy, retention, correction, legal hold, backup objectives and Ask OID data/provider rules.

## Exact recommended production architecture

1. Microsoft Entra ID with OIDC, Conditional Access MFA and phishing-resistant authentication strength.
2. Identity-aware proxy as the only HTTPS ingress; it strips inbound identity headers, validates issuer/audience/signature/nonce/MFA and injects the protected OID identity assertion. OID Container App has internal ingress and cannot be reached directly.
3. Azure Container Apps for Next.js, minimum two production replicas, immutable image digest from private Azure Container Registry, nonroot/read-only filesystem, all capabilities dropped, no-new-privileges, health probes and revision rollback.
4. Azure Database for PostgreSQL Flexible Server 17 using private VNet access/private DNS, public access disabled, TLS required, separate migration and runtime roles, and no runtime DDL/owner rights.
5. General-purpose v2 Azure Blob Storage with private container/private endpoint, public and anonymous access disabled, Shared Key disabled, managed-identity authorization, encryption, versioning, soft delete, deletion protection and access logs.
6. One environment-specific Azure Key Vault per environment with private endpoint, RBAC, purge protection, diagnostic logs and managed-identity secret retrieval.
7. Only TCP 443 exposed at the identity edge. App-to-database 5432 and app-to-Blob/Key Vault/registry/telemetry 443 are private and allowlisted. All other ingress is denied; outbound access is restricted where platform support permits.
8. Separate staging and production subscriptions or, at minimum, separate resource groups, VNets, managed identities, registries, Key Vaults, databases, storage accounts, log workspaces and DNS names. No data cloning from production into staging without an approved sanitized process.
9. PostgreSQL 35-day PITR target plus independently protected encrypted logical backups; Blob versioning plus proposed 35-day soft delete. Quarterly isolated restore drill verifies row counts, five migrations, three database guards, document hashes, RBAC and both synthetic workflows.
10. Log Analytics/Application Insights ingest application/security events, Entra sign-ins, privileged role changes, releases, allocations, critical exceptions, audit-integrity events, PostgreSQL/storage/Key Vault access, deployment changes, health/capacity and backup jobs. Alerts page named owners and follow the four runbooks.

This architecture is specified in `PRODUCTION_INFRASTRUCTURE.md` and `PRODUCTION_IDENTITY_PLAN.md`; creating it requires prior approval.

## Validation evidence

The continuation evidence is in `../validation-evidence/2026-08-09-pilot-readiness/`. Earlier 2026-08-08 and 2026-08-09 evidence was preserved. See `VALIDATION_2026-08-09_PILOT_READINESS.md` and `PRODUCTION_GATE_MATRIX_2026-08-09_PILOT_READINESS.md` for exact results and classifications.

# A. NOT READY

OID is not ready to start a controlled internal production pilot until the mandatory external infrastructure/identity/scanning gates and owner/professional approvals have objective evidence. It remains a verified local preproduction candidate; it is not deployed and is not ready for production.
