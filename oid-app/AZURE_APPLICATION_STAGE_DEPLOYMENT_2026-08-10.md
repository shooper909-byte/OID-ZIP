# OID Azure Application Stage Deployment — 2026-08-10

## Result

**READY FOR CONTROLLED STAGING PILOT — NOT PRODUCTION.**

Deployment and post-deployment verification succeeded. This acceptance is limited to Shelby, synthetic data, the Azure-generated staging hostname, and the already-deployed configuration. It does not authorize production use, additional users, a custom domain, migration execution, or any real-data connection.

- Subscription deployment: `oid-application-deploy-20260810`
- Provisioning state: `Succeeded`
- Azure timestamp: `2026-08-10T23:32:45.702479Z`
- Region: East US 2
- Application: `oid-staging-app-qgvnukjcy7jwk`
- URL: `https://oid-staging-app-qgvnukjcy7jwk.jollyfield-2bcf5822.eastus2.azurecontainerapps.io`

No migration job was deployed, no user/group was added, no real-data source was connected, and the obsolete `entra-client-secret` entry was not deleted.

## Deployed configuration

- Two containers: `identity-bridge` (0.25 vCPU, 0.5 GiB) and `oid` (0.5 vCPU, 1 GiB).
- Both containers use `oid-application@sha256:a8b634e6b6b3cc47ef371df4ac518f6809b6a6c5e890c139d5ef2a0d0e52aac2`.
- Approved migration manifest remains present in ACR at `oid-migration@sha256:d80091a0ac49c7e41435b30790812cef0e915c948bae38aa6ecde7dbf2220ed2`; it is not running.
- Single-revision mode, one active revision, 100% traffic, scale minimum 0 and maximum 1.
- Active revision provisioning state `Provisioned`, health state `Healthy`.
- External HTTPS ingress targets the identity bridge on port 8080.

## Identity and authorization

- Easy Auth platform and Microsoft Entra provider: enabled.
- Unauthenticated action: `RedirectToLoginPage`.
- Allowed principals: the single `OID-STAGING-PILOT-USERS` group only.
- Group membership: one member, Shelby.
- Enterprise application assignments: one assignment, the pilot group.
- Enterprise application requires assignment.
- Entra application manifest `groupMembershipClaims` is `SecurityGroup`, allowing the pilot security-group claim to be emitted in the ID token.
- Entra application OIDC ID tokens request the optional `amr` claim.
- Shelby's redundant direct enterprise-application assignment was removed; access is exclusively through the pilot group.
- Application managed identity has exactly five relevant assignments:
  - ACR Pull at the Basic ACR.
  - Storage Blob Data Contributor at the OID storage account.
  - Key Vault Secrets User scoped separately to the runtime database URL, trusted-proxy secret, and Entra client secret.
- The identity has no Key Vault access to the migration database URL or PostgreSQL bootstrap-administrator password.

## Live checks

- `GET /api/v1/health/live`: HTTP 200, `{"status":"ok"}`.
- `GET /api/v1/health/ready`: HTTP 200, `{"status":"ready"}`.
- Unauthenticated API request: HTTP 401.
- Browser-style unauthenticated root request: HTTP 302 to Microsoft sign-in.
- Tenant-specific Microsoft authorization request contains the exact deployed client ID and planned callback.
- Interactive Shelby group allow-path: Microsoft authenticated Shelby, Easy Auth accepted the callback, and the callback returned HTTP 302 to the OID application without a group-lookup failure.
- Fresh MFA-capable sign-in on 2026-08-11: Easy Auth logged `AuthenticationMethods` as `pwd,mfa` and `Authenticated` as `true`.
- Authenticated application render: passed. The OID home page and full navigation rendered without an `UNAUTHORIZED` response or visible error.
- The existing bridge accepted the emitted `mfa` value. MFA enforcement remains enabled and no bridge or image change is required.

## Database and data boundary

- The application-only deployment performed no PostgreSQL server, role, or migration-job mutation.
- Readiness proves the deployed application can connect using the private runtime URL.
- The immediately preceding in-VNet gate established five applied migrations, 43 application tables, zero business rows, runtime DDL denial, and no real-data connection.
- No seed, import, migration job, customer source, or business-data connector was enabled by this deployment.

## Cost controls

- Existing Azure budget: $55/month.
- Five budget notifications remain configured.
- Budget alerts do not stop spending.
- ACR remains Basic with admin access disabled.

### Verified budget and alert routing

Closeout capture: 2026-08-11T17:37:50Z.

| Alert | Basis | Threshold | Enabled | Recipient |
|---|---|---:|---|---|
| earlyActual55Percent | Actual | 55% | Yes | labs@oligopolypeptides.com |
| earlyForecast73Percent | Forecasted | 73% | Yes | labs@oligopolypeptides.com |
| criticalActual90Percent | Actual | 90% | Yes | labs@oligopolypeptides.com |
| criticalForecast95Percent | Forecasted | 95% | Yes | labs@oligopolypeptides.com |
| azureResourceCeiling100Percent | Actual | 100% | Yes | labs@oligopolypeptides.com |

- Budget name: oid-staging-monthly-budget.
- Period: monthly, 2026-08-01 through 2036-08-01.
- Budget API current-spend baseline: $0.0766131653 USD, recorded as approximately $0.08 month to date.
- Azure cost and budget data can be delayed. A direct Cost Management query was throttled with HTTP 429 during closeout, so the baseline above is the budget resource's currentSpend value.
- The expected normal pilot range remains $28–$42/month, with an expected upper pilot range of $50–$55/month. The $55 budget sends alerts and does not suspend resources.
- The five enabled rules and their recipient configuration were verified read-only. No threshold was deliberately triggered, so end-to-end mailbox delivery remains an operational drill and a production gate rather than a closeout claim.

## Current Azure inventory

The resource-group inventory returned 13 discoverable resource entries. The budget, role assignments, secrets, subnets, diagnostic settings, and other child/control-plane objects are additional configuration and are not all represented as separate rows by az resource list.

| Resource | Azure type | Location |
|---|---|---|
| oid-staging-app-qgvnukjcy7jwk | Microsoft.App/containerApps | East US 2 |
| oid-staging-cae-qgvnukjcy7jwk | Microsoft.App/managedEnvironments | East US 2 |
| oidstagingacrqgvnukjcy7jwk | Microsoft.ContainerRegistry/registries | East US 2 |
| oid-staging-pg-qgvnukjcy7jwk | Microsoft.DBforPostgreSQL/flexibleServers | East US 2 |
| Application Insights Smart Detection | microsoft.insights/actiongroups | Global |
| oid-staging-appi-qgvnukjcy7jwk | Microsoft.Insights/components | East US 2 |
| oid-staging-kv-qgvnukjcy | Microsoft.KeyVault/vaults | East US 2 |
| oid-staging-app-mi-qgvnukjcy7jwk | Microsoft.ManagedIdentity/userAssignedIdentities | East US 2 |
| oid.staging.postgres.database.azure.com | Microsoft.Network/privateDnsZones | Global |
| oid.staging.postgres.database.azure.com/oid-staging-vnet-link | Microsoft.Network/privateDnsZones/virtualNetworkLinks | Global |
| oid-staging-vnet | Microsoft.Network/virtualNetworks | East US 2 |
| oid-staging-law-qgvnukjcy7jwk | Microsoft.OperationalInsights/workspaces | East US 2 |
| oidstagingdocqgvnukjcy7j | Microsoft.Storage/storageAccounts | East US 2 |

Inventory posture at closeout:

- ACR: Basic, provisioned, admin user disabled.
- PostgreSQL: version 17, Standard_B1ms/Burstable, 32 GiB, Ready, private network only, 35-day backup retention, geo-redundant backup disabled.
- Blob storage: Standard LRS, TLS 1.2 minimum, shared-key access disabled, public blob access disabled, versioning enabled, and 35-day blob/container soft delete and change-feed retention.
- Container App: one active revision at 100% traffic, minimum 0 and maximum 1 replica.
- Migration jobs: none.

## Image and database evidence reconciliation

- Both identity-bridge and oid containers reference runtime digest sha256:a8b634e6b6b3cc47ef371df4ac518f6809b6a6c5e890c139d5ef2a0d0e52aac2; that digest remains present in ACR.
- Migration digest sha256:d80091a0ac49c7e41435b30790812cef0e915c948bae38aa6ecde7dbf2220ed2 remains present in ACR but is not deployed or running.
- Live and readiness endpoints returned HTTP 200 during closeout.
- The authenticated Shelby path passed with Easy Auth method evidence pwd,mfa.
- The private runtime database connection is proven by readiness. The approved in-VNet predeployment test remains the authoritative role/data evidence: five applied migrations, 43 application tables, zero business rows, runtime DDL denied, and no real-data connection.

## Retained obsolete secret

- Key Vault contains an obsolete invalid first-pass secret named entra-client-secret.
- It is not the active Entra credential and was not deleted.
- The active Key Vault secret is entra-oid-client-secret.
- The Container App also has a local secret alias named entra-client-secret that references the active entra-oid-client-secret. Do not confuse that required alias with the obsolete Key Vault entry.
- Any future deletion requires separate authorization, private data-plane access, a fresh reference audit, and rollback evidence.

## Repository status

- The authoritative deployment checkout at `C:\Users\Shelby Frederick\Documents\Codex\OID_v1_20260808\oid-app` is not itself a Git working tree, so its closeout document edits have no tracked/untracked classification.
- The active workspace repository at `C:\Users\Shelby Frederick\OneDrive\Documents\ChatGPT\System` is valid but has no commits yet on `master`. Its entire `OID_v1_working/` tree is untracked: 86 files in total (17 app-root files, 20 under `app/`, 1 under `db/`, 9 under `docs/`, 13 under `lib/`, 3 under `prisma/`, 20 under `services/`, and 3 under `tests/`).
- `git status --short --untracked-files=all` lists untracked root files `.dockerignore`, `.env.example`, `.gitignore`, `CHANGELOG.md`, `Dockerfile`, `M1_VALIDATION.md`, `PRODUCTION_GATE.md`, `README.md`, `VALIDATION.md`, `docker-compose.yml`, `middleware.ts`, `next-env.d.ts`, `package.json`, `scripts_generate_sql.py`, `tsconfig.core.json`, `tsconfig.json`, and `tsconfig.tsbuildinfo` under `OID_v1_working/oid-app/`.
- It also lists every file in these untracked subtrees: `app/` (all pages and API routes), `db/`, `docs/` (architecture, data dictionary, deployment runbook, and five legacy-reference SQL files), `lib/`, `prisma/` (schema, seed, and canonical migration), `services/`, and `tests/`.
- The non-synced authoritative checkout and the untracked workspace copy must be deliberately reconciled before any future commit; no copy, stage, commit, branch, or push was authorized or performed during closeout.

## Remaining non-pilot gates

- Production requires separate security, privacy/legal, Quality/governance, resilience, restore, performance, monitoring, incident, and final go/no-go evidence.
- Additional users require an explicitly approved roster, least-privilege roles, MFA proof, group-only assignment, and access-review ownership.
- A custom domain requires DNS/certificate ownership, callback/origin design, ARM validation, what-if, rollback, and explicit deployment authorization.
- Migration execution requires an approved source, mapping, backup, synthetic dry run, reconciliation plan, one-shot job authorization, and post-run disablement.
- Real data requires classification, legal/privacy and data-owner approval, retention, access, backup/restore, reconciliation, rollback, and explicit connection authorization.

## Final acceptance

- Post-deployment verification is complete.
- Environment classification is READY FOR CONTROLLED STAGING PILOT — NOT PRODUCTION.
- The enterprise application has exactly one assignment: `OID-STAGING-PILOT-USERS`.
- The pilot group has exactly one direct member: Shelby (`bab63204-7cb9-465d-a074-56124afeaa98`).
- The original Container App revision remains the sole active revision at 100% traffic.
- No migration job exists, no real-data source is connected, and no additional user or group has access.

## Closeout reconciliation — 2026-08-11

Read-only Azure and public-endpoint checks were refreshed at `2026-08-11T17:44:33Z`. No Azure or Entra resource was deployed, modified, or deleted during closeout.

| Evidence area | Closeout state | Reconciled evidence |
|---|---|---|
| Deployment | PASS | Resource group provisioning state `Succeeded`; the sole Container App revision is active, `Provisioned`, and `Healthy`, with 100% traffic. |
| MFA | PASS FOR SHELBY PILOT | Log Analytics records a fresh `LoginComplete` event at `2026-08-11T14:28:18.9862607Z` with `Authenticated=true` and `AuthenticationMethods=pwd,mfa`. Earlier password-only sessions remain historical evidence and do not supersede the fresh MFA result. |
| Access control | PASS FOR SINGLE USER | Enterprise application assignment is required. It has exactly one assignment, `OID-STAGING-PILOT-USERS`; that security group has exactly one direct member, Shelby. The application managed identity has exactly five scoped assignments: ACR Pull, Storage Blob Data Contributor, and three secret-level Key Vault Secrets User assignments. |
| Health | PASS | Fresh public checks returned HTTP 200 with `{"status":"ok"}` from `/api/v1/health/live` and HTTP 200 with `{"status":"ready"}` from `/api/v1/health/ready`. A fresh unauthenticated protected request returned HTTP 401. |
| Image digests | PASS | Both running containers remain pinned to `oid-application@sha256:a8b634e6b6b3cc47ef371df4ac518f6809b6a6c5e890c139d5ef2a0d0e52aac2`. The approved, non-running migration manifest remains `oid-migration@sha256:d80091a0ac49c7e41435b30790812cef0e915c948bae38aa6ecde7dbf2220ed2`. Predeployment Trivy High/Critical results were zero for both final digests. |
| Database | PASS FOR EMPTY PILOT BASELINE | PostgreSQL 17 is `Ready`, `Standard_B1ms`, 32 GiB, private/public access disabled, with 35-day backup retention and the `oid` database present. The preceding in-VNet gate recorded five applied migrations, 43 application tables, zero business rows, runtime DDL denial, and no real-data connection. Closeout did not rerun migrations or write data. |
| Budget and alerts | PASS | The resource-group budget is exactly `$55.00` monthly. All five notifications are enabled: actual 55%, forecast 73%, actual 90%, forecast 95%, and actual 100%. Every notification is addressed to `labs@oligopolypeptides.com`; no contact group or contact role is configured. Budgets alert but do not stop spending. |
| Cost baseline | OBSERVED, LAGGING | Azure budget state reported month-to-date actual spend `$0.0766131652857826 USD` and forecast spend `$0.0766131652857826 USD`. Cost ingestion commonly lags 8–24 hours, so this is a timestamped starting baseline, not a final invoice or reliable steady-state forecast. |
| Secret cleanup | IDENTIFIED, NOT DELETED | Key Vault contains the obsolete invalid secret object `entra-client-secret`. The deployed app instead references `entra-oid-client-secret`, and the workload identity's secret-level assignment also targets `entra-oid-client-secret`. The obsolete object is inert and remains for a separately approved private data-plane cleanup. |
