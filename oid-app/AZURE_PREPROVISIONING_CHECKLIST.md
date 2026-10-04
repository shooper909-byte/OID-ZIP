# OID Azure Pre-Provisioning Checkpoint

## 2026-08-11 controlled staging pilot closeout

Status: **READY FOR CONTROLLED STAGING PILOT — NOT PRODUCTION**  
Authorized use: Shelby only, synthetic/non-sensitive data only, existing Azure-generated staging hostname only  
Closeout method: documentation and read-only verification; no Azure/Entra mutation

The original pre-provisioning record below is retained as deployment history. Its former stop condition was satisfied by the separately authorized foundation/data and application-stage deployments recorded in `AZURE_STAGE12_DEPLOYMENT_2026-08-10.md` and `AZURE_APPLICATION_STAGE_DEPLOYMENT_2026-08-10.md`. It must not be read as current authorization for any additional resource or identity change.

### Closeout checklist

- [x] Environment explicitly classified as controlled staging pilot, not production.
- [x] Foundation/data deployment and application deployment reconciled to successful Azure states.
- [x] Sole active revision is `Provisioned` and `Healthy`, with 100% traffic and scale `0–1`.
- [x] Runtime and migration image SHA-256 digests are recorded; both final images had zero High/Critical Trivy findings.
- [x] Fresh liveness and readiness checks return HTTP 200; protected unauthenticated access returns HTTP 401.
- [x] Fresh Shelby Easy Auth log proves `pwd,mfa`; MFA enforcement remains enabled.
- [x] Enterprise application requires assignment and has only the pilot-group assignment.
- [x] Pilot group contains only Shelby; no additional user was added.
- [x] Workload identity retains exactly five least-privilege assignments and cannot read migration/bootstrap credentials.
- [x] PostgreSQL is ready, private, TLS-controlled, and retains the empty synthetic-pilot baseline; no migration was run.
- [x] Monthly budget is exactly `$55`; all five actual/forecast notifications are enabled and addressed to `labs@oligopolypeptides.com`.
- [x] Resource inventory and timestamped cost baseline are recorded in the deployment report.
- [x] Obsolete invalid Key Vault secret object `entra-client-secret` is identified, confirmed unused by the app, and intentionally not deleted.
- [x] Operational procedures cover startup, scale-to-zero/shutdown, rollback, incident response, backup/restore, secret rotation, and cost monitoring.
- [x] Shelby's synthetic-only navigation checklist covers all eight OID navigation sections.
- [x] Remaining production, additional-user, custom-domain, migration, and real-data gates are explicit.
- [x] Repository status was checked; no commit or push was performed.

### Shelby pilot test — synthetic data only

Use names prefixed `SYNTHETIC-PILOT-`; never enter real people, suppliers, customers, labs, products, lots, documents, payments, credentials, or production identifiers.

- [ ] **Command Center:** open the dashboard; confirm all cards render and reconcile after the synthetic exercises.
- [ ] **Suppliers:** inspect/create only a synthetic supplier and verify qualification/risk/product fields do not imply approval without evidence.
- [ ] **Lots & Traceability:** run one synthetic passing chain from supplier/PO/receipt/lot/sample/independent test/review through release and released-only allocation; confirm exact links and timeline.
- [ ] **Exceptions:** run one synthetic failed or inconclusive result; confirm HOLD/BLOCKED state, release denial, exception creation, and final synthetic disposition.
- [ ] **Actions:** create/inspect a synthetic follow-up action; verify owner, priority, due date, status, and audit trail.
- [ ] **Decisions:** record a synthetic decision with evidence and human authorization; confirm an unauthorized role cannot approve it.
- [ ] **Ask OID:** ask only about the synthetic records; confirm supporting evidence, conflicts, unknowns, required actions, and confidence are separated and no write/approval occurs.
- [ ] **Migration:** view the import-control page only; confirm no batch executes, no legacy source connects, and nothing is automatically verified or approved.
- [ ] Finish with logout/revocation evidence, audit review, zero-negative-inventory confirmation, and a written issue/decision log. Stop immediately for real-data entry, access/control bypass, audit mutation, incorrect release/allocation, secret exposure, or monitoring blindness.

Status: **STOP — SHELBY AUTHORIZATION REQUIRED BEFORE ANY AZURE CREATION COMMAND**  
Environment: `OID-STAGING` only  
Data: synthetic records and non-sensitive test documents only

**UHV AZURE STATUS: PROHIBITED FOR OID — university authorization was denied.** The UHV tenant, subscription, promotional credit, and identities are invalid deployment targets.

## Readiness facts

| Check | Status | Evidence / required action |
|---|---|---|
| Azure CLI detected | PASS | Azure CLI 2.89.0 is installed. It must be authenticated only to the future OligoPoly-controlled tenant. |
| Container builder detected | BLOCKED | Docker, Podman, and nerdctl were not found. Provide an approved builder or CI runner. |
| Image scanner detected | BLOCKED | Trivy was not found. Configure an executable local/CI image scan before push/deploy. |
| Azure subscription detected | PASS | Company subscription is Enabled; signed-in company administrator is subscription Owner; active Microsoft Customer Agreement verified. No promotional credit is assumed. |
| Tenant detected | PASS WITH HARDENING REQUIRED | Company directory is selected; signed-in administrator is Global Administrator. The tenant has one user, no university-pattern identity, and no Azure resources. Custom company domain verification and independent cloud-only administrators remain open. |
| Resource providers registered | BLOCKED | Only `Microsoft.Authorization`, `Microsoft.Consumption`, and `Microsoft.Resources` are registered. Nine required providers remain `NotRegistered`; registration is a subscription modification requiring Shelby approval. |
| Region | PASS | East US 2 advertises all required resource types and PostgreSQL 17 `Standard_B1ms`. East US is rejected because PostgreSQL capability reports provisioning restricted for this subscription. |
| Monthly cost | REQUIRES OWNER APPROVAL | Zero-credit Pay-As-You-Go estimate: minimum active $22–$25; normal $28–$42; expected worst case $50–$55 before taxes/transient restores. Bicep Azure-consumption budget is $55. |
| IaC validation | PASS | Bicep template and parameter compilation passed. Live ARM subscription validation passed. Live what-if passed with 19 creates for the fail-closed foundation/data stage and no deletes/modifies. Provider states remained unchanged. |
| DNS unchanged | PASS | No DNS command or change was made. |
| Real data disconnected | PASS | No customer, supplier, WooCommerce, laboratory, production OligoPoly data, or real document was connected. |
| Azure resources created | PASS (none) | No Azure create/deploy command was run. |

## Exact proposed resources

All resources are in one proposed `oid-staging-rg` resource group unless subscription-scoped by Azure:

1. One VNet (`10.40.0.0/20`) with a Container Apps delegated `/23` subnet and PostgreSQL delegated `/28` subnet.
2. One private DNS zone ending in `.postgres.database.azure.com` plus one VNet link.
3. One Log Analytics workspace, 30-day retention, 1 GB/day cap.
4. One workspace-based Application Insights resource.
5. One external-ingress Azure Container Apps managed environment with VNet integration and encrypted/mTLS peer traffic.
6. One PostgreSQL Flexible Server 17, `Standard_B1ms`, 32 GiB, 35-day backups, no HA/geo-redundancy, private VNet/no public endpoint; one `oid` database.
7. One Standard LRS StorageV2 account; one private `oid-documents` container; public blobs and Shared Key disabled; default-deny network ACL; versioning/change feed/35-day soft delete enabled.
8. One Standard Key Vault with RBAC, purge protection, 90-day soft delete, default-deny network ACL.
9. Diagnostic settings for PostgreSQL, Blob, and Key Vault to Log Analytics.
10. Conditional application stage: one user-assigned managed identity; one Basic ACR; workload RBAC assignments; five named Key Vault secrets; one Container App with Easy Auth and two local containers; optional one-shot migration job.
11. One resource-group-scoped monthly Azure Budget with company email alerts; default Azure-consumption ceiling $55. Entra Free is assumed; no identity license purchase is authorized.

Resources likely to generate charges are PostgreSQL compute/storage/backup, ACR, Blob storage/operations/version retention, Key Vault operations, private DNS, Log Analytics/App Insights ingestion/alerts, Container Apps usage beyond free grants, and any new Entra P1 licenses.

## Required identifiers and approvals

- [ ] Approved subscription ID and billing owner.
- [ ] Approved Entra tenant ID.
- [ ] Approved East US 2 residency/capacity choice.
- [ ] Named Azure administrators and object IDs; least-privilege deployment role agreed.
- [ ] Entra app/client ID and allowed pilot group object ID.
- [ ] Named 1–3 pilot users and separately approved OID roles.
- [ ] MFA/Conditional Access design and license entitlement approved by Security.
- [ ] Five secret values generated through the controlled process; values remain absent from the repository.
- [ ] Approved pilot hostname; **no DNS change yet**.
- [ ] Container builder and scanner available; runtime and migration images pass High/Critical policy and immutable digests are recorded.
- [ ] Azure `validate` and `what-if` outputs reviewed; exact resource diff matches this list.
- [ ] Final Azure Pricing Calculator export is at or below $75/month expected case and approved by Shelby.
- [ ] Quality, Security, Governance, and Legal pilot approvals required by existing gate documents are recorded.
- [ ] Written authorization says exactly: provision `OID-STAGING` with synthetic data only.

## Mandatory post-foundation tests before application stage

- PostgreSQL has no public endpoint; only approved Container Apps network traffic succeeds; TLS 1.2+; backup configuration visible; point-in-time restore to a new test server succeeds.
- Anonymous, public-container, Shared Key, unapproved-network Blob requests fail; managed-identity upload/download succeeds; SHA-256 mismatch, duplicate, version, and audit behavior pass.
- Key Vault anonymous/unassigned access fails; workload identity retrieves only approved secret references; logs contain no values.
- Diagnostics arrive in Log Analytics; alerts and cost budget fire through an authorized test channel.
- Entra wrong-tenant, non-member, absent-MFA, disabled, group-removed, and revoked-session requests fail.
- Full OID positive and failed-test synthetic workflows pass with database triggers, RBAC, audit, release, and released-only allocation controls unchanged.

## Rollback/delete procedure

1. Stop activation and preserve validation, audit, logs, configuration exports, image digests, and required synthetic evidence.
2. Roll the Container App to the prior approved image digest if only application rollback is required.
3. For database failure, restore to a new server at the approved recovery point and validate integrity before cutover; do not overwrite the source server.
4. For full teardown, resolve and display the exact staging resource-group ID, obtain Shelby's explicit deletion approval, then delete only `oid-staging-rg` through one Azure toolchain.
5. Confirm deletion and residual billing resources. DNS is outside this template and remains unchanged.

## Stop condition

The package is prepared but not authorized. Do not install licenses, register providers, create an Entra application, create resources, push images, deploy, upload data, or change DNS until Shelby explicitly approves the cost and exact resource list.
