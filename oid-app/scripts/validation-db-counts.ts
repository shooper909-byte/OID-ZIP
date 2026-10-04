import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const [lots, audits, migrations] = await Promise.all([
    db.lot.count(),
    db.auditLog.count(),
    db.$queryRaw<Array<{ count: number }>>`SELECT count(*)::int AS count FROM "_prisma_migrations"`,
  ]);
  console.log(`${lots}|${audits}|${migrations[0].count}`);
}

main().finally(() => db.$disconnect());
