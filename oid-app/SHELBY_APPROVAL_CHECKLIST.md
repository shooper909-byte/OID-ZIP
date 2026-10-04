# OID v1 Shelby Approval Checklist

Original checklist date: 2026-08-09  
Closeout date: 2026-08-11  
Status: **READY FOR CONTROLLED STAGING PILOT — NOT PRODUCTION.**

The status above applies only to the existing East US 2 OID staging environment, Shelby-only access, and synthetic data. It does not authorize customer/supplier data, WooCommerce, additional users, a custom domain, migration execution, public launch, or production deployment. The historical decision tables remain below for traceability; unchecked items are not implied approvals.

## Controlled staging-pilot closeout

| Status | Gate | Verified evidence |
|---|---|---|
| [x] | Scope | Synthetic data only; no real-data source, migration job, import, or business connector is enabled. |
| [x] | Deployment | Subscription deployment oid-application-deploy-20260810 succeeded in East US 2. |
| [x] | Identity | Easy Auth is enabled for the approved tenant and client; assignment is required. |
| [x] | Access | The enterprise application has one assignment, OID-STAGING-PILOT-USERS; Shelby is its sole direct member. |
| [x] | MFA | Fresh authentication emitted pwd,mfa; the existing bridge accepted literal mfa without weakening enforcement. |
| [x] | Health | Live and readiness probes return HTTP 200; the authenticated OID home page and navigation render. |
| [x] | Images | Runtime is pinned to sha256:a8b634e6b6b3cc47ef371df4ac518f6809b6a6c5e890c139d5ef2a0d0e52aac2; the unused migration image is pinned to sha256:d80091a0ac49c7e41435b30790812cef0e915c948bae38aa6ecde7dbf2220ed2. |
| [x] | Database | PostgreSQL 17 is private and Ready; predeployment in-VNet evidence recorded five migrations, 43 tables, zero business rows, and runtime DDL denial. |
| [x] | Scale control | The sole active revision is at 100% traffic with minimum 0 and maximum 1 replica. |
| [x] | Cost control | Monthly budget is $55 with five enabled actual/forecast alerts to labs@oligopolypeptides.com; alerts do not stop spending. |
| [x] | Secret boundary | The application identity cannot read migration or bootstrap-administrator credentials; the obsolete invalid Key Vault secret is identified but retained. |

## Shelby synthetic pilot test

Use invented organizations, identifiers, lots, dates, and evidence only. Do not paste customer, supplier, payment, WooCommerce, laboratory, or other real business data.

- [ ] Sign in with MFA and confirm the OID home page and all eight navigation links render.
- [ ] **Command Center:** confirm cards load and every count is consistent with the synthetic records created during the test.
- [ ] **Suppliers:** create or inspect only a clearly synthetic supplier; open its detail view and confirm qualification/risk fields render.
- [ ] **Lots & Traceability:** create or inspect only a synthetic lot; confirm supplier, status, release gate, and evidence timeline.
- [ ] **Exceptions:** create or inspect a synthetic exception and confirm severity, blocking state, status, and due date.
- [ ] **Actions:** create or inspect a synthetic action and confirm priority, status, owner workflow, and due date.
- [ ] **Decisions:** create or inspect a synthetic decision and verify the reserved-decision and audit behavior without representing it as a real approval.
- [ ] **Ask OID:** use a synthetic question; verify evidence, conflicts, unknowns, required actions, and confidence stay tied to synthetic records.
- [ ] **Migration:** verify the page loads; do not upload, import, execute, or promote any batch.
- [ ] Sign out, confirm an unauthenticated application request is denied or redirected, then sign in again with MFA.
- [ ] Record defects and screenshots without tokens, secrets, complete identity headers, or real data.

## Remaining authorization gates

- [ ] **Production:** independent security, privacy/legal, Quality/governance, resilience, restore, load, monitoring, incident, and final go/no-go evidence.
- [ ] **Additional users:** approved named roster, employment/authorization verification, least-privilege role, MFA proof, group-only assignment, and access-review owner.
- [ ] **Custom domain:** DNS ownership/export, approved hostname, certificate and redirect design, Easy Auth callback/origin updates, validation, what-if, rollback, and explicit deployment authorization.
- [ ] **Migration execution:** approved source and mapping, synthetic dry run, backup, reconciliation criteria, one-shot job authorization, monitored execution, and post-run disablement.
- [ ] **Real-data connection:** data classification, legal/privacy approval, retention, data-owner authorization, least privilege, backup/restore, reconciliation, rollback, and explicit connection approval.

## Decisions required before any paid provisioning

| Approve | Decision | Recommendation | Consequence/cost | Required attachment |
|---|---|---|---|---|
| [ ] | Azure as the single managed pilot platform | Approve the architecture in `DEPLOYMENT_ARCHITECTURE_DECISION.md` | Establishes Azure billing and administrative responsibility | Signed architecture decision |
| [ ] | Subscription and billing owner | Shelby-owned business subscription with MFA and budget alerts | Creates financial liability and audit ownership | Subscription/billing proof with IDs, no secrets |
| [ ] | Region and data residency | One region approved by legal/security after data classification | Affects availability, latency, residency and price | Written region decision |
| [ ] | Monthly ceiling and pilot duration | Pricing Calculator estimate plus 25% contingency; automated budget alerts | Prevents unbounded spend but alerts do not hard-stop all services | Calculator export and ceiling |
| [ ] | Entra licensing | Use existing P1 entitlement if proven; otherwise license only named pilot users | New annual user licensing may be required | License inventory/quote |
| [ ] | Front Door Premium | Approve despite fixed/usage cost because private origin and edge rate limiting are mandatory | Likely a significant recurring cost | Quote and private-origin rationale |
| [ ] | PostgreSQL capacity | Smallest validated Burstable PostgreSQL 17 SKU; no HA only if pilot risk is accepted | Paid continuously when running; single-zone has downtime risk | Load estimate, RPO/RTO and risk acceptance |
| [ ] | Blob protection level | Hot LRS, 35-day version/soft delete; approve vaulted backup if review requires independent copy | Versions/backups increase storage | Retention and backup decision |
| [ ] | Defender plans | Enable registry assessment and CSPM/Containers scope recommended by security reviewer | Paid security service | Plan/price export and reviewer recommendation |
| [ ] | Professional reviews | Fund/assign independent security, legal/privacy and Quality/governance reviewers | May incur professional fees and schedule dependency | Named reviewers and scope |

## Decisions required before identity or DNS changes

| Approve | Decision | Recommended setting | Evidence required before approval |
|---|---|---|---|
| [ ] | Pilot hostname | `oid.oligopolypeptides.com` or a specifically approved internal-pilot subdomain | DNS owner and existing-record export |
| [ ] | Identity population | Named employees/contractors only; no shared accounts; minimum necessary roles | User list, employment/authorization status, manager and RBAC role |
| [ ] | Break-glass custodians | Two cloud-only emergency accounts, separately controlled and monitored | Custodian acknowledgment, test log, alert route |
| [ ] | MFA method | Phishing-resistant method where available; no SMS-only exception without Security approval | Conditional Access policy draft and exception list |
| [ ] | OIDC gateway image | Security-reviewed, pinned digest and maintained upstream | SBOM, provenance, vulnerability report and security approval |
| [ ] | DNS maintenance window | Staging security passed; rollback owner present; low-impact window | Change ticket, exact before/after records, rollback timing |

## Decisions required before controlled-pilot activation

| Approve | Gate | Shelby must confirm | Objective evidence required |
|---|---|---|---|
| [ ] | Scope | Synthetic data only; named internal users; no live customer, supplier, WooCommerce, payments or live OligoPoly integration | Pilot roster and data-scope statement |
| [ ] | Cost | Budget and alerts are active; owner accepts actual usage uncertainty | Azure budget screenshot/export and notification test |
| [ ] | Security | Independent reviewer has no unresolved Critical/High blocker | Signed security report and exception register |
| [ ] | Quality | Quality owner accepts release/evidence workflow and no control weakening | Signed Quality protocol/results |
| [ ] | Governance | RBAC, access reviews, change control, incident and shutdown authority are approved | Signed governance checklist |
| [ ] | Legal/privacy | Counsel/privacy owner approves data class, region, retention and terms or states non-applicability | Signed legal/privacy finding |
| [ ] | Recovery | PITR, logical database restore, Blob recovery and revision rollback drills passed | Restore reports with RPO/RTO and reconciled hashes/counts |
| [ ] | Monitoring | Critical alerts reach two responders and sensitive data is absent from logs | Alert drill and log-sampling report |
| [ ] | Final go/no-go | Every mandatory gate has objective evidence and no veto remains | Dated gate matrix and sign-off record |

## Explicitly not authorized by this checklist

- Creating an account or paid Azure resource before the matching signed approval.
- Changing DNS, exposing a public endpoint, or activating Front Door routing.
- Connecting real customer, supplier, payment, WooCommerce or other live OligoPoly data/system.
- Expanding RBAC, bypassing MFA, disabling audit, weakening lot release, overriding Quality, or permitting unreleased allocation.
- Calling the result production-ready. The allowed target, after all evidence and approvals, is a controlled internal pilot only.

## Signature record

Architecture version/commit: ____________________  
Environment: ____________________  
Approved monthly ceiling: ____________________  
Approved pilot start/end: ____________________  
Exceptions attached: ____________________  
Shelby signature: ____________________  
Date/time/time zone: ____________________
