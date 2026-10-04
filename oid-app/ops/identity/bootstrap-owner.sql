-- OID owner bootstrap (manual fallback). Idempotent. Run as the migration/admin role against the staging DB:
--   psql "$OID_MIGRATION_DATABASE_URL" -v owner_oid=bab63204-7cb9-465d-a074-56124afeaa98 \
--        -v owner_email=labs@oligopolypeptides.com -f ops/identity/bootstrap-owner.sql
-- Not needed once the object-ID auth release is deployed with OID_OWNER_BOOTSTRAP_OBJECT_IDS set:
-- the app then creates this record itself on Shelby's first verified Entra sign-in.
-- Contains identifiers only; no secrets.
\set ON_ERROR_STOP on
BEGIN;

INSERT INTO "Role" (id, name, description)
VALUES (gen_random_uuid(), 'FOUNDER', 'OID FOUNDER role')
ON CONFLICT (name) DO NOTHING;

-- Link an existing record with the same email (never one already linked to another object ID), else create.
UPDATE "User"
   SET "authProviderId" = :'owner_oid', status = 'ACTIVE', "mfaEnabled" = true, "updatedAt" = now()
 WHERE email = lower(:'owner_email') AND ("authProviderId" IS NULL OR "authProviderId" = :'owner_oid')
   AND status IN ('ACTIVE', 'INVITED');

INSERT INTO "User" (id, email, "displayName", "authProviderId", status, "mfaEnabled", "createdAt", "updatedAt")
SELECT gen_random_uuid(), lower(:'owner_email'), 'OID Owner', :'owner_oid', 'ACTIVE', true, now(), now()
 WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE "authProviderId" = :'owner_oid')
   AND NOT EXISTS (SELECT 1 FROM "User" WHERE email = lower(:'owner_email'));

INSERT INTO "UserRole" ("userId", "roleId", "assignedAt", "assignedBy")
SELECT u.id, r.id, now(), u.id FROM "User" u, "Role" r
 WHERE u."authProviderId" = :'owner_oid' AND r.name = 'FOUNDER'
ON CONFLICT DO NOTHING;

-- Audit evidence (AuditLog is append-only; oidCode uses the AUD counter).
WITH counter AS (
  INSERT INTO "OidCounter" (id, entity, year, "currentValue", "updatedAt") VALUES (gen_random_uuid(), 'AUD', extract(year from now() at time zone 'utc')::int, 1, now())
  ON CONFLICT (entity, year) DO UPDATE SET "currentValue" = "OidCounter"."currentValue" + 1, "updatedAt" = now()
  RETURNING year, "currentValue"
)
INSERT INTO "AuditLog" (id, "oidCode", "eventType", "userId", "entityType", "entityId", "newValues", reason, "createdAt")
SELECT gen_random_uuid(), format('OID-AUD-%s-%s', c.year, lpad(c."currentValue"::text, 8, '0')), 'PERMISSION_CHANGE', u.id, 'USER', u.id::text,
       jsonb_build_object('authProviderId', :'owner_oid', 'role', 'FOUNDER', 'status', 'ACTIVE'),
       'Manual owner bootstrap (ops/identity/bootstrap-owner.sql)', now()
  FROM counter c, "User" u WHERE u."authProviderId" = :'owner_oid';

SELECT u.email, u.status, u."authProviderId", array_agg(r.name) AS roles
  FROM "User" u JOIN "UserRole" ur ON ur."userId" = u.id JOIN "Role" r ON r.id = ur."roleId"
 WHERE u."authProviderId" = :'owner_oid' GROUP BY 1, 2, 3;
COMMIT;
