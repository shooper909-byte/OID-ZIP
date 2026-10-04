# OID v1 Production Gate Matrix — 2026-08-09

Classification is literal: `PASS`, `FAIL`, `BLOCKED_EXTERNAL`, `REQUIRES_OWNER_APPROVAL`, or `NOT_TESTED`. `PASS` covers only the stated gate and evidence; local implementation does not prove a future cloud configuration.

| Gate | Current status | Evidence | Can Codex complete it? | Requires external service/account? | Requires Shelby approval? | Requires legal/security/governance review? | Exact next action |
|---|---|---|---|---|---|---|---|
| Clean `npm ci`; lock retained | PASS | 2026-08-08 evidence; repeat in 2026-08-09 validation | Yes | No | No | No | Retain command result |
| Prisma validate | PASS | Local CLI pass against schema | Yes | No | No | No | Retain result |
| Prisma generate | PASS | Local client generation pass | Yes | No | No | No | Retain result |
| All migrations apply to fresh PostgreSQL 17.10 | PASS | Independently initialized PostgreSQL 17.10 cluster; all four migrations applied to empty database | Yes | No | No | No | Retain `fresh-migration*.txt` evidence |
| Forward recovery dump/restore | PASS | 2026-08-08 custom dump/restore with row/trigger verification | Yes locally | No locally | No | Governance for production targets | Repeat after current migration; managed restore drill later |
| Next.js production build | PASS | Next.js 16.3.0 optimized build passed 2026-08-09 | Yes | No | No | No | Retain `next-build.txt` |
| Unit/integration/e2e suite | PASS | 4 files, 17 tests passed 2026-08-09 | Yes | No | No | No | Repeat after documentation/final edits |
| QUARANTINE allocation blocked at service/database | PASS | Integration negative path and DB trigger rejection | Yes | No | No | Quality review required for policy | Preserve control |
| HOLD/REJECTED/RECALLED allocation blocked | PASS | Integration negative paths and DB trigger rejection | Yes | No | No | Quality review required for policy | Preserve control |
| Release requires reviewed independent PASS | PASS | Service and DB rejection; non-independent PASS rejected | Yes | No | No | Quality approval required | Preserve control |
| Open RELEASE/ALL blocker prevents release | PASS | Service and DB trigger rejection | Yes | No | No | Quality approval required | Preserve control |
| Failed test creates CRITICAL blocker and HOLD | PASS | Synthetic failed path asserts HOLD/BLOCKED and exception | Yes | No | No | Quality approval required | Preserve control |
| Concurrent over-allocation protected | PASS | One succeeds/one rejects; balance remains positive | Yes | No | No | No | Preserve transaction/trigger |
| Audit log immutable | PASS | DB UPDATE and DELETE attempts reject | Yes | No | No | Governance review of retention | Add production integrity alert |
| Duplicate active document SHA blocked | PASS | Service, partial unique index, advisory lock, concurrent test | Yes | No | No | No | Preserve index/lock |
| Passing synthetic traceability workflow | PASS | 2026-08-09 integration test through release/allocation | Yes | No | No | Quality sign-off pending | Retain machine log |
| Failed synthetic workflow | PASS | 2026-08-09 test through HOLD/exception/CAPA/rejection | Yes | No | No | Quality sign-off pending | Retain machine log |
| Machine-readable validation evidence | PASS | Existing 2026-08-08 JSON retained; 2026-08-09 JSON/SBOM/logs/dump stored separately | Yes | No | No | No | Preserve both dated evidence sets |
| Replace sample credentials/tokens | BLOCKED_EXTERNAL | Source uses placeholders and ignored local env; no production secret exists | Partially | Yes, managed vault/IdP/DB | Yes | Security | Generate only during approved infrastructure creation; rotate before pilot |
| TLS at reverse proxy/load balancer | BLOCKED_EXTERNAL | Architecture specified; no endpoint/certificate exists | No, without provider authority | Yes | Yes | Security | Approve hostname/provider; create staging edge; verify TLS/HSTS |
| Managed secret store | BLOCKED_EXTERNAL | Key Vault design documented; no vault exists | No, without provider authority | Yes | Yes | Security | Approve Azure environment; create separate staging vault/private endpoint/RBAC |
| Production database not publicly exposed | NOT_TESTED | Local DB is loopback; production DB does not exist | No, yet | Yes | Yes | Security | Build staging private VNet PostgreSQL; prove public access denied |
| Production private documents not publicly exposed | NOT_TESTED | Local root is private/traversal guarded; production object store absent | No, yet | Yes | Yes | Security/governance | Build staging private Blob endpoint; prove anonymous/public/key access denied |
| Development backup/restore | PASS | Isolated custom dump/restore passed 2026-08-08 | Yes | No | No | No | Repeat for current migration |
| Access revocation tested | BLOCKED_EXTERNAL | Adapter denies inactive users; end-to-end IdP session revocation not configured | No, fully | Yes | Yes | Security | Configure staging SSO, disable user/revoke sessions, prove denial and timing |
| RBAC reviewed by system/quality owner | REQUIRES_OWNER_APPROVAL | Complete matrix and automated separation tests exist | No | No | Yes | Quality/security | Shelby and designated quality owner sign matrix and toxic-combination rules |
| Replace single token with SSO before multi-user | BLOCKED_EXTERNAL | Trusted-proxy abstraction and plan implemented; no OIDC/Entra app exists | No, fully | Yes | Yes | Security | Approve/create staging Entra app/proxy/Conditional Access; run identity acceptance |
| Full vulnerability/dependency/image scanning | NOT_TESTED | `npm audit` zero; source-secret scan passed; CycloneDX SBOM generated. Docker/image/infra scanner unavailable | Partially | Scanner/image registry needed for full gate | Yes for provider | Security | Scan immutable image and deployed staging resources; review SBOM findings |
| Quality owner approves workflow/status vocabulary | REQUIRES_OWNER_APPROVAL | Current vocabulary and tests documented; no signed approval | No | No | Yes | Quality/governance | Named quality owner reviews statuses, blockers, evidence and disposition terms |
| Counsel reviews business/regulatory use | REQUIRES_OWNER_APPROVAL | No legal opinion exists | No | No | Yes | Legal | Shelby defines intended use/data; qualified counsel records review |
| Retention/correction policies approved | REQUIRES_OWNER_APPROVAL | Proposed log/backup values only; audit correction is append-only | No | Possibly archival services later | Yes | Legal/governance/security | Approve records schedule, holds, correction and deletion policy |
| Founder-reserved decisions confirmed | REQUIRES_OWNER_APPROVAL | Founder permissions explicit; reservations not signed | No | No | Yes | Governance | Shelby confirms reserved decisions and delegate boundaries |
| AI retrieval/sensitive-data rules approved | REQUIRES_OWNER_APPROVAL | RBAC retrieval hardening and AI security review complete | No | External model only if later approved | Yes | Legal/security/governance | Approve field allowlist, provider terms, retention, injection/DLP tests |

## Audit result

No gate is classified `FAIL`. Local technical controls are materially stronger and objectively tested. External identity, managed infrastructure, production scans, access-revocation evidence, and all governance approvals remain open; therefore this matrix does not authorize production or a pilot start.
