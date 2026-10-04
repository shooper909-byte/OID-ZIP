# OID Azure Stage 1/2 Deployment Evidence — 2026-08-10

## Authorized scope

Shelby authorized the 19 Bicep-declared OID staging foundation/data resources in East US 2 with `deployApplication=false`, `deployMigrationJob=false`, and a $55 monthly Azure budget. Application deployment, DNS changes, real-data connections, and application/migration images remained outside scope.

## Result

- Subscription deployment `oid-staging-foundation-data-20260810`: **Succeeded**.
- Deployment mode: `foundation-and-data-only`.
- Subscription-boundary output: `true`.
- Monthly Azure budget output: `55`.
- Bicep-declared inventory: **19/19 present**; **0 missing**.
- Application-stage resources: **0**. Container Registry and Container App outputs are `not-created`.
- Post-deployment ARM what-if: **0 creates, 0 modifications, 0 deletes**; one existing scope was ignored.
- No real data was connected or inspected.

Azure automatically created one provider-managed `Application Insights Smart Detection` action group alongside the workspace-backed Application Insights component. It was not shown in the approved what-if and was not separately declared in Bicep. It has no email or webhook receivers. It was preserved pending any later explicit lifecycle decision.

## Live acceptance checks

- PostgreSQL Flexible Server: Ready, PostgreSQL 17, `Standard_B1ms`, 32 GB, 35-day backup retention, private networking, public access disabled, `require_secure_transport=on`, and minimum TLS 1.2. The infrastructure-level `oid` database exists; no application migration or real data was connected.
- Storage: HTTPS-only, TLS 1.2 minimum, anonymous blob access disabled, Shared Key disabled, container public access `None`, versioning and change feed enabled, 35-day blob/container deletion retention, and version-level immutability enabled. The public network endpoint is enabled but its network ACL defaults to deny with no IP allowlist; `AzureServices` bypass remains enabled by the approved lean template.
- Key Vault: Azure RBAC enabled, purge protection enabled, and 90-day soft delete. Its public network endpoint is enabled but its network ACL defaults to deny with no IP allowlist; `AzureServices` bypass remains enabled by the approved lean template.
- Network/observability: two delegated VNet subnets, one PostgreSQL private-DNS VNet link, VNet-integrated Container Apps managed environment, workspace-backed Application Insights, 30-day Log Analytics retention, and 1 GB daily cap.
- Diagnostics: one setting each for PostgreSQL, Blob service, and Key Vault, all targeting Log Analytics.
- Cost control: monthly $55 budget with five enabled actual/forecast notifications at 55%, 73%, 90%, 95%, and 100%. Budgets alert but do not stop spending.

## Deployment reconciliation note

The first resource deployment created the approved infrastructure but the parent deployment failed while evaluating the budget module output because Azure returned `55.0` for a Bicep `int` output. The module now returns the approved integer input rather than the provider-normalized resource property. Bicep build, ARM validation, and what-if passed after the fix, and the idempotent reconciliation completed successfully without creating, modifying, or deleting resources.
