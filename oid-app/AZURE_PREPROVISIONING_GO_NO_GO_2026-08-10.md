# OID Azure Pre-Provisioning GO/NO-GO — 2026-08-10

Final status: **NOT READY**

Scope: read-only verification of the company-controlled Azure environment and non-provisioning Bicep/ARM checks for synthetic-data-only `OID-STAGING`. No resource was created, no provider was registered, no license was purchased, no DNS was changed, and no real OligoPoly data was connected. Subscription IDs, tenant IDs, tokens, and secret values are intentionally omitted.

## Ownership and billing

| Area | Result | Objective evidence |
|---|---|---|
| Tenant ownership | **COMPANY DIRECTORY CONFIRMED; HARDENING REQUIRED** | The selected directory has an OligoPoly-specific initial tenant domain, one enabled member, no guest users, no university-pattern identity, and zero Azure resources. The signed-in company mailbox is Global Administrator. The display name remains `Default Directory`, and `oligopolypeptides.com` is not yet a verified Entra domain. |
| Administrator identity continuity | **FAIL** | The only member/Global Administrator is backed by a Microsoft Account. There is no independent cloud-only company administrator or emergency account. |
| Subscription ownership | **PASS** | The selected subscription is Enabled and default; the signed-in company administrator has the Owner role. |
| Billing model | **PASS WITH USER-SUPPLIED OFFER DETAIL** | Azure exposes an Active Microsoft Customer Agreement. Shelby independently confirmed Pay-As-You-Go. No credit is assumed or used. |
| UHV exclusion | **PASS** | The live directory contains no `UHV`, university-domain, `.edu`, or related identity pattern. Repository scanning found no UHV tenant ID, subscription ID, identity, vault URI, DNS dependency, or credential; remaining UHV references are prohibition text. |

## Entra, MFA, and current security posture

| Check | Result | Evidence / closure condition |
|---|---|---|
| Global Administrator | **PASS** | The signed-in company administrator is a Global Administrator. |
| Subscription Owner | **PASS** | Subscription-scoped role inspection returns Owner. |
| Current MFA enforcement | **FAIL** | The current Azure Resource Manager token reports password authentication only and contains no MFA method claim. Security Defaults policy state could not be read with the Azure CLI token's Microsoft Graph scopes. |
| Security Defaults | **NOT VERIFIED** | Device-code authentication was blocked consistently with the new-tenant Security Defaults behavior, but that is not sufficient evidence that MFA is effectively enforced. Shelby must verify `Entra ID > Overview > Properties > Manage security defaults = Enabled`, register MFA, revoke existing sessions, and sign in again. |
| Emergency access | **FAIL** | One Global Administrator exists; zero clearly named emergency/break-glass administrators exist. Create and test two independent cloud-only emergency accounts before provisioning. |
| Company domain | **FAIL** | The custom OligoPoly domain is not verified in Entra. Verify it through the company-controlled DNS registrar when authorized; do not change the OID application hostname yet. |
| OID application identity | **NOT CONFIGURED** | No `OID-STAGING` app registration or service principal exists. This is expected before activation but blocks application-stage what-if and deployment. |

### Entra P1 decision

**Entra P1 is not required on day one for the synthetic-data pilot** if all of the following pass:

1. Entra Free Security Defaults is enabled and all existing sessions are revoked.
2. Every administrator and pilot user registers MFA.
3. A fresh Azure management sign-in proves MFA.
4. A live Container Apps Easy Auth principal contains an MFA authentication-method claim.
5. OID's identity bridge rejects absent-MFA, wrong-tenant, non-group, disabled-user, group-removed, and revoked-session access.

OID already fails closed when the Easy Auth principal does not prove MFA. Security Defaults provides the free baseline; P1 is necessary only if the pilot needs scoped Conditional Access, authentication-strength rules, exclusions, or other customized policy. No P1 purchase is authorized.

## Providers and regional/SKU availability

Registration was inspected before and after ARM validation/what-if. No provider state changed.

| Required provider | State |
|---|---|
| `Microsoft.Authorization` | Registered |
| `Microsoft.Consumption` | Registered |
| `Microsoft.Resources` | Registered |
| `Microsoft.App` | NotRegistered |
| `Microsoft.ContainerRegistry` | NotRegistered |
| `Microsoft.DBforPostgreSQL` | NotRegistered |
| `Microsoft.Insights` | NotRegistered |
| `Microsoft.KeyVault` | NotRegistered |
| `Microsoft.ManagedIdentity` | NotRegistered |
| `Microsoft.Network` | NotRegistered |
| `Microsoft.OperationalInsights` | NotRegistered |
| `Microsoft.Storage` | NotRegistered |

Provider registration is a subscription modification. Shelby must explicitly authorize registration of the nine `NotRegistered` providers before any deployment.

East US 2 advertises every required resource type: Container Apps/environments/jobs, PostgreSQL Flexible Server, Storage, Key Vault, ACR, Log Analytics, managed identity, and VNet. Its PostgreSQL capability response includes PostgreSQL server editions/versions and Burstable `Standard_B1ms`. East US is unsuitable for this subscription because its PostgreSQL capability response says provisioning is restricted. The Bicep defaults and validation instructions were therefore changed from `eastus` to `eastus2` without creating resources.

## Bicep and ARM results

| Check | Result | Evidence |
|---|---|---|
| Bicep template compile | **PASS** | `infra/main.bicep` compiled successfully after the East US 2 portability change. |
| Bicep parameter compile | **PASS** | The example parameter file compiled with temporary validation-only environment values; no value was committed or reported. |
| ARM subscription validation | **PASS** | Azure returned success for the East US 2 subscription-scoped template. |
| ARM what-if | **PASS — FOUNDATION/DATA STAGE ONLY** | Azure reported 19 creates and zero deletes/modifies using `deployApplication=false`. The preview includes the mandatory budget. |
| Application-stage what-if | **NOT TESTED** | It remains fail-closed until an Entra app/group and approved, scanned image references exist. |
| Unauthorized changes | **PASS (NONE)** | Required providers remained in their original states; resource-group and resource counts remain zero. |

The template's `administratorObjectIds` parameter is not currently used to create Key Vault or Blob administrator role assignments. Before deployment, document the least-privilege operator/data-plane assignments and either encode them in reviewed IaC or execute a separately approved, auditable assignment step.

## Verified cost model and budget

Pricing is a planning estimate, not a quote. The Microsoft Retail Prices API was queried in USD for East US 2 on 2026-08-10:

- PostgreSQL B1ms: $0.017/hour, about $12.41 per 730-hour month.
- PostgreSQL storage: $0.115/GB-month, about $3.68 for 32 GB.
- ACR Basic: $0.1666/day, about $5.07 per 30.4-day month.
- Hot LRS first tier: $0.0184/GB-month, plus operations/version retention.
- Key Vault Standard operations: $0.03 per 10,000.
- Log Analytics paid ingestion: $2.76/GB after applicable free allowance.
- Container Apps Consumption: scale-to-zero and monthly free usage allowances apply; no promotional credit is assumed.

| Cost case | Expected monthly amount |
|---|---:|
| Minimum safe active | **$22–$25** |
| Normal synthetic pilot | **$28–$42** |
| Worst-case expected pilot | **$50–$55** |
| Retained, mostly idle | **$9–$15** |

Taxes, unexpected ingress/egress, excessive logs, restore-created servers, accidental scale, and resources outside the staging resource group can exceed these ranges.

The compiled template and ARM what-if contain one resource-group-scoped **$55 monthly budget** with five enabled notifications:

| Alert | Threshold | Dollar trigger |
|---|---:|---:|
| Early actual | 55% actual | $30.25 |
| Early forecast | 73% forecast | $40.15 |
| Critical actual | 90% actual | $49.50 |
| Critical forecast | 95% forecast | $52.25 |
| Ceiling | 100% actual | $55.00 |

Azure budgets alert but do not stop resources. Cost data can lag 8–24 hours, so activation-week daily review and weekly pilot review remain mandatory.

## Exact resources the approved Bicep would create

### Stage 1 — current fail-closed foundation/data deployment (`deployApplication=false`)

1. One `oid-staging-rg` resource group.
2. One resource-group monthly Azure Budget with five notifications.
3. One VNet with one Container Apps delegated subnet and one PostgreSQL delegated subnet.
4. One PostgreSQL private DNS zone and one VNet link.
5. One Log Analytics workspace and one workspace-based Application Insights resource.
6. One VNet-integrated Container Apps managed environment.
7. One PostgreSQL Flexible Server 17 (`Standard_B1ms`, 32 GB, private networking, TLS 1.2+, 35-day PITR), one `oid` database, and two TLS configuration resources.
8. One Standard LRS StorageV2 account, one Blob service, and one private `oid-documents` container with versioning/change feed/soft-delete/immutability settings.
9. One Standard Key Vault with RBAC, purge protection, and 90-day soft delete.
10. Three diagnostic settings: PostgreSQL, Blob, and Key Vault to Log Analytics.

ARM what-if counted exactly 19 creates across those items.

### Stage 2 — only after identity/image/security gates pass (`deployApplication=true`)

1. One user-assigned managed identity.
2. One Basic private Azure Container Registry.
3. Three workload role assignments: Blob Data Contributor, Key Vault Secrets User, and AcrPull.
4. Five Key Vault secret resources for bootstrap/runtime/migration/proxy/Entra configuration.
5. One external-ingress Container App with HTTPS-only Easy Auth, an identity bridge container, an OID container, and scale 0–1.
6. One Container Apps auth configuration restricted to the approved tenant/group.
7. Optionally, one manual one-shot migration job when separately enabled.

No Front Door, public DNS record, Defender plan, production environment, WooCommerce integration, real-data connection, or P1 license is included.

## Remaining blockers

1. Enable and prove Security Defaults/MFA; revoke the existing password-only session and retest.
2. Create/test two independent cloud-only emergency Global Administrators and a separate least-privilege daily administrator.
3. Verify the OligoPoly custom domain in Entra; keep UHV absent from identity, recovery, and billing.
4. Obtain Shelby's explicit approval to register the nine required providers.
5. Approve East US 2 and the revised $22–$55 planning range/$55 budget strategy.
6. Define reviewed administrator data-plane roles; the current `administratorObjectIds` parameter does not assign them.
7. Create the OID Entra app, service principal, pilot group, and synthetic pilot users only after identity hardening is complete.
8. Provide an approved container builder and executable image scanner; build, scan, and record immutable runtime/migration digests.
9. Complete the already-required Security, Quality, Governance, Legal, RBAC, backup/recovery, and controlled-pilot approvals.
10. Re-run full application-stage ARM validation/what-if with approved identifiers and image digests. DNS remains a later, separately authorized action.

## Recommendation

**NOT READY**

The Azure account is company-controlled enough to continue hardening, and the IaC foundation/data preview is valid, portable, and cost-aligned. It is not ready to provision because MFA is not currently proven, administrator continuity is single-account and externally backed, nine providers require owner-approved registration, custom-domain/identity setup is incomplete, application images cannot yet be built/scanned, and governance approvals remain open.

Exact next action: Shelby should first enable/verify Security Defaults, register MFA, revoke active sessions, create and test two cloud-only emergency administrators, and verify the company domain. After that, Shelby may separately authorize provider registration and a fresh read-only application-stage validation. Do not authorize resource provisioning until those results are reviewed.
