# OID v1 External Services Checklist

Date: 2026-08-09  
Status: **Planning only — no accounts or services have been created**

Use this checklist to inventory what Shelby must already own or authorize. A checked procurement decision is not evidence that a technical production gate passed.

## Accounts and administrative prerequisites

| Check | Account/service | Purpose | Required owner/access | Paid? | Required decision/evidence |
|---|---|---|---|---|---|
| [ ] | Microsoft Entra tenant | Workforce identity, groups, SSO/MFA, disablement | Shelby has verified Global Administrator access; daily administration delegated to least-privilege roles | Tenant may exist; P1 license may cost | Tenant ID, verified domain, license inventory, administrator and break-glass list |
| [ ] | Azure subscription with billing | Own all Azure resources and costs | Shelby is billing owner; technical contributors receive scoped roles | Yes for deployed services | Subscription ID, billing contact, budget ceiling, cost alerts, approved Pricing Calculator export |
| [ ] | Existing DNS-provider account | Domain validation and final CNAME | Shelby or named DNS owner; MFA enabled | Usually existing | Registrar/DNS provider, zone, authorized changer, rollback export; never record password |
| [ ] | Notification destinations | Security/availability/backup alerts | Named primary and backup responders | May use existing mailbox/SMS/on-call service | Tested address/channel and escalation owner |
| [ ] | Source-control/CI account | Versioned IaC, gated builds, scan evidence | Protected organization/repository; federated Azure identity | May fit existing free allowance | Organization owner, branch protection, runner allowance, audit retention |
| [ ] | Security reviewer engagement | Independent architecture, IAM, threat and scan review | Qualified reviewer with documented scope | Likely paid | Statement of work or named internal reviewer; independence and sign-off criteria |
| [ ] | Legal/privacy review | Data classification, notices, retention, agreements | Qualified counsel/privacy owner | Professional time likely paid | Written applicability assessment and accepted controls |
| [ ] | Quality/governance reviewers | Lot-release/evidence/SOP and pilot-governance approval | Named independent Quality and governance approvers | Internal or paid | Signed review scope, change-control and pilot acceptance authority |

## Azure services to provision only after approval

| Check | Service | Environment | Mandatory configuration | Credentials/secrets | Cost expectation |
|---|---|---|---|---|---|
| [ ] | Resource groups, VNet, subnets, private DNS zones | Separate staging/pilot | No overlapping ranges; private endpoint, Container Apps and management subnets; deny public data planes | None | Private endpoints and network traffic billed |
| [ ] | Azure Container Registry Basic | Shared only if access and tags remain environment-isolated; otherwise separate | Admin disabled; managed identity; retention policy; digest pinning | None; federated push and managed-identity pull | Paid daily |
| [ ] | Container Apps workload-profiles environment | Separate staging/pilot | Public network disabled; private endpoint; peer encryption; diagnostics | None | Compute may fit grant; environment/private networking billable |
| [ ] | OIDC identity-gateway Container App | Separate staging/pilot | Approved pinned image; Entra validation; strips spoofed headers; no bypass path | OIDC credential/certificate and `OID_TRUSTED_PROXY_SECRET` from Key Vault | Runtime + review cost |
| [ ] | OID Container App | Separate staging/pilot | Internal ingress only; non-root/read-only where supported; health checks; managed identities; revision rollback | Key Vault references only | Runtime usage |
| [ ] | PostgreSQL Flexible Server 17 | Separate staging/pilot | Private access; TLS; least-privilege runtime/migration users; 35-day PITR; diagnostics | Separate runtime and migration credentials in Key Vault | Paid compute/storage/backups over allowance |
| [ ] | Storage GPv2/Blob | Separate staging/pilot | Private endpoint; public and anonymous access disabled; Shared Key disabled; Hot LRS; versioning and 35-day blob/container soft delete; resource lock | Managed identity, no account key | Paid capacity/operations/versions/private endpoint |
| [ ] | Key Vault Standard | Separate staging/pilot | Private endpoint; public access disabled; RBAC; purge protection; soft delete; logging; expiry alerts | Holds secrets; administrators do not export values | Operations + private endpoint |
| [ ] | Front Door Premium + WAF | Edge with distinct staging/pilot routes/domains | Private Link origin; managed TLS; WAF prevention; route-specific rate limits; logs | No origin shared secret required with Private Link | Paid recurring/usage; quote required |
| [ ] | Entra app registration + P1 Conditional Access | Separate staging/pilot registrations | Single tenant; exact redirects; group assignment required; MFA; legacy auth blocked; disable/revoke procedure | Client certificate/credential in Key Vault | $6/user/month list price unless included |
| [ ] | Azure Monitor, Log Analytics, Application Insights, Action Groups | Separate workspaces or strict environment segregation | Redaction; diagnostic settings; daily caps; alert rules; retention approved | Protected webhook/on-call tokens only if used | Usage-based; some data types/allowances free |
| [ ] | Native PostgreSQL backup + backup storage/vault option | Pilot | 35-day PITR; nightly logical export; restore target isolated; no overwrite-in-place drill | Backup identity scoped write-only where feasible | Native allowance plus storage/vault usage |
| [ ] | Defender for Cloud | Subscription/pilot scope | Registry image vulnerability assessment and CSPM/Containers plan selected deliberately | None | Paid plan; quote required |
| [ ] | Azure Policy | Subscription/resource group | Deny public DB/storage/Key Vault, require diagnostics/TLS/tags/approved regions | None | Core service; remediation/resource costs may apply |

## What may remain free or existing during the pilot

- Existing Microsoft 365/Entra P1 entitlement, if the tenant license inventory proves it is included.
- Existing authoritative DNS service; Azure DNS migration is not required.
- Local Trivy, Checkov and secret scans; CI runner minutes only within an existing allowance.
- Container Apps consumption compute only while within Microsoft's subscription grant. Private endpoints and other selected networking remain billable.
- Azure Activity Log ingestion where Microsoft identifies it as non-billable. Application telemetry and retention must still be budgeted.

No essential production database, private edge, registry or object-store component should be represented as guaranteed free.

## Secret creation worksheet

Never put secret values in this document. Record only the Key Vault secret name, owner and rotation evidence.

| Check | Secret/configuration | Create/obtain from | Used by | Rotation/expiry requirement | Evidence (no value) |
|---|---|---|---|---|---|
| [ ] | Entra OIDC client certificate/credential | Identity owner | Identity gateway | Certificate preferred; alert at 60/30/14 days; rotate before expiry | App credential ID, Key Vault version, expiry date |
| [ ] | `OID_TRUSTED_PROXY_SECRET` | Cryptographic generator | Gateway and OID only | Separate per environment; rotate after exposure and annually or per policy | Key Vault name/version and rotation drill |
| [ ] | PostgreSQL migration credential | Database owner | One-time/controlled migration job | Disable outside migration window where practical; rotate after bootstrap | Principal, Vault version, successful/denied connection tests |
| [ ] | PostgreSQL runtime credential | Database owner | OID runtime | Least privilege; scheduled and incident rotation | Principal, Vault version, rotation test |
| [ ] | Alert integration token | Monitoring owner, only if external notification service used | Action Group | Provider policy and immediate compromise rotation | Integration ID/expiry only |

Managed identities replace storage keys, ACR passwords and Azure service-principal secrets.

## Pre-spend budget worksheet

Shelby must attach a current Azure Pricing Calculator export and fill these fields before provisioning:

- Approved Azure region/data-residency location: ____________________
- Pilot user count: ______
- Pilot duration: ______ days
- Monthly budget ceiling: $________
- Database SKU/storage estimate: ____________________
- Expected Blob GB and monthly operations: ____________________
- Expected telemetry GB/day and retention: ____________________
- Front Door Premium/WAF estimate: $________/month
- Private endpoints/network estimate: $________/month
- ACR estimate: $________/month
- Defender plans estimate: $________/month
- PostgreSQL and backup estimate: $________/month
- Blob/Key Vault/Monitor estimate: $________/month
- Total estimate including contingency: $________/month
- Shelby approval/date: ____________________

## Exit criteria

This checklist closes only when all needed services have named owners, approved costs, configured least-privilege access, and objective validation evidence. Service creation alone is insufficient, and this document must not be used to mark OID ready for pilot.
