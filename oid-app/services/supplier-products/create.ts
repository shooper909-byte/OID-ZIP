import { Prisma } from "@prisma/client";
import { db } from "../../lib/database";
import { nextOidCode } from "../../lib/oid-identifiers/counter";
import { PERMISSIONS, requirePermission } from "../../lib/permissions";
import { SupplierProductInputSchema, type SupplierProductInput } from "../../lib/supplier-products/input";

export async function createSupplierProduct(args: { input: SupplierProductInput; userId: string; permissions: Iterable<string>; reason?: string }) {
  requirePermission(args.permissions, PERMISSIONS.PRODUCT_WRITE);
  requirePermission(args.permissions, PERMISSIONS.SUPPLIER_WRITE);
  const input = SupplierProductInputSchema.parse(args.input);
  return db.$transaction(async (tx) => {
    const [supplier, product, sku] = await Promise.all([
      tx.supplier.findUnique({ where: { id: input.supplierId }, select: { id: true, oidCode: true } }),
      tx.product.findUnique({ where: { id: input.productId }, select: { id: true, oidCode: true } }),
      input.skuId ? tx.sku.findUnique({ where: { id: input.skuId }, select: { id: true, productId: true, oidCode: true } }) : Promise.resolve(null),
    ]);
    if (!supplier) throw new Error("SUPPLIER_NOT_FOUND");
    if (!product) throw new Error("PRODUCT_NOT_FOUND");
    if (input.skuId && (!sku || sku.productId !== product.id)) throw new Error("SKU_PRODUCT_MISMATCH");
    const duplicate = await tx.supplierProduct.findFirst({ where: { supplierId: supplier.id, productId: product.id, skuId: input.skuId ?? null } });
    if (duplicate) throw new Error("SUPPLIER_PRODUCT_DUPLICATE");

    const mapping = await tx.supplierProduct.create({ data: {
      ...input,
      skuId: input.skuId ?? null,
      documentationStatus: "NOT_REVIEWED",
      qualificationStatus: "UNSCREENED",
      status: "ACTIVE",
    } });
    await tx.auditLog.create({ data: {
      oidCode: await nextOidCode(tx, "AUD"), eventType: "CREATE", userId: args.userId,
      entityType: "SUPPLIER_PRODUCT", entityId: mapping.id,
      newValues: {
        supplierOidCode: supplier.oidCode,
        productOidCode: product.oidCode,
        skuOidCode: sku?.oidCode ?? null,
        qualificationStatus: mapping.qualificationStatus,
        documentationStatus: mapping.documentationStatus,
        minimumOrderQuantity: input.minimumOrderQuantity ?? null,
        leadTimeDays: input.leadTimeDays ?? null,
        lastPrice: input.lastPrice ?? null,
        currency: input.currency,
      },
      reason: args.reason ?? "Supplier offering linked to product; qualification remains unscreened",
    } });
    return mapping;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

