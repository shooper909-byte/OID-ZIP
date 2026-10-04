# Controlled Internal Pilot Plan

Status: proposed; requires Shelby, quality-owner, security, governance, and infrastructure go/no-go approval.

## Scope

Duration: 14 consecutive days after acceptance, extendable only by signed review. Users: Shelby/Founder for oversight, one named Quality Admin, one Operations user, and one read-only Auditor. Add Procurement only if a purchase-order exercise is approved. No Commercial, external supplier/lab/customer, AI Assistant, or broad System Admin access during normal pilot operation.

Use synthetic/non-sensitive records only. No real customer, supplier, WooCommerce, laboratory, payment, or production-commerce integration.

## Allowed workflows

- Authenticated login/MFA and access revocation drill.
- Synthetic supplier/product/PO/receipt/quarantine/sample/independent test/human review/release/released-only allocation.
- Synthetic failed/inconclusive test to HOLD/BLOCKED, exception, CAPA/investigation, and rejected disposition.
- Private synthetic document upload, version, authorized download/hash verification, and audit review.
- Read-only Ask OID against synthetic data within each user's scope.
- Backup/restore and revision rollback drills in staging or an isolated recovery environment.

## Prohibited

Public/anonymous access; real data; real purchasing/payment/shipping; customer fulfillment; WooCommerce connection; supplier/lab communication; released-lot representation outside the synthetic pilot; production email; AI write/approval; database console work except approved migration/recovery drill; disabling triggers/audit/RBAC/MFA; policy exceptions; or unreviewed deployment.

## Entry criteria

All local build/control/security tests pass; paid infrastructure and DNS approved; staging acceptance complete; private networking/storage proven; SSO/MFA, direct-access denial, revocation, secret rotation, scans/SBOM, backup alerting and restore proven; RBAC/workflow/retention/AI rules approved; counsel/security review complete as applicable; named users trained; rollback owner on call.

## Monitoring

Review dashboards at pilot start/end daily and before/after every release/allocation. Alert immediately on failed login/authorization spike, role changes, Founder use, release/allocation, critical exception, audit-integrity failure, object/hash failure, database/app health, backup failure, or deployment/config change. Hold a daily 15-minute review with recorded issues and decisions.

## Rollback/stop criteria

Stop immediately for unauthorized access, control bypass, audit mutation, incorrect release/allocation, hash/object loss, inability to revoke, backup/restore failure, secret exposure, critical untriaged exception, real data entry, or monitoring blindness. Disable user ingress, retain evidence, preserve database/storage read-only, roll back the app revision only if data-compatible, invoke incident response, and do not resume without root-cause correction and new go/no-go.

## Success criteria

All named users remain within role; 100% of intended denials occur server/database-side; two passing and two failed synthetic workflows complete; every sensitive download/release/allocation/critical exception has an audit event; zero negative inventory; revocation meets approved target; no high/critical unresolved dependency/image findings; restore meets RPO/RTO; alerts are received; no SEV-1/2; owner/quality/security sign-off closes the pilot.
