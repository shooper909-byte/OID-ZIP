# OID Azure Application Stage Authorization Request — 2026-08-10

## Decision

**READY FOR EXPLICIT APPLICATION-STAGE DEPLOYMENT AUTHORIZATION. NOT DEPLOYED.**

The OID Container App and Easy Auth configuration do not exist. No real data was connected, and no access was granted beyond Shelby's single-member pilot group.

## Authorized prerequisites completed

- Created one single-tenant `OID-STAGING` Entra application and enterprise application.
- Enabled ID tokens, configured only the planned Container Apps callback, and required app-role assignment.
- Created `OID-STAGING-PILOT-USERS` with Shelby as its only member and only enterprise-app assignment.
- Created one 90-day application credential, expiring 2026-11-08, and stored it as the private Key Vault secret `entra-oid-client-secret`. The template references this existing secret and does not accept the credential as a deployment parameter.
- Created the Basic ACR `oidstagingacrqgvnukjcy7jwk`; admin access remains disabled.
- Built separate runtime and migration targets with ACR Tasks and pinned each by immutable SHA-256 digest.
- Enabled only the Azure PostgreSQL `pgcrypto` extension allow-list entry and created the extension through the bootstrap administrator. The migration role was not granted database CREATE.
- Created `oid_runtime` and `oid_migration`, tested both inside the existing Container Apps VNet, and removed the temporary job, identity, and AcrPull assignment afterward.

An obsolete first-pass Key Vault secret named `entra-client-secret` remains inaccessible behind the vault firewall. Its credential was invalidated by the final single-credential reset; it is not referenced by Bicep or the planned app. Removing that inert secret requires a later private data-plane cleanup and is not part of the application deployment diff.

## Application and image validation

- Clean dependency install/audit: 165 packages, 0 npm vulnerabilities.
- Committed-source secret scan: PASS.
- Container hardening and Azure identity bridge checks: PASS.
- Prisma schema/client generation and TypeScript: PASS.
- Unit/security tests: 19/19 PASS. The four database integration cases were deferred from the stopped local PostgreSQL instance to the private Azure database gate below.
- Next.js 16.3.0 production build: PASS.
- ACR runtime and migration image builds: PASS.
- Trivy 0.73.0 High/Critical vulnerability scans: 0 findings for both final digests.
- Trivy secret scans: only the Azure SDK's embedded public Azurite development key. Its SHA-256 exactly matched Microsoft's published emulator key; no private credential or additional secret class was found.

## Private PostgreSQL gate

The final VNet execution returned:

```json
{"status":"PASS","runtimeRole":"oid_runtime","migrationRole":"oid_migration","appliedMigrations":5,"applicationTables":43,"businessRows":0,"runtimeDdlDenied":true,"realDataConnected":false}
```

Both login roles were created without superuser, createdb, createrole, replication, or bypass-RLS capability. `oid_migration` owns/applies schema migrations; `oid_runtime` receives DML/sequence access and cannot create schema objects.

## Final ARM/Bicep result

Parameters: `deployApplication=true`, `deployMigrationJob=false`, `reuseExistingFoundationData=true`, East US 2, one expected pilot user, $55 monthly Azure budget, real Entra IDs, and both immutable image digests.

- Bicep build: PASS.
- Subscription-scope ARM validation: Succeeded.
- ARM what-if: Succeeded.
- Creates: **12**.
- Modifies: **0**.
- Deletes: **0**.
- Resource-group deployment: **1**, reapplies the same resource-group metadata/tags.
- Existing dependencies ignored/read-only: **11**.

### Twelve proposed creates

1. User-assigned application managed identity.
2. Storage Blob Data Contributor assignment for that identity.
3. ACR Pull assignment for that identity.
4. Key Vault Secrets User assignment scoped to the existing Entra secret.
5. Runtime database URL secret.
6. Key Vault Secrets User assignment scoped to the runtime database URL secret.
7. Migration database URL secret.
8. PostgreSQL bootstrap-administrator password secret.
9. Trusted-proxy secret.
10. Key Vault Secrets User assignment scoped to the trusted-proxy secret.
11. Two-container OID Container App, scale 0–1, using the pinned runtime digest.
12. Container Apps Easy Auth configuration restricted to the approved tenant, application, and Shelby-only pilot group.

The Basic ACR and Entra client secret are existing prerequisites and are not recreated. The optional migration job is not included.

## Planned URL and callback

- Application URL: `https://oid-staging-app-qgvnukjcy7jwk.jollyfield-2bcf5822.eastus2.azurecontainerapps.io`
- Entra callback: `https://oid-staging-app-qgvnukjcy7jwk.jollyfield-2bcf5822.eastus2.azurecontainerapps.io/.auth/login/aad/callback`

The URL is deterministic but is not live until deployment succeeds. No custom DNS change is included.

## Revised monthly cost

- Basic ACR: approximately **$5.07/month**, plus small image storage; completed ACR Task builds/scans are usage-based.
- Container Apps: scale-to-zero has no idle application compute charge. The two containers request 0.75 vCPU and 1.5 GiB while active.
- Expected 1-user synthetic pilot total: approximately **$28–$42/month**.
- Expected upper pilot range: approximately **$50–$55/month**.
- Continuous 730-hour activity could add roughly **$54/month** of Container Apps compute after the grant and raise the total above **$75/month**.

The existing **$55/month Azure budget remains an alert ceiling only; it does not stop spending**.

## Exact authorization requested

Authorize deployment of the 12 application-stage creates listed above with `deployApplication=true`, `deployMigrationJob=false`, the two approved image digests, the existing Shelby-only pilot group, and no real data. Do not authorize any additional user/group access, custom DNS, real-data connection, migration job, or other resource.

After any authorization, deployment must be followed by resource-count verification, Easy Auth denial/allow-path tests using Shelby only, health/readiness checks, URL verification, and confirmation that no real data is present.
