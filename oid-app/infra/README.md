# OID Lean Azure Pilot Infrastructure

Status: **PREPARATION ONLY — DO NOT DEPLOY WITHOUT SHELBY'S WRITTEN APPROVAL**

## Prohibited environment boundary

**UHV AZURE STATUS: PROHIBITED FOR OID**

University authorization was denied. Never authenticate OID infrastructure to the UHV tenant, select the UHV subscription, use its promotional credit, create OID resources there, invite its identity as an OID administrator, or store OligoPoly data there. All commands in this guide apply only after an OligoPoly-controlled tenant and subscription have been independently verified.

This Bicep package targets one synthetic-data-only `staging` environment in East US 2. East US is not an approved default because the company subscription's read-only PostgreSQL capability response reports provisioning restricted there. It does not define production, Front Door, DNS records, live integrations, or real data. `deployApplication` defaults to `false`; image parameters default to unresolvable, fail-closed placeholders.

## Layout

- `main.bicep` — subscription-scoped resource group and module orchestration.
- `modules/foundation.bicep` — VNet, delegated subnets, private DNS, Log Analytics, Application Insights, Container Apps environment.
- `modules/data.bicep` — PostgreSQL 17, private database network, Blob Storage, Key Vault, diagnostics, recovery controls.
- `modules/application.bicep` — conditional managed identity, Basic ACR, Key Vault secrets, Container App, Easy Auth, optional migration job.
- `modules/cost-management.bicep` — mandatory resource-group monthly budget and five actual/forecast notifications.
- `parameters/oid-staging.example.bicepparam` — placeholders and environment-variable-only secret inputs.

## Required tooling and providers

Azure CLI 2.89.0 is installed on the preparation workstation as of 2026-08-09. Before validation against Azure, Shelby must create and verify an OligoPoly-controlled tenant/subscription, sign in specifically to that tenant, select the company subscription, and confirm these providers are registered:

`Microsoft.App`, `Microsoft.Authorization`, `Microsoft.Consumption`, `Microsoft.ContainerRegistry`, `Microsoft.DBforPostgreSQL`, `Microsoft.Insights`, `Microsoft.KeyVault`, `Microsoft.ManagedIdentity`, `Microsoft.Network`, `Microsoft.OperationalInsights`, `Microsoft.Resources`, and `Microsoft.Storage`.

Read-only discovery commands to run after installation:

```powershell
az version
az account show --output json
az account list --output table
az provider show --namespace Microsoft.App --query registrationState -o tsv
```

Repeat the provider query for every provider listed above. Provider registration changes subscription state and therefore require Shelby's approval if any are not already registered.

## Validation sequence — no creation

1. Copy `oid-staging.example.bicepparam` to an untracked operator file.
2. Replace tenant, client, group, subscription, and administrator object-ID placeholders.
3. Supply the five `OID_AZURE_*` secret environment variables from an authorized temporary operator session. Do not print them or persist them in shell history.
4. Set `OID_AZURE_BUDGET_CONTACT_EMAIL` to a company-controlled notification address. This is configuration, not a secret, but it must not be a UHV address.
5. Confirm `expectedSubscriptionId` exactly matches `az account show`.
6. Run build, subscription validation, and what-if only:

```powershell
az bicep build --file infra/main.bicep
az deployment sub validate --location eastus2 --template-file infra/main.bicep --parameters infra/parameters/oid-staging.operator.bicepparam
az deployment sub what-if --location eastus2 --template-file infra/main.bicep --parameters infra/parameters/oid-staging.operator.bicepparam
```

Do not run `az deployment sub create` until the cost and resource list in `AZURE_PREPROVISIONING_CHECKLIST.md` have been explicitly approved by Shelby.

The region, resource group, naming prefix, subscription expectation, tenant/application/group identifiers, pilot hostname, database sizing, retention, and images are parameters. Deployment outputs deliberately omit raw subscription IDs and human administrator object IDs to reduce identifier exposure in logs.

The resource-group deployment includes a mandatory monthly Azure Budget, defaulting to $55, with actual/forecast alerts at 55%, 73%, 90%, 95%, and 100%. Azure budgets notify but do not stop resources; cost data can be delayed. Entra P1 is not included or assumed for the initial pilot; any later license purchase requires separate approval and sits outside this resource-group budget.

## Staged activation

1. Foundation/data deployment with `deployApplication=false`.
2. Validate private PostgreSQL DNS/networking, Key Vault and Blob access, diagnostics, backup settings, and cost alerts.
3. Build the runtime and migration targets, scan both, push approved immutable digests to ACR, and replace the fail-closed image placeholders.
4. Establish database login roles, run migrations through the one-shot migration image, then remove bootstrap database credentials from all operator environments.
5. Configure the Entra application callback and pilot group; validate MFA and revocation.
6. Set an approved pilot hostname and only then deploy the application module.
7. Use synthetic records only and complete `POST_DEPLOYMENT_VALIDATION_PLAN.md`.

## PostgreSQL identity decision

OID/Prisma currently uses stable PostgreSQL connection strings. Entra managed-identity database authentication requires short-lived access-token acquisition and refresh/pooling behavior. That is a meaningful runtime and operational change and has **not** been implemented in this preparation phase. The pilot design therefore keeps two TLS/password database roles whose URLs are stored in Key Vault: `oid_migration` for schema deployment and `oid_runtime` for application DML. The runtime role must not own schema objects or receive DDL/superuser privileges. Managed identity remains mandatory for Key Vault and Blob Storage.

Use `ops/postgres/least-privilege.sql.example` after the two login roles have been created with passwords supplied from the approved secret workflow. Preserve all Prisma migrations, triggers, audit protections, release constraints, and allocation controls.

## Image build and scan gate

Docker and Trivy are not installed locally. Once an approved builder exists:

```powershell
docker build --target runtime -t oid-staging:<approved-tag> .
docker build --target migration -t oid-migration:<approved-tag> .
trivy image --exit-code 1 --severity HIGH,CRITICAL oid-staging:<approved-tag>
trivy image --exit-code 1 --severity HIGH,CRITICAL oid-migration:<approved-tag>
```

Record image digests, scan tool/database versions, results, and accepted exceptions. Do not push or deploy an unscanned tag. The final runtime image uses the non-root `node` user and Next.js standalone output; secrets are injected at runtime.

## Rollback

Application rollback uses Container Apps single-revision replacement with the previous approved immutable digest. Database rollback uses forward-fix migrations plus an Azure point-in-time restore to a new server for disaster recovery; destructive migration rollback is not assumed. Full environment removal is deletion of the exact staging resource group only after export/evidence retention and explicit Shelby approval. Never use a wildcard or subscription-wide delete.

## Official references

- [Bicep overview](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/overview)
- [Container Apps authentication](https://learn.microsoft.com/en-us/azure/container-apps/authentication)
- [PostgreSQL private networking](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-networking-private)
- [Prevent Shared Key authorization](https://learn.microsoft.com/en-us/azure/storage/common/shared-key-authorization-prevent)
