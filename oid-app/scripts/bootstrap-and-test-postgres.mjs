import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const required = [
  "OID_POSTGRES_ADMIN_URL",
  "OID_RUNTIME_DATABASE_URL",
  "OID_MIGRATION_DATABASE_URL",
  "OID_RUNTIME_PASSWORD",
  "OID_MIGRATION_PASSWORD",
];

for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}

const client = (url) => new PrismaClient({ datasources: { db: { url } } });

async function roleDdl(db, role, password) {
  const rows = await db.$queryRawUnsafe(
    "SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $1) AS present, " +
      "format('CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS', $1, $2) AS create_sql, " +
      "format('ALTER ROLE %I WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS', $1, $2) AS alter_sql",
    role,
    password,
  );
  await db.$executeRawUnsafe(rows[0].present ? rows[0].alter_sql : rows[0].create_sql);
}

async function main() {
  const admin = client(process.env.OID_POSTGRES_ADMIN_URL);
  try {
    await roleDdl(admin, "oid_runtime", process.env.OID_RUNTIME_PASSWORD);
    await roleDdl(admin, "oid_migration", process.env.OID_MIGRATION_PASSWORD);
    await admin.$executeRawUnsafe('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
    await admin.$executeRawUnsafe('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC');
    await admin.$executeRawUnsafe('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC');
    await admin.$executeRawUnsafe('GRANT CONNECT ON DATABASE oid TO oid_runtime, oid_migration');
    await admin.$executeRawUnsafe('GRANT USAGE ON SCHEMA public TO oid_runtime');
    await admin.$executeRawUnsafe('GRANT USAGE, CREATE ON SCHEMA public TO oid_migration');
    await admin.$executeRawUnsafe('ALTER DEFAULT PRIVILEGES FOR ROLE oid_migration IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO oid_runtime');
    await admin.$executeRawUnsafe('ALTER DEFAULT PRIVILEGES FOR ROLE oid_migration IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO oid_runtime');
  } finally {
    await admin.$disconnect();
  }

  const migration = spawnSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: process.env.OID_MIGRATION_DATABASE_URL },
      encoding: "utf8",
    },
  );
  if (migration.status !== 0) {
    throw new Error(`Prisma migration failed (exit ${migration.status}): ${migration.stderr || migration.stdout}`);
  }

  const migrationDb = client(process.env.OID_MIGRATION_DATABASE_URL);
  try {
    await migrationDb.$executeRawUnsafe('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO oid_runtime');
    await migrationDb.$executeRawUnsafe('GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO oid_runtime');
  } finally {
    await migrationDb.$disconnect();
  }

  const runtime = client(process.env.OID_RUNTIME_DATABASE_URL);
  try {
    const role = await runtime.$queryRawUnsafe(
      "SELECT current_user, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls FROM pg_roles WHERE rolname = current_user",
    );
    if (role.length !== 1 || role[0].current_user !== "oid_runtime") throw new Error("Runtime role identity check failed");
    if (role[0].rolsuper || role[0].rolcreatedb || role[0].rolcreaterole || role[0].rolreplication || role[0].rolbypassrls) {
      throw new Error("Runtime role has a prohibited PostgreSQL capability");
    }

    const tables = await runtime.$queryRawUnsafe(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations' ORDER BY tablename",
    );
    let businessRows = 0n;
    for (const { tablename } of tables) {
      const quoted = `"${tablename.replaceAll('"', '""')}"`;
      const count = await runtime.$queryRawUnsafe(`SELECT count(*)::bigint AS count FROM public.${quoted}`);
      businessRows += count[0].count;
    }
    if (businessRows !== 0n) throw new Error(`Real or unexpected business data detected (${businessRows} rows)`);

    let ddlDenied = false;
    try {
      await runtime.$executeRawUnsafe('CREATE TABLE public.oid_runtime_must_not_create (id integer)');
    } catch {
      ddlDenied = true;
    }
    if (!ddlDenied) {
      await runtime.$executeRawUnsafe('DROP TABLE IF EXISTS public.oid_runtime_must_not_create');
      throw new Error("Runtime role unexpectedly has CREATE privilege");
    }

    const migrations = await runtime.$queryRawUnsafe('SELECT count(*)::int AS count FROM public."_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL');
    console.log(JSON.stringify({
      status: "PASS",
      runtimeRole: "oid_runtime",
      migrationRole: "oid_migration",
      appliedMigrations: migrations[0].count,
      applicationTables: tables.length,
      businessRows: Number(businessRows),
      runtimeDdlDenied: true,
      realDataConnected: false,
    }));
  } finally {
    await runtime.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
