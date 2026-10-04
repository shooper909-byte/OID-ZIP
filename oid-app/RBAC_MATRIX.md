# OID v1 RBAC Matrix

Status: implementation reviewed 2026-08-09; owner and quality-owner approval remains required.

Legend: `R` read, `W` create/update, `A` approve/qualify/release/close, `-` no permission. The implementation source of truth is `lib/permissions/index.ts`; every Founder and System Administrator permission is enumerated there rather than inferred.

| Role | Product | Supplier | PO | Payment | Receipt | Lot | Test | Document | Inventory | Exception/CAPA | Decision | Org/market/research | Ask OID | Migration | User/role admin | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Founder | RWA | RWA | RW | A | RW | RWA | RWA | RWA | RWA | RWA | RWA | RWA | Yes | RWA | Yes | R |
| System Admin | R | R | R | - | R | R | R | R | R | R | R | R | No | R | Yes | R |
| Quality Admin | RW | RA | - | - | RW | RWA | RWA | RWA | RW | RWA | R | - | No | - | - | R |
| Operations | R | R | - | - | RW | RW | - | R | RWA | RW | - | - | No | - | - | - |
| Procurement | R | RW | RW | - | - | - | - | R | - | R | - | - | No | - | - | - |
| Commercial | R | - | - | - | - | - | - | - | R | - | - | Org RWA | No | - | - | - |
| Research ORII | R | - | - | - | - | - | R | R | - | - | R | Market/Research RW | Yes | - | - | - |
| Auditor | R | R | R | - | R | R | R | R | R | R | R | R | No | - | - | R |
| AI Assistant | R | - | - | - | - | R | R | R | - | R | - | - | Yes | - | - | - |

## Privileged-control separation

- Lot release is available only to Founder and Quality Admin and additionally requires a human actor, an independent PASS, human review, no release/all blocker, and the database trigger.
- AI Assistant is explicitly nonhuman and has no qualify, purchase, release, allocate, exception-close, CAPA-close, decision-approve, migration, or administration permission.
- Payment authorization is distinct and Founder-only. Procurement may prepare purchase orders but cannot authorize payment; AI has neither permission.
- System Admin can administer accounts and roles but cannot release lots, review tests, allocate inventory, qualify suppliers, authorize purchasing, close exceptions, or alter quality records.
- Operations can record operational facts and allocate only already-released inventory. It cannot review tests, release lots, close exceptions/CAPAs, qualify suppliers, or authorize purchase orders.
- Commercial cannot read supplier, purchase, lot, test, document, exception, audit, or security/administration records.
- Auditor is read-only. All assigned permissions are reads plus audit read.
- Server routes resolve the current database user and permissions for every protected request. UI state is never the authorization boundary.

## Assignment and review controls

Role assignment requires `admin.roles`; changes must be audited as `PERMISSION_CHANGE`. No person should hold System Admin and Quality Admin concurrently during the pilot. Founder access is reserved and should not be used for routine quality work. Quarterly access review, immediate disablement on departure, and documented quality-owner approval are mandatory external controls.

## Verification

Automated negative tests cover AI, Auditor, System Admin, Operations, and Commercial separation plus live server-route denials for Auditor and AI release attempts. The RBAC design is locally verified but is not governance-approved until Shelby and the designated quality owner sign it.
