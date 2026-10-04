# OID M1 Traceability

M1 implements the controlled chain:

Purchase Order -> Receipt -> Receipt Item -> Lot -> Sample -> Test Order -> Test Result -> Human Review -> Release.

## Non-negotiable controls

1. A lot is quarantined on receipt.
2. A supplier lot must be captured and linked to the exact PO and receipt item.
3. Supplier documentation may be linked as evidence, but it is not an independent analytical result.
4. A release candidate requires at least one independent PASS result with human review/approval.
5. Open RELEASE or ALL exceptions block release.
6. Failed, inconclusive, or retest-required results place the lot on HOLD and create an exception.
7. Allocation remains database-guarded and is allowed only from RELEASED lots whose release gate is PASS.
8. The evidence graph and timeline preserve contradictory and superseded records rather than overwriting them.

## Transaction boundaries

Receipt creation creates receipt items, quarantined lots, and receipt inventory movements in one transaction.
Test-result review updates the result and, when necessary, the lot hold and exception in one transaction.
Lot release changes status and writes audit evidence in one transaction.

## M1 boundary

M1 does not yet implement external customer portals, supplier portals, advanced scientific search, or autonomous AI actions.
