import { PrismaClient } from "@prisma/client";
import { ROLE_PERMISSIONS } from "../lib/permissions";

const db = new PrismaClient();

async function main() {
  for (const [roleName, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await db.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, description: `OID ${roleName} role` },
    });
    for (const key of permissions) {
      const permission = await db.permission.upsert({ where: { key }, update: {}, create: { key } });
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  const internalUserId = process.env.OID_INTERNAL_USER_ID ?? "00000000-0000-0000-0000-000000000001";
  const internalUserEmail = process.env.OID_INTERNAL_USER_EMAIL ?? "founder@oid.internal";
  const internalUser = await db.user.upsert({
    where: { id: internalUserId },
    update: { email: internalUserEmail, status: "ACTIVE" },
    create: { id: internalUserId, email: internalUserEmail, displayName: "OID Internal Owner", status: "ACTIVE" },
  });
  const founderRole = await db.role.findUniqueOrThrow({ where: { name: "FOUNDER" } });
  await db.userRole.upsert({
    where: { userId_roleId: { userId: internalUser.id, roleId: founderRole.id } },
    update: {},
    create: { userId: internalUser.id, roleId: founderRole.id, assignedBy: internalUser.id },
  });

  await db.product.upsert({
    where: { oidCode: "OID-PROD-000001" },
    update: {},
    create: { oidCode: "OID-PROD-000001", name: "OID Demonstration Research Material", status: "UNDER_REVIEW", evidenceState: "PROVISIONAL" },
  });
  await db.supplier.upsert({
    where: { oidCode: "OID-SUP-000001" },
    update: {},
    create: { oidCode: "OID-SUP-000001", legalName: "Demonstration Supplier — Not Approved", supplierType: "UNKNOWN", qualificationStatus: "UNSCREENED", riskLevel: "REVIEW_REQUIRED" },
  });
  console.log("OID seed complete. Demonstration records are not approvals.");
}

main().finally(() => db.$disconnect());
