import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "../../lib/database";
import { MAX_CSV_BYTES } from "../../lib/migration/supplier-csv";
import { ProductImportInput, sourceKey, validateProductCsv } from "../../lib/migration/product-csv";
import { productDuplicateKey } from "../../lib/products/input";
import { nextOidCode } from "../../lib/oid-identifiers/counter";
import { requirePermission, PERMISSIONS } from "../../lib/permissions";

export async function stageProductImport(args: { name: string; sourceName: string; bytes: Buffer; sourceSystem: string; neutralSkus: boolean; userId: string; permissions: Iterable<string> }) {
  requirePermission(args.permissions, PERMISSIONS.MIGRATION_RUN);
  requirePermission(args.permissions, PERMISSIONS.PRODUCT_WRITE);
  if (!args.sourceName.toLowerCase().endsWith(".csv")) throw new Error("CSV_FILE_TYPE_REQUIRED");
  if (!args.bytes.length || args.bytes.length > MAX_CSV_BYTES) throw new Error("CSV_EMPTY_OR_SIZE_LIMIT_EXCEEDED");
  const hash = createHash("sha256").update(JSON.stringify(["product-v1", args.sourceSystem, args.neutralSkus])).update(args.bytes).digest("hex");
  const prior = await db.importBatch.findUnique({ where: { sourceSha256: hash }, include: { rows: { orderBy: { rowNumber: "asc" } } } });
  if (prior) return { batch: prior, idempotent: true };
  const [skus, products, maps] = await Promise.all([
    db.sku.findMany({ select: { internalSku: true } }), db.product.findMany({ select: { name: true } }),
    db.legacyImportMap.findMany({ where: { entityType: "PRODUCT" }, select: { legacySource: true, legacyIdentifier: true } }),
  ]);
  const preview = validateProductCsv(args.bytes.toString("utf8"), {
    ...args, existingSkus: skus.map(s => s.internalSku), existingNames: products.map(p => p.name),
    existingSources: maps.map(m => sourceKey(m.legacySource, m.legacyIdentifier ?? "")),
  });
  try {
    const batch = await db.$transaction(async tx => {
      const created = await tx.importBatch.create({ data: {
        name: args.name.trim().slice(0, 240) || args.sourceName, sourceName: args.sourceName.slice(0, 240), sourceSha256: hash,
        status: "PRODUCT_PREVIEW_READY", rowCount: preview.rows.length,
        validCount: preview.rows.filter(r => r.status === "VALID").length,
        warningCount: preview.rows.filter(r => r.status === "WARNING").length,
        errorCount: preview.rows.filter(r => r.status === "ERROR").length, createdBy: args.userId,
        rows: { create: preview.rows.map(r => ({ rowNumber: r.rowNumber, rawData: r.raw, normalizedData: r.normalized ? JSON.parse(JSON.stringify(r.normalized)) : Prisma.JsonNull, validationStatus: r.status, messages: r.messages, proposedAction: r.action })) },
      }, include: { rows: { orderBy: { rowNumber: "asc" } } } });
      await tx.auditLog.create({ data: { oidCode: await nextOidCode(tx, "AUD"), eventType: "CREATE", userId: args.userId, entityType: "IMPORT_BATCH", entityId: created.id,
        newValues: { sourceSha256: hash, rowCount: created.rowCount, format: preview.format, status: created.status }, reason: "Product CSV staged for preview; no products, stock or approvals created" } });
      return created;
    });
    return { batch, idempotent: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const concurrent = await db.importBatch.findUnique({ where: { sourceSha256: hash }, include: { rows: { orderBy: { rowNumber: "asc" } } } });
      if (concurrent) return { batch: concurrent, idempotent: true };
    }
    throw error;
  }
}

export async function commitProductImport(args: { batchId: string; userId: string; permissions: Iterable<string>; confirmation: string; reason: string }) {
  requirePermission(args.permissions, PERMISSIONS.MIGRATION_RESOLVE);
  requirePermission(args.permissions, PERMISSIONS.PRODUCT_WRITE);
  if (args.confirmation !== "COMMIT PRODUCT IMPORT") throw new Error("IMPORT_EXPLICIT_CONFIRMATION_REQUIRED");
  if (args.reason.trim().length < 12 || args.reason.length > 1000) throw new Error("IMPORT_REASON_REQUIRED");
  return db.$transaction(async tx => {
    const batch = await tx.importBatch.findUniqueOrThrow({ where: { id: args.batchId }, include: { rows: { orderBy: { rowNumber: "asc" } } } });
    if (batch.status === "PRODUCT_COMMITTED") return { batchId: batch.id, createdCount: batch.rows.filter(r => r.committedEntityId).length, idempotent: true };
    if (batch.status !== "PRODUCT_PREVIEW_READY") throw new Error("IMPORT_WRONG_TYPE_OR_STATUS");
    if (batch.errorCount || batch.rows.some(r => r.validationStatus === "ERROR")) throw new Error("IMPORT_VALIDATION_ERRORS_PRESENT");
    if (batch.rows.some(r => !["CREATE_PRODUCT", "SKIP_PRODUCT"].includes(r.proposedAction))) throw new Error("IMPORT_WRONG_ROW_TYPE");
    const pending = batch.rows.filter(r => r.proposedAction === "CREATE_PRODUCT").map(row => ({ row, data: ProductImportInput.parse(row.normalizedData) }));
    if (!pending.length) throw new Error("IMPORT_HAS_NO_NEW_PRODUCTS");
    const [products, skus, maps] = await Promise.all([
      tx.product.findMany({ select: { name: true } }), tx.sku.findMany({ select: { internalSku: true } }),
      tx.legacyImportMap.findMany({ where: { entityType: "PRODUCT" }, select: { legacySource: true, legacyIdentifier: true } }),
    ]);
    const names = new Set(products.map(p => productDuplicateKey(p.name)));
    const skuKeys = new Set(skus.map(s => s.internalSku));
    const sourceKeys = new Set(maps.map(m => sourceKey(m.legacySource, m.legacyIdentifier ?? "")));
    for (const { data } of pending) {
      const key = sourceKey(data.sourceSystem, data.sourceId);
      if (sourceKeys.has(key) || skuKeys.has(data.sku.internalSku) || (data.originalSku && skuKeys.has(data.originalSku)) || names.has(productDuplicateKey(data.product.name))) throw new Error("IMPORT_DUPLICATE_AT_COMMIT:reconcile_existing_records");
      sourceKeys.add(key); skuKeys.add(data.sku.internalSku);
    }
    for (const { row, data } of pending) {
      const product = await tx.product.create({ data: { ...data.product, status: "UNDER_REVIEW", evidenceState: "UNKNOWN", ownerUserId: args.userId, oidCode: await nextOidCode(tx, "PROD"),
        descriptionInternal: JSON.stringify({ sourceSystem: data.sourceSystem, websiteId: data.sourceId, originalSku: data.originalSku, catalogType: data.catalogType, notes: data.notes, importBatchId: batch.id }) } });
      const sku = await tx.sku.create({ data: { ...data.sku, packageQuantity: data.packageKnown ? data.sku.packageQuantity : null, productId: product.id, oidCode: await nextOidCode(tx, "SKU"), status: "UNDER_REVIEW" } });
      await tx.importRow.update({ where: { id: row.id }, data: { committedEntityId: product.id } });
      await tx.legacyImportMap.create({ data: { importBatchId: batch.id, entityType: "PRODUCT", legacySource: data.sourceSystem, legacySheet: "products", legacyRow: String(row.rowNumber), legacyIdentifier: data.sourceId, oidEntityId: product.id, oidCode: product.oidCode, importReviewStatus: "IMPORTED_REVIEW_REQUIRED" } });
      await tx.auditLog.create({ data: { oidCode: await nextOidCode(tx, "AUD"), eventType: "CREATE", userId: args.userId, entityType: "PRODUCT", entityId: product.id, reason: args.reason.trim(), newValues: { importBatchId: batch.id, websiteId: data.sourceId, originalSku: data.originalSku, internalSku: sku.internalSku, status: product.status, evidenceState: product.evidenceState } } });
    }
    await tx.importBatch.update({ where: { id: batch.id }, data: { status: "PRODUCT_COMMITTED", startedAt: new Date(), completedAt: new Date() } });
    await tx.auditLog.create({ data: { oidCode: await nextOidCode(tx, "AUD"), eventType: "APPROVE", userId: args.userId, entityType: "IMPORT_BATCH", entityId: batch.id, reason: args.reason.trim(), newValues: { status: "PRODUCT_COMMITTED", createdCount: pending.length } } });
    return { batchId: batch.id, createdCount: pending.length, idempotent: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 60_000 });
}
