# Production Infrastructure Specification

Status: design only. No Azure account, paid service, DNS, or production resource was created.

## Recommended managed architecture

Use separate Azure subscriptions or, at minimum, separate resource groups, VNets, identities, Key Vaults, databases, storage accounts, registries, logs, and DNS names for staging and production.

`Entra ID + MFA -> identity-aware HTTPS proxy -> internal Azure Container App -> private PostgreSQL + private Blob Storage`

- Application: Azure Container Apps, minimum two replicas for production, immutable image digest, nonroot/read-only container, health probes, revision rollback, system-assigned managed identity. Container Apps ingress supplies TLS termination, routing, and revision traffic splitting; IP restrictions are also available ([ingress](https://learn.microsoft.com/en-us/azure/container-apps/ingress-environment-configuration), [IP restrictions](https://learn.microsoft.com/en-us/azure/container-apps/ip-restrictions)).
- Database: Azure Database for PostgreSQL Flexible Server 17, private VNet access/private DNS, public access disabled, TLS required, separate migration and runtime roles, zone-redundant HA when approved. Azure documents private networking modes and encrypted PITR backups ([networking](https://learn.microsoft.com/en-us/azure/postgresql/network/how-to-networking), [backup/PITR](https://learn.microsoft.com/en-us/azure/postgresql/backup-restore/concepts-backup-restore)).
- Documents: general-purpose v2 Blob Storage, private container, public network and anonymous access disabled, Private Endpoint, Entra managed-identity authorization, Shared Key disabled, encryption at rest, soft delete and versioning enabled. Microsoft recommends Entra/managed identity and disabling Shared Key and anonymous access ([authorization](https://learn.microsoft.com/en-us/azure/storage/common/authorize-data-access), [private endpoints](https://learn.microsoft.com/en-us/azure/storage/common/storage-private-endpoints), [soft delete/versioning](https://learn.microsoft.com/en-us/azure/storage/blobs/soft-delete-vs-versioning-options)).
- Secrets: environment-specific Azure Key Vault, private endpoint, RBAC, purge protection, soft delete, diagnostic logs, application managed identity allowed only `get` on named secrets. Microsoft recommends managed identities, least privilege, and separate vaults by app/environment ([Key Vault guidance](https://learn.microsoft.com/en-us/azure/key-vault/general/secure-key-vault)).
- Images: private Azure Container Registry; deploy by immutable digest; managed identity pull; vulnerability/image scan must pass before promotion.

## Network and firewall

Expose only TCP 443 at the identity-aware edge. OID app ingress is internal and accepts traffic only from the identity proxy subnet/service identity. App subnet may reach PostgreSQL 5432, Blob 443, Key Vault 443, registry 443, Entra/OIDC endpoints, and telemetry endpoints. PostgreSQL and Blob have no public endpoint. Deny other east-west and outbound traffic by default where platform capability permits. Administrative access uses Entra, JIT elevation, and an approved private management path; never a database public firewall exception.

## TLS and DNS

Use a dedicated authenticated hostname, managed certificate, TLS 1.2 or newer, HSTS, exact redirect/origin allowlists, and no wildcard callbacks. DNS ownership, hostname, certificate issuance, and changes require Shelby approval. Internal private DNS resolves PostgreSQL, Blob, and Key Vault private endpoints.

## Backups and recovery

- PostgreSQL: 35-day PITR target, zone-redundant backup where supported, optional geo-redundant backup based on approved RPO/region risk. Take an encrypted logical `pg_dump` before high-risk releases and retain outside the database service under separate backup authority.
- Blob: versioning plus 35-day soft delete as an initial proposal; lifecycle retention requires governance approval. Protect the storage resource against deletion and keep backup operators separate from app operators.
- Initial proposed objectives pending owner approval: RPO <= 15 minutes for database, <= 24 hours for documents; RTO <= 8 hours. Perform quarterly restore drills into isolated recovery resources and verify row counts, trigger controls, document hashes, permissions, and audit immutability.

## Monitoring and retention

Send application structured logs, Container Apps metrics, Entra sign-ins, Key Vault access, storage access, PostgreSQL metrics/logs, backup jobs, deployment events, and network security events to an environment-specific Log Analytics/Application Insights workspace. Alert on health failure, elevated 5xx/latency, failed login/authorization spikes, release/allocation/critical-exception events, audit-integrity failure, database capacity/connections, backup failure, storage authorization failure, secret access anomaly, and identity policy changes.

Proposed online operational/security log retention is 90 days and archive retention is one year; audit/business/document retention must not be set until governance and counsel approve the records schedule.

## Deployment sequence and gates

Owner selects region/subscription/budget and approves provider spend. Security reviews threat model/network/identity. Governance approves RPO/RTO/retention. Create staging first, run migrations with the migration role, seed roles, validate least privilege, scan the image/SBOM, execute all workflows, restore drill, revocation test, and penetration/security review. Production creation and DNS follow only a signed go/no-go. No real data is permitted during infrastructure acceptance.
