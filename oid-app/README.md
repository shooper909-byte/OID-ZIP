# OligoPoly Intelligence Database (OID) v1.0

OID is OligoPoly Laboratories' internal evidence, traceability, control, and decision-intelligence application.

## What is included

The v1 source package contains the complete MVP architecture through the planned M0-M4 milestones:

- **M0 Foundation:** PostgreSQL/Prisma data model, OID identifiers, RBAC permission model, audit records.
- **M1 Traceability:** purchase orders, receipts, lots, samples, laboratories, test orders/results, documents, evidence links, timelines, release controls.
- **M2 Control:** exception queue, Actions, CAPA, Decisions, notifications, organization/account records, inventory allocation controls, Command Center.
- **M3 Intelligence:** global search, evidence-structured Ask OID responses, confidence/unknown/conflict separation, intelligence-query history.
- **M4 Migration:** import batches, legacy mapping, review states, duplicate/conflict gates, and controlled migration staging.

## Non-negotiable controls implemented

1. Supplier documentation is not treated as independent testing.
2. Lots require exact PO/receipt/receipt-item traceability before release.
3. Release requires a reviewed passing independent result and no open release-blocking exception.
4. Inventory allocation is allowed only from `RELEASED` lots with a `PASS` release gate.
5. Inventory availability is derived from movement records.
6. Audit records are immutable at the database layer.
7. Critical closures require evidence and authorization.
8. Decisions require evidence and an authorized human decision maker.
9. Legacy imports never become automatically verified/approved.
10. Ask OID separates evidence, contradictions, unknowns, actions, and confidence.

## Local development

Requirements: Node 22+, PostgreSQL 17+, npm access.

```bash
cp .env.example .env
npm ci
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

In development, the application uses a founder-equivalent development actor for convenience. **Do not use development mode as a production authentication model.**

## Internal production MVP

The included production gate requires `OID_INTERNAL_ACCESS_TOKEN`. All pages and API routes are blocked by the Next.js access proxy unless the browser has the HttpOnly access cookie or an API request supplies the bearer token. This is suitable as a temporary single-owner internal MVP gate, not as the final multi-user identity architecture.

For a longer-lived or multi-user deployment, replace the internal token gate with the company's managed IdP/SSO and map identity groups into the included RBAC roles.

## Docker

Review and change every placeholder secret first, then:

```bash
docker compose up --build
```

## Database

`prisma/schema.prisma` is the model source of truth. The canonical initialization migration is:

`prisma/migrations/202608070001_oid_v1_init/migration.sql`

The migration chain also installs database-level allocation, lot-release, and audit-immutability guards. Later migrations add explicit independent-test provenance, the database release-transition guard, concurrent active-document duplicate prevention, and individually revocable hashed authentication sessions; apply the complete ordered migration directory, not only the initialization file.

Historical M0/M1 hand-authored migration drafts are kept only in `docs/legacy-reference/` and must not be applied to a new database.

## Validation

The repository was initially validated on 2026-08-08 and hardened/revalidated on 2026-08-09 with PostgreSQL 17.10, Prisma 6.19.3, Next.js 16.3.0, TypeScript 5.9.3, and Node 26.4.0. Prisma validation/generation, all five migrations, seed, type checking, 21 unit/integration/security tests, dependency audit, backup/restore, production-mode access/session-revocation checks, and the production build passed. See the dated validation records for evidence and unresolved production gates.

```bash
npm run db:validate
npm run prisma:generate
npm run db:deploy
npm run db:seed
npm run typecheck
npm run validate:core
npm test
npm run build
```

Before production deployment, complete every item in `PRODUCTION_GATE.md`.

## Safety and scope

OID is an internal operating and decision-support system. It does not replace qualified legal, regulatory, quality, laboratory, cybersecurity, or scientific review. AI output is not the system of record and does not autonomously release lots, qualify suppliers, authorize purchases, approve accounts, or make founder-reserved decisions.
