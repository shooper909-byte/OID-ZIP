# OID Lean Azure Pilot — Pay-As-You-Go Cost Approval

Status: **NOT APPROVED / NO RESOURCES CREATED**  
Estimate date: 2026-08-10  
Billing assumption: company-controlled Azure Pay-As-You-Go, **zero promotional credits**  
Proposed region: East US 2  
Workload: 1–3 internal users, synthetic data, low traffic, modest private documents.

The Azure Free Account application was declined. Every estimate therefore assumes metered charges begin with first use. Prices are planning estimates in USD before tax, not quotes; the Azure Pricing Calculator and subscription-specific availability must be checked immediately before provisioning.

## Revised monthly estimate

| Cost case | Expected monthly amount | Conditions |
|---|---:|---|
| Minimum safe active pilot | **about $22–$25/month** | Entra Free with Security Defaults; PostgreSQL B1ms running; Container Apps inside the consumption allowance; minimal logs/documents; no excess backup. |
| Normal pilot | **about $28–$42/month** | 1–3 users, ordinary synthetic workflows, modest monitoring and Blob versions, intermittent Container Apps activity, PostgreSQL continuously available. |
| Worst-case expected pilot | **about $50–$55/month** | Database and containers active, higher—but still pilot-scale—logs, document versions, backup growth, and operations. Restore-created resources, taxes, or accidental scale can exceed this planning range. |
| Retained but mostly idle | **about $9–$15/month** | Container Apps at zero, PostgreSQL manually stopped for eligible periods, storage/backup/ACR/DNS retained, and no paid Entra license. PostgreSQL automatically restarts after seven days. |

Unexpected traffic, log spikes, data egress, taxes, restore-created servers, accidental replica changes, or separately billed licenses can exceed these ranges. Stop and obtain a new approval if forecasted all-in cost reaches $75.

## Selected services and assumptions

| Resource | Selected configuration | Active monthly range | Idle control | Safety decision |
|---|---|---:|---|---|
| PostgreSQL Flexible Server | PostgreSQL 17, Burstable `Standard_B1ms`, 32 GiB P4 LRS, private VNet, TLS, 35-day PITR, no HA/geo backup | $16–$23 | Stop compute when testing pauses; provisioned storage and retained backup remain billable; auto-start after 7 days | Required. B1ms is the lowest practical validated pilot compute. Do not remove backups, TLS, private networking, migrations, triggers, or least-privilege roles. |
| Azure Container Apps | Consumption, 0–1 replica, runtime plus local identity bridge | $0–$12 | Already scales to zero; no application compute charge while at zero, subject to Azure meters | Required. Keep maximum one replica. |
| Azure Container Registry | Basic private registry | $5–$6 | Cannot stop. Delete only as part of an approved full staging teardown after preserving reproducible build/scan evidence | Required while a retained environment must be able to pull private images. |
| Blob Storage | Standard LRS Hot, 10–25 GiB, private container, OAuth/managed identity, versioning/change feed/35-day soft delete | $0.50–$3 | Usage falls when idle; versions/storage remain | Required. Do not make public or disable recovery/integrity controls. |
| Key Vault | Standard, RBAC, purge protection/soft delete | $0.10–$1 | Transaction costs fall naturally when idle | Required. Do not replace with committed `.env` values. |
| Log Analytics/Application Insights | Pay-as-you-go, 30-day retention, 1 GB/day cap | $0–$8 | Ingestion falls when apps stop; retain security/diagnostic categories | Required. Do not disable audit/security telemetry merely to save cost. |
| VNet/private DNS | VNet, service endpoints, PostgreSQL private DNS zone | $0.50–$1 | No stop operation; delete only with environment | Required for private database access. |
| Backup/version overhead | PostgreSQL backup beyond included allocation and Blob retained versions | $0–$3 | Older PostgreSQL backups remain billable while server is stopped; no new backups occur during stop | Required recovery protection. |
| Microsoft Entra ID | Free tier with Security Defaults; 1–3 pilot users | $0 | No license to stop | Acceptable only after Security Defaults is enabled, sessions are revoked, every user registers MFA, and live OID/Easy Auth tokens prove MFA. P1 is deferred unless scoped Conditional Access becomes necessary. |
| Azure Budget | Resource-group monthly budget and five email notifications | $0 expected | Not applicable | Mandatory in IaC, but advisory only—it does not stop resources. |

The Microsoft Retail Prices API queried on 2026-08-10 reports East US 2 PostgreSQL B1ms at $0.017/hour ($12.41 at 730 hours), PostgreSQL storage at $0.115/GB-month ($3.68 for 32 GB), ACR Basic at $0.1666/day (about $5.07/month), Hot LRS at $0.0184/GB-month for the first tier, Key Vault Standard operations at $0.03/10,000, and Log Analytics ingestion at $2.76/GB after applicable free allowance. Container Apps consumption includes a monthly usage allowance and scales to zero, but this plan assumes no promotional credit.

## Exact budget and alert strategy

The Bicep package creates a **resource-group-scoped monthly Azure Budget of $55**. This is the full Azure-consumption warning ceiling for the Entra Free pilot. It leaves a separate management margin below the previously approved $75 all-in ceiling, but it is advisory and not a spending cap.

| Notification | Bicep threshold | Approximate Azure spend | Required response |
|---|---:|---:|---|
| Early actual | 55% of $55 | **$30.25 actual** | Review Cost Analysis within one business day; confirm PostgreSQL SKU, replica count, logs, storage growth, and unapproved resources. |
| Early forecast | 73% of $55 | **$40.15 forecast** | Review projected month-end Azure cost; pause nonessential testing if the projection continues rising toward $55. |
| Critical actual | 90% of $55 | **$49.50 actual** | Stop nonessential OID testing; scale Container Apps to zero; stop PostgreSQL if operationally safe; notify Shelby. |
| Critical forecast | 95% of $55 | **$52.25 forecast** | Treat as likely breach of the Azure ceiling; no additional service, storage, replica, or license may be added. |
| Azure resource ceiling | 100% of $55 | **$55 actual** | Keep OID-STAGING inactive, execute the approved idle procedure, and obtain Shelby's written decision before resuming. |

Recipients come only from the required `budgetContactEmails` Bicep parameter, supplied via `OID_AZURE_BUDGET_CONTACT_EMAIL` in the example parameter file. No personal/company address is committed. Add `azure-noreply@microsoft.com` to approved senders after the company mailbox exists.

Important limitations:

- Azure Budget notifications do not stop resources or enforce a spending cap.
- Cost data is typically delayed 8–24 hours and budgets are normally evaluated daily.
- The resource-group budget does not include taxes, Microsoft 365, support, any future Entra license purchase, or costs created outside `oid-staging-rg`.
- Check subscription-level Cost Analysis weekly so stray resources outside the group cannot evade the budget.
- No automatic destructive shutdown/delete automation is included; it could interrupt migrations, testing, or recovery and requires separate approval.

## Safe idle procedure

When OID-STAGING will not be tested:

1. Finish/abort active workflows cleanly and record the staging state.
2. Confirm no migration, restore, backup validation, or document write is running.
3. Allow Container Apps to scale to zero; verify `minReplicas=0` and `maxReplicas=1` remain unchanged.
4. Stop PostgreSQL through the approved operator procedure. It automatically starts after seven days, so review/restop weekly. While stopped, compute billing pauses, but storage/backups remain billed and no new backups are taken.
5. Do not execute the migration job while idle.
6. Retain Key Vault, private Blob Storage, diagnostics, backups, and private DNS if the environment will resume soon.
7. For inactivity measured in months, prefer an explicitly approved full deletion of `oid-staging-rg` because all data is synthetic and Bicep is reproducible. Preserve required validation evidence and image/SBOM/scan records first. Full deletion is not authorized by this plan.

Do not delete ACR alone while retaining a Container App that may need to restart, do not shrink/disable PostgreSQL integrity controls, do not expose Blob/Key Vault publicly, and do not turn off security logging to meet cost goals.

## Charge controls and approval record

- [x] Company-controlled active subscription, subscription Owner, and active Microsoft Customer Agreement verified read-only; zero credits assumed.
- [x] East US 2 service/SKU capability and retail-meter estimate verified read-only on 2026-08-10. East US PostgreSQL provisioning is restricted for this subscription.
- [x] $55 Azure resource budget and five enabled notifications appear in compiled Bicep and ARM `what-if`.
- [ ] At least one independent company-controlled budget email is provided and tested.
- [x] Entra P1 purchase deferred; Entra Free plus Security Defaults is the initial design, subject to live MFA evidence.
- [ ] Shelby accepts minimum $22–$25, normal $28–$42, and expected worst-case $50–$55 before taxes/transient restores.
- [ ] Exact resources in `AZURE_PREPROVISIONING_CHECKLIST.md` are approved.
- [ ] Written authorization to provision synthetic-only `OID-STAGING` is recorded.

No checkbox is complete without objective evidence. No Azure resource is authorized by this document.

Official references: [Azure budgets](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-create-budgets), [Bicep budget resource](https://learn.microsoft.com/en-us/azure/templates/microsoft.consumption/2024-08-01/budgets), [PostgreSQL pricing](https://azure.microsoft.com/en-us/pricing/details/postgresql/flexible-server/), [PostgreSQL stop/start](https://learn.microsoft.com/en-us/azure/postgresql/configure-maintain/how-to-stop-server), [PostgreSQL backup billing](https://learn.microsoft.com/en-us/azure/postgresql/backup-restore/concepts-backup-restore), [Container Apps pricing](https://azure.microsoft.com/en-us/pricing/details/container-apps/), [Container Registry pricing](https://azure.microsoft.com/en-us/pricing/details/container-registry/), [Azure Monitor pricing](https://azure.microsoft.com/en-us/pricing/details/monitor/), and [Entra pricing](https://www.microsoft.com/en-us/security/business/microsoft-entra-pricing).
