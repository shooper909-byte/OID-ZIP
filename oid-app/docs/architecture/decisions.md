# OID Architecture Decisions

## ADR-001: PostgreSQL is the system of record
AI, search indexes, and dashboards are projections or retrieval layers. They cannot become authoritative records.

## ADR-002: Lot release is an explicit transaction
Release is not a generic status edit. It requires reviewed passing independent testing, traceability, and no active blocking release exception.

## ADR-003: Inventory balances are movement-derived
Operational balances are calculated from immutable movement records. Direct balance overwrites are prohibited.

## ADR-004: Allocation is database-guarded
Application checks are required, but PostgreSQL also rejects allocation unless the lot is RELEASED and the release gate is PASS.

## ADR-005: Evidence conflicts are preserved
Corrections and superseding records do not erase the historical source record.
