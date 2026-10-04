# OID M1 Validation Record

Date: 2026-08-07

## Passed locally in this build environment

- TypeScript compilation of pure domain/control modules
- lot release blocker logic
- exact traceability completeness logic
- released-only allocation guard logic
- movement-derived inventory logic
- lot evidence timeline ordering
- repository file integrity review

## Environment-limited checks

`npm install` cannot complete in the current build environment because its internal npm mirror returns HTTP 404 for `@prisma/client`. As a result, Prisma Client generation, `prisma validate`, Next.js build, and the Vitest suite could not be executed here.

This is an environment dependency limitation, not a successful production validation. Run the setup steps in README.md in a normal development environment before deployment.

## Production gate

Do not deploy OID M1 until:

1. dependencies install successfully,
2. Prisma schema validates,
3. PostgreSQL migrations are exercised on a disposable database,
4. the full automated test suite passes,
5. release and allocation guards are integration-tested against PostgreSQL,
6. authentication and request-actor enforcement are added.
