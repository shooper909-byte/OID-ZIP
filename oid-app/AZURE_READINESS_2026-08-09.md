# OID Lean Azure Pilot — Infrastructure Preparation Evidence

Date: 2026-08-09  
Decision: Recommendation B — Lean Azure Pilot  
State: preparation complete; provisioning not authorized

## Superseding environment decision

**UHV AZURE STATUS: PROHIBITED FOR OID**  
**Reason: University authorization was denied.**

The university tenant, subscription, identity, and promotional credit must not be used for OID. This decision supersedes any earlier investigation of that environment. Azure CLI 2.89.0 was subsequently installed, but it must only be authenticated to a verified OligoPoly-controlled tenant.

## Workstation inventory

- Azure CLI: not found during the original inventory; Azure CLI 2.89.0 was subsequently installed. No approved company tenant session exists yet.
- Azure PowerShell session: not detected.
- Azure authentication/subscription/tenant: not testable.
- Provider registrations: not testable.
- Docker, Podman, nerdctl: not found.
- Trivy: not found.
- Temporary official Bicep CLI v0.46.1: used only for offline compilation under `.tmp`; no Azure call made.

## Changes prepared

- Added modular, staging-only Bicep for networking, monitoring, Container Apps, PostgreSQL 17, private Blob storage, Key Vault, managed identity, conditional ACR/application/migration job, diagnostics, backup settings, and workload RBAC.
- Added Azure managed-identity Blob adapter while preserving OID authorization, SHA-256 verification, duplicate detection, version records, and download auditing.
- Added a fail-closed Easy Auth identity bridge that validates tenant, user email/UPN, and MFA proof before injecting OID trusted-proxy headers.
- Added standalone Next.js output and hardened multi-stage runtime/migration images.
- Corrected the document download response type for the current Next.js/TypeScript build.
- Added the approval, secret, identity, and infrastructure-operating documents.

## Objective local evidence

| Validation | Result |
|---|---|
| Bicep offline compile | PASS, zero errors/warnings |
| Identity bridge syntax | PASS |
| Prisma schema validate | PASS |
| Prisma client generate | PASS, v6.19.3 |
| TypeScript | PASS |
| Unit/security tests | PASS, 19/19 |
| Easy Auth identity-bridge negative test | PASS: valid MFA allowed; wrong tenant, absent MFA, and absent identity denied; spoofed internal headers replaced; health remained non-sensitive |
| Next.js production build | PASS |
| Source secret scan | PASS |
| Container configuration checks | PASS, 10/10 |
| npm audit | PASS, 0 vulnerabilities |
| PostgreSQL integration workflow rerun | BLOCKED: no local PostgreSQL/container runtime at `127.0.0.1:55432`; prior evidence remains preserved |
| Container image build/scan | BLOCKED: no builder/scanner |
| Azure validate/what-if | BLOCKED: no Azure CLI/session/subscription |

## Known risks/open gates

- The Bicep template has not been validated by Azure Resource Manager or deployed; API/provider/region compatibility is unproven until `validate` and `what-if` run.
- Entra configuration, MFA claim behavior, session revocation, group restriction, and licensing are design-only.
- Selected-network Key Vault and Blob access from Container Apps must be proven; if service-endpoint behavior is insufficient, a priced private-endpoint revision requires approval.
- PostgreSQL password authentication remains for Prisma because managed-identity token refresh would be a meaningful application/runtime change. Passwords remain TLS-protected, separated, least-privilege, and Key Vault-managed.
- Blob upload occurs before the metadata transaction commits; a database failure may leave an inaccessible orphan object. No authorization or integrity control is weakened, but an audited reconciliation/cleanup procedure is needed before material document volume.
- Application image build, software-bill-of-materials generation, vulnerability scan, immutable digest, and Azure registry push are external gates.
- Point-in-time database restore, Blob recovery, monitoring/alert delivery, and cost-budget alerts require provisioned staging and objective drills.
- Existing Quality, Security, Governance, Legal, and Shelby approvals remain open.

This report does not mark OID ready for pilot and does not supersede `PREPRODUCTION_READINESS_2026-08-09.md` or the production gate matrices.
