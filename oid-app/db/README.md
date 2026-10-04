# Database source of truth

`prisma/schema.prisma` is the application data model and `prisma/migrations/202608070001_oid_v1_init/migration.sql` is the canonical PostgreSQL initialization migration for this v1 source package.

The earlier M0/M1 hand-authored SQL files are retained under `docs/legacy-reference/` for historical comparison only. Do not apply them to a new OID database.
