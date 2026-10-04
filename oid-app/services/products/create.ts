import { Prisma } from "@prisma/client";
import { db } from "../../lib/database";
import { nextOidCode } from "../../lib/oid-identifiers/counter";
import { PERMISSIONS, requirePermission } from "../../lib/permissions";
import { ProductCreateInputSchema, productDuplicateKey, type ProductCreateInput } from "../../lib/products/input";

export async function createProduct(args: { input: ProductCreateInput; userId: string; permissions: Iterable<string>; reason?: string }) {
  requirePermission(args.permissions, PERMISSIONS.PRODUCT_WRITE);
  const input = ProductCreateInputSchema.parse(args.input);
  return db.$transaction(async (tx) => {
    const products = await tx.product.findMany({ select: { id: true, oidCode: true, name: true } });
    const duplicateProduct = products.find((candidate) => productDuplicateKey(candidate.name) === productDuplicateKey(input.product.name));
    if (duplicateProduct) throw new Error(`PRODUCT_DUPLICATE:${duplicateProduct.oidCode}`);
    const duplicateSku = await tx.sku.findUnique({ where: { internalSku: input.sku.internalSku }, select: { oidCode: true } });
    if (duplicateSku) throw new Error(`SKU_DUPLICATE:${duplicateSku.oidCode}`);

    const product = await tx.product.create({ data: {
      ...input.product,
      oidCode: await nextOidCode(tx, "PROD"),
      evidenceState: "UNKNOWN",
      ownerUserId: args.userId,
    } });
    const sku = await tx.sku.create({ data: {
      ...input.sku,
      oidCode: await nextOidCode(tx, "SKU"),
      productId: product.id,
      status: "ACTIVE",
    } });
    await tx.auditLog.create({ data: {
      oidCode: await nextOidCode(tx, "AUD"), eventType: "CREATE", userId: args.userId,
      entityType: "PRODUCT", entityId: product.id,
      newValues: {
        oidCode: product.oidCode,
        name: product.name,
        status: product.status,
        evidenceState: product.evidenceState,
        sku: { oidCode: sku.oidCode, internalSku: sku.internalSku, displayName: sku.displayName },
      },
      reason: args.reason ?? "Product master and initial SKU created; no inventory or approval granted",
    } });
    return { product, sku };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

