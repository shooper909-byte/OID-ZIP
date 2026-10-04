# OID Controlled Internal Pilot Cost Comparison

Date: 2026-08-09  
Decision scope: 1–3 named U.S.-based internal users, low traffic, synthetic/company-controlled pilot data, modest private documents, no customer portal, no WooCommerce, no global performance requirement.  
Execution status: **analysis only — nothing was provisioned, purchased, deployed, or changed in DNS.**

> Cost activation assumptions were refreshed in `AZURE_PILOT_COST_APPROVAL.md` on 2026-08-10 after the Azure Free Account application was declined. Use zero-credit Pay-As-You-Go estimates and the $55 Bicep Azure-consumption budget from that document.

## Executive comparison

All estimates are undiscounted USD retail planning ranges, not quotes. Taxes, support plans, professional review, domain registration, and staff time are excluded. Azure figures use East US retail meters sampled on 2026-08-09; the final budget must use the Azure Pricing Calculator under Shelby's actual agreement.

| Dimension | A. Full Azure enterprise | B. Lean Azure pilot | C. Lean managed non-Azure |
|---|---|---|---|
| Core stack | Front Door Premium/WAF, Container Apps, Entra P1, PostgreSQL Flexible Server, Blob, Key Vault, Monitor, ACR, Defender, Policy, private endpoints | One multi-container Container App, Entra, PostgreSQL Flexible Server with VNet private access, Blob, Key Vault, Monitor, ACR Basic; no Front Door | Cloudflare Access/WAF + Render public identity gateway and private OID service + Render Postgres + private Cloudflare R2 |
| Expected monthly fixed cost | **$370–$455** | **$22–$46** | **$22–$47** |
| Expected usage-dependent cost | **$15–$95** | **$3–$29** | **$3–$18** |
| Estimated pilot total | **$400–$550/month** | **$30–$75/month** | **$25–$65/month** |
| Setup complexity | High | Medium | Medium; deceptively simple hosting but three providers and an identity bridge |
| Security strength | Highest infrastructure isolation and continuous posture tooling | Strong for a controlled 1–3-user pilot; fewer preventive edge/provider controls | Strong application/access baseline, but weaker consolidated governance and shorter default provider evidence retention |
| Vendor lock-in | High Azure service coupling | Moderate Azure coupling; portable container/PostgreSQL remain | Moderate across Render and Cloudflare; operational dependence split across three control planes |
| Operational burden | Highest design and evidence burden | Lowest overall for the accepted Azure direction | Low day-to-day hosting, but cross-provider identity, DNS, logs, backup and incident ownership increase coordination |
| Scalability | Excellent; global edge and private topology already present | Good; add Front Door, private endpoints, Defender, HA and replicas when justified | Good application scaling; enterprise governance or migration later requires more rework |
| Main sacrifice | Cost and speed of setup | Global WAF/CDN, origin Private Link, multi-replica distributed throttling, continuous Defender posture, provider-enforced policy coverage | Single-cloud audit trail, Azure managed identities, 35-day native PITR, provider admin audit on free workspace, and easiest path to the accepted enterprise design |
| Never sacrificed | MFA, TLS, managed secrets, private document authorization, private DB path, backups, monitoring, OID RBAC/audit/release/allocation controls | Same | Same, but the identity adapter and provider-admin evidence require extra validation |

## A. Full Azure enterprise architecture

### Cost model

| Component | Planning amount | Basis |
|---|---:|---|
| Azure Front Door Premium | $330 fixed + requests/transfer | Microsoft's current base fee; WAF and origin Private Link included |
| PostgreSQL Flexible Server B1ms + 32 GiB storage | about $16.10 | East US retail API: $0.017/hour × 730 plus $0.115/GB-month × 32 |
| ACR Basic | about $5.07 | East US retail API: $0.1666/day × 30.4 |
| Private endpoints/private DNS | about $35–$65 | Several hourly endpoints plus data processing and DNS zones; exact count depends on separate staging/pilot topology |
| Container Apps | $0–$35 | Low usage may fit free grants; always-on replicas, gateway/app resources and environment choices can create charges |
| Entra P1 | $0–$18 | $6/user/month paid yearly for 1–3 users, or $0 incremental if already included |
| Blob + Key Vault | $1–$8 | Modest GB, operations, versions, secret operations and networking |
| Monitor/App Insights | $0–$20 | First 5 GB/month in the applicable Analytics Logs tier is free; alerting and excess ingestion/retention can cost |
| Defender for Cloud | $5–$40 | Image/resource/vCore plan selection and number of protected resources drive cost |
| Azure Policy | $0 direct | Policy service itself is not the meaningful cost driver; remediation and retained data can be |
| Backups | $0–$15 | PostgreSQL includes backup storage up to provisioned DB storage; versions, excess backup, logical copies and restore resources cost |

### Appropriate use

Choose this architecture when OID has broader users, public/customer access, multiple replicas, material external threat exposure, formal continuous compliance requirements, or production uptime/scale needs. It is the correct enterprise reference, but its $330 Front Door Premium base fee alone is disproportionate to this internal pilot.

## B. Lean Azure pilot architecture

### Cost model

| Component | Planning amount | Basis |
|---|---:|---|
| Container Apps consumption | $0–$20 usage | One external multi-container revision, min replicas 0 and max 1; compute may fit the monthly grant at low use |
| PostgreSQL Flexible Server B1ms + 32 GiB | about $16.10 fixed | Same private VNet-integrated managed database as the enterprise direction |
| ACR Basic | about $5.07 fixed | Retains private digest-pinned images with managed-identity pull; an existing approved private registry could replace it |
| Entra | $0–$18 fixed | Entra Free Security Defaults can supply MFA; P1 is needed for targeted Conditional Access or if free-policy claim behavior fails acceptance |
| Blob Storage | $0.25–$2 usage | At roughly $0.0208/GB-month, 10–25 GB plus low operations/version history remains small |
| Key Vault Standard | under $1 usage | $0.03 per 10,000 standard operations at sampled retail pricing |
| Azure Monitor | $0–$8 usage | Keep redacted telemetry below 5 GB/month where practical and use limited alert rules/retention |
| Private DNS/network | $1–$5 fixed/usage | PostgreSQL private DNS and VNet integration; no Front Door or private endpoints everywhere |
| Backup copies/restore drills | $1–$6 usage | Native PITR plus encrypted logical copy/object versions; temporary restore resources billed only during drills |

This design keeps the selected Azure control plane, avoids an identity/data migration later, and removes the global-edge and continuous-enterprise tooling that the pilot cannot justify.

## C. Lean managed non-Azure pilot

### Concrete evaluated stack

- Cloudflare Zero Trust Access with independent MFA, deny-by-default named-user policy, managed TLS, Free WAF ruleset and its one Free-plan rate-limit rule.
- A Render Starter public gateway ($7/month) that validates the Cloudflare Access JWT, strips spoofed identity headers, and injects OID's trusted proxy secret/MFA assertion.
- A Render Starter private OID service ($7/month) reachable only on Render's private network.
- Render PostgreSQL Basic-256mb ($6/month) plus minimum practical 5 GB storage ($1.50/month at $0.30/GB); external database access disabled. Paid databases receive PITR, but Hobby retention is only three days.
- Private Cloudflare R2 Standard bucket with public access disabled, AES-256 at rest, bucket-scoped credentials, object version/backup procedure, and application authorization. The first 10 GB-month, one million Class A operations and ten million Class B operations are currently free.
- Render managed environment secrets, seven-day Hobby logs, OID's immutable database audit, and encrypted nightly logical backup to a separate restricted bucket. Render Pro ($25/month) is recommended if provider workspace audit exports and 14-day logs are required.

### Cost model

| Component | Planning amount | Basis |
|---|---:|---|
| Two Render Starter services | $14 fixed | $7 each; one public gateway and one private OID service |
| Render PostgreSQL + 5 GB | $7.50 fixed | Basic-256mb $6 plus $1.50 storage |
| Render Hobby workspace | $0 | Seven-day logs and three-day PostgreSQL PITR; no provider workspace audit export |
| Optional Render Pro workspace | $25 fixed | Adds provider workspace audit evidence and longer logs; strongly recommended if more than Shelby administers hosting |
| Cloudflare Zero Trust/WAF | $0 | Free plan supports a small pilot and one rate-limit rule; exact account limits and log retention apply |
| R2 | $0–$3 usage | Modest storage/operations normally fit the published free tier |
| Backup/monitoring/egress | $3–$11 usage | External log/uptime retention, logical copies, builds and bandwidth above allowances |

### What this option sacrifices

- It needs Cloudflare-controlled DNS/proxying or another supported Access route, creating a larger eventual DNS change than direct Container Apps TLS.
- It creates three provider incident, access, billing and evidence surfaces.
- Render Hobby lacks workspace audit-log export, has seven-day application-log retention, and only three-day database PITR. Paying for Pro improves provider audit evidence but narrows the cost advantage.
- The Cloudflare-to-OID identity bridge is new integration work and must prove MFA claims, user disablement, session revocation and anti-spoofing. It cannot be assumed equivalent before testing.
- R2 document version/recovery and audit correlation require more application/operational assembly than Azure Blob plus Azure Monitor.
- It is not the shortest migration path to the accepted Azure enterprise architecture.

### What this option does not sacrifice

It must still preserve TLS, MFA, explicit named-user access, OID database RBAC, database audit triggers, human release authority, failed-test release/allocation blocks, managed runtime secrets, private document authorization, PostgreSQL internal connectivity, PITR plus logical backups, monitoring, recovery drills and a tested rate limit. If any cannot be demonstrated, this option is not acceptable regardless of price.

## Is Front Door Premium necessary for the pilot?

**No.** Container Apps supplies HTTPS ingress, custom domains and free managed certificates; built-in authentication can require Entra sign-in before requests reach the workload. With one maximum application replica, 1–3 named internal users and no global availability/CDN requirement, OID's existing application throttling plus identity-layer controls can provide the pilot rate limit. Front Door Premium becomes necessary when the organization requires a publicly unreachable Container Apps origin reached through Private Link, distributed multi-replica/global throttling, full edge WAF/bot controls, global routing, or enterprise external exposure.

Front Door Standard at $35/month is also unnecessary on day one: it does not provide the private-origin property that justified Premium and adds little value for this usage profile.

## Day-one classification

| Capability/service | Classification | Pilot decision |
|---|---|---|
| MFA and tested revocation | **MANDATORY FOR SAFE PILOT** | Entra MFA is required; Free Security Defaults are acceptable only if actual OIDC/MFA claims and revocation pass tests |
| TLS and secure cookies/CSRF/CSP | **MANDATORY FOR SAFE PILOT** | Use Container Apps managed TLS; no HTTP or wildcard callbacks |
| OID RBAC, audit, lot release and released-only allocation controls | **MANDATORY FOR SAFE PILOT** | No changes or exceptions |
| Private PostgreSQL network path | **MANDATORY FOR SAFE PILOT** | Flexible Server private VNet integration; no public endpoint |
| Private document authorization/encryption/version/recovery | **MANDATORY FOR SAFE PILOT** | Blob anonymous and Shared Key access disabled; managed identity and application authorization |
| Managed secrets and rotation | **MANDATORY FOR SAFE PILOT** | Key Vault with managed identity; secret values never in repository/image/logs |
| Monitoring, audit alerts and backup/restore drill | **MANDATORY FOR SAFE PILOT** | Lean Azure Monitor plus native/logical backups; evidence required |
| A private image registry | **MANDATORY FOR SAFE PILOT** | Image must be private, scanned and digest-pinned |
| ACR specifically | **RECOMMENDED** | Keep Basic for simplicity/managed identity; an existing approved private registry can substitute |
| Entra P1 licenses | **RECOMMENDED** | Mandatory only when targeted Conditional Access/authentication strength is required or Free Security Defaults fail acceptance; $0 if already included |
| Trivy/secret/IaC scans in CI | **MANDATORY FOR SAFE PILOT** | Free tooling can satisfy the executable gate; retain reports/SBOM |
| Azure Policy | **RECOMMENDED** | Apply a small free built-in deny/audit set if available; do not delay pilot solely for a broad enterprise initiative |
| Private endpoint for Blob/Key Vault | **RECOMMENDED** | Use VNet service endpoints/firewalls and managed identity first; add Private Link if network validation or Security requires it |
| Front Door Premium | **DEFER UNTIL PRODUCTION SCALE** | Not justified by internal usage; add before public/customer/global exposure or mandatory private origin |
| Defender for Cloud paid plans | **DEFER UNTIL PRODUCTION SCALE** | Use Trivy/SBOM/secret/IaC scans now; enable Defender earlier only if Security makes continuous provider scanning a pilot condition |
| Distributed rate limiting | **DEFER UNTIL PRODUCTION SCALE** | Pin max replicas to 1 and validate local/application throttling; distributed enforcement is mandatory before horizontal scaling |
| Private endpoints everywhere | **DEFER UNTIL PRODUCTION SCALE** | Keep database truly private now; use identity + firewall/service endpoint protections for low-risk PaaS data planes |
| Zone-redundant DB HA/global CDN | **DEFER UNTIL PRODUCTION SCALE** | Recovery and rollback remain mandatory; automatic HA/global routing do not |

## Current official sources

- [Azure Front Door pricing: $330 Premium base fee](https://azure.microsoft.com/en-us/pricing/details/frontdoor/)
- [Azure Retail Prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices)
- [Azure Container Apps pricing and free grants](https://azure.microsoft.com/en-us/pricing/details/container-apps/)
- [Container Apps authentication](https://learn.microsoft.com/en-us/azure/container-apps/authentication)
- [Container Apps managed certificates](https://learn.microsoft.com/en-us/azure/container-apps/certificates-overview)
- [Entra MFA with Security Defaults on Free](https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-mandatory-multifactor-authentication)
- [Entra P1 pricing](https://www.microsoft.com/en-us/security/business/microsoft-entra-pricing)
- [PostgreSQL private VNet access](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-networking-private)
- [PostgreSQL compute/storage limits](https://learn.microsoft.com/en-us/azure/postgresql/compute-storage/concepts-compute)
- [PostgreSQL backup/PITR](https://learn.microsoft.com/en-us/azure/postgresql/backup-restore/concepts-backup-restore)
- [Azure Monitor pricing](https://azure.microsoft.com/en-us/pricing/details/monitor/)
- [Render current pricing](https://render.com/pricing)
- [Render private networking](https://render.com/docs/private-network)
- [Render PostgreSQL backups](https://render.com/docs/postgresql-backups)
- [Render secrets](https://render.com/docs/configure-environment-variables)
- [Render audit logs](https://render.com/docs/audit-logs)
- [Cloudflare Access MFA](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/mfa-requirements/)
- [Cloudflare WAF/rate-limit plan availability](https://developers.cloudflare.com/waf/)
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Cloudflare R2 data security](https://developers.cloudflare.com/r2/reference/data-security/)

## Decision

Choose the lean Azure design for the controlled internal pilot. It cuts the estimated monthly range by roughly 80–90% versus the enterprise reference while retaining the accepted identity/data model and avoiding a new cross-provider identity adapter, larger DNS migration and later data-platform migration. The managed alternative is slightly cheaper at its floor, but its provider-audit limitations and three-provider integration risk erase most practical savings once configured to the same evidence standard.

**RECOMMENDATION B — LEAN AZURE**
