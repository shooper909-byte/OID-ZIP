# OID Azure Tenant Portability Review

Status: PASS for infrastructure design; redeployment still requires target-tenant identity/bootstrap work.

## Permanent prohibited-source boundary

**UHV AZURE STATUS: PROHIBITED FOR OID**  
**Reason: University authorization was denied.**

The UHV tenant, subscription, identities, promotional credit, credentials, and storage may not be used for OID. No UHV identity may be an OID infrastructure dependency or administrator. There is no permitted migration path from UHV because no OID resource or data should ever be created there.

## Portability findings

| Requirement | Result | Evidence / migration action |
|---|---|---|
| Subscription ID parameterized | PASS | `expectedSubscriptionId` is supplied per environment; only a boolean match is emitted. |
| Tenant ID parameterized | PASS | `entraTenantId` is supplied to Easy Auth and the identity bridge. Key Vault uses the target subscription tenant dynamically. |
| Region configurable | PASS | `location` is a free deployment parameter; availability must be checked in the target subscription. |
| Resource names configurable | PASS | `resourcePrefix`, `environment`, `resourceGroupName`, and globally unique suffixes drive names. |
| Entra app/groups configurable | PASS | Client ID, tenant ID, allowed group object IDs, and administrator object IDs are parameters. |
| Key Vault references portable | PASS | Vault and secret URIs are derived from resources created in the target deployment; no university vault URI exists. |
| DNS independent of university | PASS | No university DNS suffix or record is embedded. `pilotHostname` is optional and fail-closed until explicitly supplied. PostgreSQL private DNS is recreated with the target VNet. |
| PostgreSQL portable | PASS | Version, SKU, storage, retention, network, database, and credentials are parameters/resources. Prisma migrations and integrity controls remain application-owned. |
| Blob Storage portable | PASS | Storage account/container are recreated; application endpoint is injected from the deployed account; managed identity is used instead of account keys. |
| Managed identities recreatable | PASS | The user-assigned identity and its Blob, Key Vault, and ACR role assignments are declarative resources. Object IDs are not carried between tenants. |
| Application redesign required | NO | Redeployment requires new Entra objects, managed-identity principal, Key Vault secret versions, and target subscription validation—not OID authorization redesign. |
| Synthetic staging data migration required | NO | Development data may be discarded. Rebuild schema from migrations and seed only approved synthetic records in the new tenant. |

## Safe transfer sequence

1. Create or identify an OligoPoly-controlled Microsoft Entra tenant and Azure subscription.
2. Create target-tenant Entra app, enterprise application, MFA policy, groups, and independent emergency administrators.
3. Populate a new uncommitted parameter file with target identifiers; generate new secrets. Never reuse university-linked credentials or managed-identity object IDs.
4. Run Bicep build, ARM validate, and what-if against the target subscription.
5. Deploy a new synthetic-only staging environment after separate cost/resource approval.
6. Run migrations and synthetic seeds; rerun all security, identity, backup, and workflow tests.
7. If a future company-controlled staging environment is replaced, discard its synthetic data and remove it only after evidence preservation and explicit deletion approval.

No database dump, Blob copy, Key Vault secret transfer, or DNS move exists or is permitted from UHV. Production data must never be introduced into a university-controlled or ownership-uncertain environment.
