# OID v1 Governance Approval Checklist

Date: 2026-08-09  
Status: **UNAPPROVED — every reviewer decision remains open**

## Approval rules

- Reviewers approve a specific application version, infrastructure plan, region, environment, pilot roster and time window.
- Evidence must be linked or attached; verbal approval and an unchecked control are not sufficient.
- `PASS` requires objective evidence. Otherwise use `FAIL`, `BLOCKED_EXTERNAL`, `REQUIRES_OWNER_APPROVAL`, `REQUIRES_PROFESSIONAL_REVIEW`, or `NOT_TESTED`.
- Security, Quality, legal/privacy, governance, and Shelby each have stop authority for their domain. No one reviewer can waive another domain's veto.
- Exceptions must name the risk, affected control, compensating control, accountable owner, expiry, review date and explicit approvers. Lot release, released-only allocation, audit integrity and separation of duties are non-waivable.

## Quality review

Reviewer: ____________________  Role/qualification: ____________________

| Check | Required conclusion | Evidence |
|---|---|---|
| [ ] | Supplier approval, purchasing, receipt, quarantine, sampling, independent testing, human review, release and allocation workflow matches approved SOPs | Executed synthetic protocol and audit export |
| [ ] | Failed or incomplete independent test blocks release and allocation and creates the required exception | Negative workflow IDs, status trace and audit events |
| [ ] | Operations cannot override Quality; only authorized Quality users can release | RBAC test evidence and role mapping |
| [ ] | Evidence/document SHA-256, duplicate handling, versions, retrieval authorization and audit events meet record-integrity expectations | Document-control test report |
| [ ] | Retention, backup and restore preserve record relationships, release state and audit chronology | Restored database/object reconciliation |
| [ ] | Pilot synthetic-data limitation and deviation handling are documented | Pilot protocol/deviation form |

Decision: [ ] APPROVE  [ ] REJECT  [ ] APPROVE WITH ATTACHED TIME-BOUNDED CONDITIONS  
Signature/date: ____________________

## Independent security review

Reviewer: ____________________  Role/qualification/independence: ____________________

| Check | Required conclusion | Evidence |
|---|---|---|
| [ ] | Threat model covers edge, gateway, identity headers, session revocation, app RBAC, Ask OID, database, Blob, Key Vault, CI and administrators | Signed threat model/report |
| [ ] | Entra app and Conditional Access require MFA and group assignment; disablement/revocation and break-glass controls work | Policy/app exports and executed tests |
| [ ] | No direct route bypasses Front Door or the identity gateway; public DB/storage/Key Vault access fails | Network diagrams, provider exports and denial tests |
| [ ] | Gateway strips untrusted identity headers and only injects claims after token/MFA validation | Gateway configuration, penetration test and logs |
| [ ] | WAF, CSP, cookies, CSRF and distributed rate limiting resist tested abuse without weakening business controls | DAST/manual test report and rate-limit evidence |
| [ ] | Images and IaC have no unapproved Critical/High findings; provenance, SBOM and digest are retained | CI/Defender/Policy reports and exception register |
| [ ] | Secrets never appear in source, image layers, logs, deployment output or evidence archives; rotation works | Scan outputs and rotation drill |
| [ ] | Monitoring detects privileged actions, authentication abuse, access denials, secret access and backup failure | Alert drill and response acknowledgments |

Decision: [ ] APPROVE  [ ] REJECT  [ ] APPROVE WITH ATTACHED TIME-BOUNDED CONDITIONS  
Signature/date: ____________________

## Legal and privacy review

Reviewer: ____________________  Jurisdiction/qualification: ____________________

| Check | Required conclusion | Evidence |
|---|---|---|
| [ ] | Pilot data inventory/classification confirms synthetic data only and identifies any personal data in identity/audit logs | Data-flow map and inventory |
| [ ] | Approved Azure region, subprocessors and contractual terms are suitable | Written applicability/contract assessment |
| [ ] | Privacy notice, employee monitoring/acceptable-use notice and access logging are adequate where applicable | Approved notices/policies or non-applicability finding |
| [ ] | Retention/deletion, legal hold and incident notification duties are defined | Retention schedule and incident addendum |
| [ ] | No regulated customer/supplier/clinical/payment data is permitted without a separate review | Signed pilot boundary |

Decision: [ ] APPROVE  [ ] REJECT  [ ] NOT APPLICABLE WITH WRITTEN BASIS  
Signature/date: ____________________

## Access-control and governance review

Reviewer: ____________________  Authority: ____________________

| Check | Required conclusion | Evidence |
|---|---|---|
| [ ] | `RBAC_MATRIX.md` has named business owners for every role and no unresolved conflict | Signed RBAC matrix/version |
| [ ] | User-to-role mapping is least privilege; Commercial, Operations and Auditor restrictions are tested | Membership export and negative tests |
| [ ] | Joiner/mover/leaver, user disablement, session revocation and quarterly access review have owners and SLAs | Executed disable/revoke drill and review calendar |
| [ ] | Admin, deployment, database, backup and monitoring provider roles are separated and inventoried | Azure/Entra RBAC exports |
| [ ] | Two-person approval applies to DNS activation, pilot go-live, emergency role elevation and destructive restore | Change-control records |
| [ ] | AI remains advisory: cannot release, approve supplier, authorize purchase/payment or close critical exception | Negative tests and AI policy acknowledgement |
| [ ] | Ask OID data isolation and authorization have no cross-role leakage | Retrieval-denial tests and security review |

Decision: [ ] APPROVE  [ ] REJECT  [ ] APPROVE WITH ATTACHED TIME-BOUNDED CONDITIONS  
Signature/date: ____________________

## Operational readiness review

Reviewer: ____________________  Authority: ____________________

| Check | Required conclusion | Evidence |
|---|---|---|
| [ ] | `SECURITY_RUNBOOK.md`, `ACCESS_CONTROL_RUNBOOK.md`, `INCIDENT_RESPONSE.md`, and `BACKUP_RECOVERY_RUNBOOK.md` are executable with named contacts | Tabletop/drill records |
| [ ] | Staging and pilot are separate, reproducible from reviewed IaC and have tested revision rollback | Resource inventory, plan and rollback evidence |
| [ ] | Monitoring dashboards, alerts, on-call coverage, escalation and provider-status checks work | Alert drill and roster |
| [ ] | RPO/RTO are approved and met by database/object restore tests | Timed restore report |
| [ ] | Cost alerts, shutdown authority and pilot termination procedure are active | Budget alert and shutdown drill/plan |

Decision: [ ] APPROVE  [ ] REJECT  [ ] APPROVE WITH ATTACHED TIME-BOUNDED CONDITIONS  
Signature/date: ____________________

## Final governance record

| Domain | Reviewer | Decision | Date | Evidence location | Open conditions/expiry |
|---|---|---|---|---|---|
| Quality |  |  |  |  |  |
| Security |  |  |  |  |  |
| Legal/privacy |  |  |  |  |  |
| Access/governance |  |  |  |  |  |
| Operations/recovery |  |  |  |  |  |
| Shelby/owner |  |  |  |  |  |

Final result: [ ] GO  [ ] NO-GO  
Application version: ____________________  Infrastructure-plan digest: ____________________  
Pilot roster/version: ____________________  Activation window: ____________________

Until every mandatory domain approves and all conditions are closed, OID remains **A. NOT READY**.
