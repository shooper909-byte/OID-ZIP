import { Prisma } from "@prisma/client";
import { db } from "../../lib/database";
import { nextOidCode } from "../../lib/oid-identifiers/counter";
import { PERMISSIONS, requirePermission } from "../../lib/permissions";
import { SupplierInputSchema, supplierAuditValues, supplierDuplicateKey, type SupplierInput } from "../../lib/suppliers/input";

export async function createSupplier(args: { input: SupplierInput; userId: string; permissions: Iterable<string>; reason?: string }) {
  requirePermission(args.permissions, PERMISSIONS.SUPPLIER_WRITE);
  const input = SupplierInputSchema.parse(args.input);
  return db.$transaction(async (tx) => {
    const candidates = await tx.supplier.findMany({ select: { id: true, oidCode: true, legalName: true, website: true } });
    const duplicate = candidates.find((candidate) => supplierDuplicateKey(candidate.legalName) === supplierDuplicateKey(input.legalName) || Boolean(input.website && candidate.website?.toLocaleLowerCase("en-US") === input.website.toLocaleLowerCase("en-US")));
    if (duplicate) throw new Error(`SUPPLIER_DUPLICATE:${duplicate.oidCode}`);
    const supplier = await tx.supplier.create({ data: {
      ...input,
      oidCode: await nextOidCode(tx, "SUP"),
      qualificationStatus: "UNSCREENED",
      riskLevel: null,
      ownerUserId: args.userId,
    } });
    await tx.auditLog.create({ data: {
      oidCode: await nextOidCode(tx, "AUD"), eventType: "CREATE", userId: args.userId,
      entityType: "SUPPLIER", entityId: supplier.id,
      newValues: supplierAuditValues(input),
      reason: args.reason ?? "Manual supplier creation; qualification remains unscreened",
    } });
    return supplier;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
