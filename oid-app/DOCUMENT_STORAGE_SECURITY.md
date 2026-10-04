# Document Storage Security

## Implemented locally

- Files reside outside `public`; storage keys are canonicalized and traversal outside the private root is rejected.
- New files use exclusive creation and owner-only `0600` permissions.
- SHA-256 is recorded on upload and verified before download.
- Download requires `document.read`, rejects non-active versions, and creates a `DOWNLOAD` audit event.
- Duplicate active hashes are serialized by a PostgreSQL advisory lock and blocked by both the service and a partial unique index.
- Version upload references the prior document, increments the version, and marks the prior record `SUPERSEDED`.
- Upload size/title/type/identifier fields are validated. Downloads use safe content-disposition and `no-store`.

Tests cover traversal rejection, duplicate rejection, concurrent duplicate serialization, authenticated retrieval/hash round-trip, download auditing, unauthorized download denial, and version supersession.

## Production requirements still external

Replace the local-filesystem adapter with private encrypted object storage using workload identity. Disable anonymous/public and Shared Key access; allow only the app private endpoint and managed identity. Enable versioning, soft delete, deletion protection, storage diagnostics, malware scanning/quarantine before a document becomes active, and an independently protected backup. Never issue a public or long-lived download URL; stream only after OID authorization or use a very short-lived user-delegation URL bound to the authorized operation.

Recovery must restore database metadata and object versions to a consistent point, then verify every active object's SHA-256. Orphan-object reconciliation is required because a storage write cannot participate atomically in the PostgreSQL transaction. This is a documented remaining risk and must be handled by a scheduled quarantine/reconciliation job before production.
