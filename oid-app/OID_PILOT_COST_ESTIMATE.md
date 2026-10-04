# OID Controlled Internal Pilot Cost Estimate

Date: 2026-08-09  
Currency/region: USD retail planning estimate, East US where region-specific  
Workload: 1–3 internal users, low traffic, 10–25 GB private documents, 32 GiB PostgreSQL, less than 5 GB/month retained application telemetry  
Status: **estimate only — no purchase, service, deployment, or DNS authorization**

## Estimation method

- Azure compute/storage meters were queried from Microsoft's unauthenticated Retail Prices API on 2026-08-09 and checked against the official service pricing pages.
- Use 730 hours/month and 30.4 days/month for planning.
- Ranges include light use and small recovery drills, not professional services, tax, support contracts, staff time or production HA.
- Provider grants/free tiers are not SLAs and can change. The upper end assumes some compute/log/alert usage exceeds free allowances.
- Shelby must replace this document with a dated Azure Pricing Calculator export under the actual subscription agreement before provisioning.

## Detailed monthly estimate

### A. Full Azure enterprise reference

| Line item | Fixed estimate | Usage estimate | Formula/assumption |
|---|---:|---:|---|
| Front Door Premium | $330.00 | $1–$10 | Current published base fee; low North America requests/transfer |
| Container Apps gateway + OID | $0–$20 | $0–$20 | Consumption grant may cover low use; enterprise minimum replicas can consume continuously |
| PostgreSQL B1ms compute | $12.41 | — | $0.017 × 730 hours |
| PostgreSQL 32 GiB storage | $3.68 | $0–$4 | $0.115 × 32; excess backup/storage activity |
| ACR Basic | $5.07 | $0–$2 | $0.1666 × 30.4 days; small image storage/build activity |
| Private endpoints/private DNS | $35–$65 | $0–$5 | Multiple staging/pilot endpoint-hours, DNS zones and low data processing |
| Entra P1, 1–3 users | $0–$18 | — | $6/user/month paid yearly; $0 if included in existing entitlement |
| Blob/versions/Key Vault | $1–$5 | $1–$5 | 10–25 GB plus operations/versions/secrets |
| Monitor/App Insights/alerts | $0–$10 | $0–$20 | Low ingestion; excess over allowances and paid alerts/retention |
| Defender for Cloud | $5–$35 | $0–$10 | Selected registry/container/CSPM resource meters |
| Backup/restore | $0–$5 | $2–$15 | Native allowance, logical/object copies and temporary restore resources |
| **Estimated total** | **$392–$509** | **$4–$91** | Rounded planning range **$400–$550/month** after overlap/uncertainty |

### B. Lean Azure controlled pilot

| Line item | Fixed estimate | Usage estimate | Formula/assumption |
|---|---:|---:|---|
| One multi-container Container App | $0 | $0–$20 | min 0/max 1; low active seconds/requests, possible free grant |
| PostgreSQL B1ms compute | $12.41 | — | $0.017 × 730 hours |
| PostgreSQL 32 GiB storage | $3.68 | $0–$3 | $0.115 × 32; backup allowance applies up to provisioned storage |
| ACR Basic | $5.07 | $0–$1 | $0.1666 × 30.4 days; low image volume |
| Private DNS/VNet | $0.50–$2 | $0–$1 | VNet itself has no base charge; private DNS/query use is small |
| Entra Free or P1 | $0–$18 | — | Security Defaults if accepted/tested; otherwise 1–3 P1 seats |
| Blob Storage | $0 | $0.25–$2 | 10–25 GB Hot LRS at about $0.0208/GB-month plus low operations/versions |
| Key Vault Standard | $0 | $0.03–$1 | $0.03 per 10,000 operations; low use |
| Azure Monitor/alerts | $0 | $0–$8 | Less than first 5 GB/month applicable free ingestion; modest paid alert/retention risk |
| Logical/object backup + drill | $0 | $1–$6 | Extra Blob versions/copies and brief isolated restore resources |
| **Estimated total** | **$21.66–$41.66** | **$1.28–$42** | Expected normal range **$30–$75/month**; high end covers P1 and transient validation usage |

Potential savings:

- If existing Microsoft 365 includes P1: save $6–$18/month relative to buying seats.
- If an existing approved private registry supports federated push, private digest pull and retention: ACR may be replaced, saving about $5/month. Do not use a public image.
- Staging Container Apps may stay scaled to zero. A stopped staging database still incurs storage/backup cost; do not keep a second database running except during staging validation.
- Keep log volume below 5 GB/month through structured sampling and exclusion of noisy/non-security events, never by dropping mandatory audit/security events.

### C. Lean managed alternative

| Line item | Fixed estimate | Usage estimate | Formula/assumption |
|---|---:|---:|---|
| Render public gateway Starter | $7.00 | — | Current Starter price |
| Render private OID Starter | $7.00 | — | Current Starter price |
| Render PostgreSQL Basic-256mb | $6.00 | — | Current Basic price |
| Render PostgreSQL 5 GB | $1.50 | — | $0.30/GB-month × 5 |
| Render Hobby or Pro workspace | $0–$25 | — | Hobby has no workspace audit export; Pro is recommended for provider audit evidence |
| Cloudflare Access/WAF/rate rule | $0 | $0–$3 | Free pilot plan; one rate-limit rule and account limits |
| Cloudflare R2 | $0 | $0–$3 | 10 GB/month and large operation allowances currently free |
| Logs/uptime/logical backup/egress | $0 | $3–$12 | Longer independent retention and usage above included amounts |
| **Estimated total** | **$21.50–$46.50** | **$3–$18** | Expected range **$25–$65/month** |

The managed alternative's low number is valid only with a single hosting administrator, Hobby's missing provider audit export, seven-day logs and three-day PITR. Matching stronger provider-governance evidence generally adds the $25 Pro workspace fee and independent log retention.

## Cost-versus-control decisions

| Decision | Monthly effect | Security effect | Pilot position |
|---|---:|---|---|
| Remove Front Door Premium | Save at least $330 plus usage | Lose edge WAF/Private Link/global rate limiting; retain managed TLS/auth and single-replica app controls | Accept for internal pilot |
| Use Entra Free Security Defaults | Save $6–$18 if P1 not included | Lose targeted Conditional Access/authentication strength; tenant-wide policy and claim behavior must pass | Conditional acceptance only |
| Defer Defender paid plans | Save roughly several to tens of dollars | Lose continuous Azure-native vulnerability/posture results; retain Trivy/SBOM/secret/IaC gates | Accept if independent Security approves CI evidence |
| Keep ACR Basic | Spend about $5 | Simplifies private image, managed-identity pull and digest evidence | Recommended |
| PostgreSQL VNet integration | Small DNS/network cost | Removes database public endpoint | Mandatory |
| Defer Blob/Key Vault Private Link | Save endpoint-hours | Data plane remains addressable only subject to firewall/identity; anonymous/Shared Key remain disabled | Accept only after denial tests; add endpoint if test fails |
| max replicas 1 | Avoid distributed-rate service | Limits availability/scale; preserves single-process rate authority | Mandatory configuration for lean pilot |
| 35-day PITR + logical backup | Small/variable | Preserves recovery and provider-independent restore | Mandatory |

## Budget recommendation for Shelby

> Superseded for activation by `AZURE_PILOT_COST_APPROVAL.md` dated 2026-08-10. The Azure Free Account was declined; assume company Pay-As-You-Go with zero credits.

Authorize no service until a current calculator export is attached. For planning, set:

- Target normal lean-Azure operating range: **$40–$52/month all-in**.
- Bicep Azure resource-group budget: **$55/month**, reserving up to $18 for three standalone Entra P1 licenses outside Azure consumption.
- Hard all-in review threshold: **$75/month forecast or actual**.
- One-time validation/restore contingency: **$50** for the activation month.
- No automatic upgrade, HA, Front Door, Defender plan, private endpoint expansion or extra P1 seat without a documented cost/security decision.

Azure budgets generate alerts but are not universal hard spending caps. The operational owner must review cost daily during activation week and weekly during the pilot.

## Pricing evidence snapshot

| Meter/source sampled 2026-08-09 | Published value used |
|---|---:|
| Front Door Premium base | $330/month |
| PostgreSQL Flexible Server B1ms, East US | $0.017/hour |
| PostgreSQL Flexible Server storage, East US | $0.115/GB-month |
| ACR Basic, East US | $0.1666/day |
| Blob Hot LRS, East US first tier | approximately $0.0208/GB-month |
| Key Vault Standard operations, East US | $0.03/10,000 |
| Log Analytics Analytics Logs ingestion, East US after allowance | $2.30/GB |
| Entra ID P1 list price | $6/user/month paid yearly |
| Render Starter service | $7/month |
| Render Basic-256mb PostgreSQL | $6/month plus $0.30/GB-month |
| Render Pro workspace | $25/month |
| Cloudflare R2 Standard | $0.015/GB-month after 10 GB-month free tier |

Official references are consolidated in `OID_PILOT_COST_COMPARISON.md`. Prices remain estimates until quoted under the actual account, region, agreement and selected configuration.
