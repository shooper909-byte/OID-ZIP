# Azure Secrets Register — OID Controlled Pilot

Status: design only; no Azure vault or pilot secrets have been created.

Actual values, hashes, screenshots containing values, and connection strings must never be committed, copied into tickets, written to deployment logs, embedded in images, or included in this register.

| Key Vault secret name | Purpose | Initial source/owner | Consumer | Rotation / revocation trigger | Notes |
|---|---|---|---|---|---|
| `postgres-bootstrap-admin-password` | Initial Azure PostgreSQL administrator credential | Authorized Azure/database administrator | One-time database bootstrap operator | Immediately after role bootstrap if operationally possible; otherwise every 90 days and on administrator change or suspected exposure | Must not be available to the OID application or routine migration job. |
| `oid-runtime-database-url` | TLS connection string for non-owner `oid_runtime` | Database administrator | OID Container App | Every 90 days, on exposure, personnel change, or database restore/cutover | DML-only role; no DDL, superuser, role administration, or bypass of database controls. |
| `oid-migration-database-url` | TLS connection string for `oid_migration` | Database administrator | Manual one-shot migration job | After every approved migration window or suspected exposure | Never mounted in the runtime container. |
| `oid-trusted-proxy-secret` | Authenticates the local identity bridge to OID trusted-proxy mode | Security owner, generated with a cryptographic RNG | Identity bridge and OID container only | Every 90 days, image/identity incident, or suspected exposure | Minimum 32 random bytes; it is not a user credential. |
| `entra-oid-client-secret` | Container Apps Easy Auth confidential-client credential | Entra application owner | Container Apps authentication configuration | Before Entra expiry, on application-owner change, or suspected exposure | Prefer certificate/federated credentials when supported by the final Easy Auth configuration; use shortest operationally practical lifetime. |

## Non-secret configuration

The following are identifiers or endpoints, not secrets: Azure tenant ID, subscription ID, Entra client/application ID, Entra group object IDs, user-assigned managed identity client ID, Storage Blob service URL, Blob container name, PostgreSQL host name, Key Vault URI, application hostname, ACR login server, and image digest. They still belong in controlled configuration because incorrect values can break isolation.

## Secret flow

1. An authorized operator generates the value locally without echoing it.
2. The value enters an approved temporary deployment parameter or Key Vault write operation.
3. Bicep parameters are marked `@secure()` and the example parameter file reads only named environment variables.
4. Container Apps resolves Key Vault references using the user-assigned managed identity.
5. OID and the identity bridge receive only the minimum secret each process needs.
6. Operator environment variables are cleared after validation/provisioning and are never retained as evidence.

Blob access uses managed identity and Azure RBAC; no Storage account key or SAS is required. Key Vault and Blob requests must be logged. The application image must contain no `.env` file or secret material.

## Access model

- Workload identity: `Key Vault Secrets User` on the pilot vault and `Storage Blob Data Contributor` on the pilot storage account.
- Migration job: runtime access only to its migration URL reference for an approved execution window.
- Human secret administrators: named, MFA-protected, time-bounded operators approved by Shelby; no standing broad subscription owner role is created by this package.
- OID users: no direct Key Vault, Blob, ACR, or database credential access.

## Evidence required to close the secret-management gate

- Vault RBAC and network settings export.
- Secret-name/version inventory with values redacted.
- Managed-identity access success and denied anonymous/Shared Key tests.
- Runtime and image secret scans.
- Rotation and emergency-revocation drill.
- Evidence that audit/log export does not contain credential values.

