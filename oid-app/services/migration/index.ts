import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "../../lib/database";
import { MAX_CSV_BYTES, validateSupplierCsv } from "../../lib/migration/supplier-csv";
import { nextOidCode } from "../../lib/oid-identifiers/counter";
import { requirePermission, PERMISSIONS } from "../../lib/permissions";
import { SupplierInputSchema, supplierAuditValues, supplierDuplicateKey } from "../../lib/suppliers/input";

export async function stageSupplierImport(args: { name: string; sourceName: string; bytes: Buffer; userId: string; permissions: Iterable<string> }) {
  requirePermission(args.permissions, PERMISSIONS.MIGRATION_RUN);
  if (!args.sourceName.toLowerCase().endsWith(".csv")) throw new Error("CSV_FILE_TYPE_REQUIRED");
  if (!args.bytes.length) throw new Error("CSV_EMPTY");
  if (args.bytes.length > MAX_CSV_BYTES) throw new Error(`CSV_SIZE_LIMIT_EXCEEDED:${MAX_CSV_BYTES}`);
  const hash = createHash("sha256").update(args.bytes).digest("hex");
  const prior = await db.importBatch.findUnique({ where: { sourceSha256: hash }, include: { rows: { orderBy: { rowNumber: "asc" } } } });
  if (prior) return { batch: prior, idempotent: true };

  const existingSuppliers = await db.supplier.findMany({ select: { legalName: true } });
  const preview = validateSupplierCsv(args.bytes.toString("utf8"), existingSuppliers.map((supplier) => supplier.legalName));
  const validCount = preview.rows.filter((row) => row.status === "VALID").length;
  const warningCount = preview.rows.filter((row) => row.status === "WARNING").length;
  const errorCount = preview.rows.filter((row) => row.status === "ERROR").length;
  try {
    const batch = await db.$transaction(async (tx) => {
    const created = await tx.importBatch.create({ data: {
      name: args.name.trim().slice(0, 240) || args.sourceName,
      sourceName: args.sourceName.slice(0, 240), sourceSha256: hash,
      status: "PREVIEW_READY", rowCount: preview.rows.length, validCount, warningCount, errorCount,
      createdBy: args.userId,
      rows: { create: preview.rows.map((row) => ({
        rowNumber: row.rowNumber, rawData: row.raw, normalizedData: row.normalized ?? Prisma.JsonNull,
        validationStatus: row.status, messages: row.messages, proposedAction: "CREATE",
      })) },
    }, include: { rows: { orderBy: { rowNumber: "asc" } } } });
    await tx.auditLog.create({ data: {
      oidCode: await nextOidCode(tx, "AUD"), eventType: "CREATE", userId: args.userId,
      entityType: "IMPORT_BATCH", entityId: created.id,
      newValues: { sourceName: created.sourceName, sourceSha256: hash, status: created.status, rowCount: created.rowCount, validCount, warningCount, errorCount },
      reason: "Supplier CSV staged for validation preview only; no supplier records created",
    } });
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

export async function commitSupplierImport(args: { batchId: string; userId: string; permissions: Iterable<string>; confirmation: string; reason: string }) {
  requirePermission(args.permissions, PERMISSIONS.MIGRATION_RESOLVE);
  if (args.confirmation !== "COMMIT SUPPLIER IMPORT") throw new Error("IMPORT_EXPLICIT_CONFIRMATION_REQUIRED");
  if (args.reason.trim().length < 12) throw new Error("IMPORT_REASON_REQUIRED");
  return db.$transaction(async (tx) => {
    const batch = await tx.importBatch.findUniqueOrThrow({ where: { id: args.batchId }, include: { rows: { orderBy: { rowNumber: "asc" } } } });
    if (batch.status === "COMMITTED") return { batchId: batch.id, status: batch.status, createdCount: batch.rows.filter((row) => row.committedEntityId).length, idempotent: true };
    if (batch.status !== "PREVIEW_READY") throw new Error(`IMPORT_INVALID_STATUS:${batch.status}`);
    if (!batch.rows.length) throw new Error("IMPORT_HAS_NO_ROWS");
    if (batch.errorCount > 0 || batch.rows.some((row) => row.validationStatus === "ERROR")) throw new Error("IMPORT_VALIDATION_ERRORS_PRESENT");

    const normalized = batch.rows.map((row) => ({ row, input: SupplierInputSchema.parse(row.normalizedData) }));
    const existingSuppliers = await tx.supplier.findMany({ select: { oidCode: true, legalName: true, website: true } });
    const keys = new Set<string>();
    for (const item of normalized) {
      const key = supplierDuplicateKey(item.input.legalName);
      if (keys.has(key)) throw new Error(`IMPORT_DUPLICATE_AT_COMMIT:${item.input.legalName}`);
      keys.add(key);
      const duplicate = existingSuppliers.find((candidate) => supplierDuplicateKey(candidate.legalName) === key || Boolean(item.input.website && candidate.website?.toLocaleLowerCase("en-US") === item.input.website.toLocaleLowerCase("en-US")));
      if (duplicate) throw new Error(`IMPORT_DUPLICATE_AT_COMMIT:${duplicate.oidCode}`);
    }

    const created: { id: string; oidCode: string }[] = [];
    for (const item of normalized) {
      const supplier = await tx.supplier.create({ data: {
        ...item.input, oidCode: await nextOidCode(tx, "SUP"), qualificationStatus: "UNSCREENED", riskLevel: null, ownerUserId: args.userId,
      } });
      await tx.importRow.update({ where: { id: item.row.id }, data: { committedEntityId: supplier.id } });
      const raw = typeof item.row.rawData === "object" && item.row.rawData && !Array.isArray(item.row.rawData) ? item.row.rawData as Record<string, unknown> : {};
      await tx.legacyImportMap.create({ data: {
        importBatchId: batch.id, entityType: "SUPPLIER", legacySource: batch.sourceName, legacySheet: "suppliers",
        legacyRow: String(item.row.rowNumber), legacyIdentifier: String(raw.legacy_identifier || "") || null,
        oidEntityId: supplier.id, oidCode: supplier.oidCode, importReviewStatus: "IMPORTED_UNREVIEWED",
      } });
      await tx.auditLog.create({ data: {
        oidCode: await nextOidCode(tx, "AUD"), eventType: "CREATE", userId: args.userId,
        entityType: "SUPPLIER", entityId: supplier.id, newValues: { ...supplierAuditValues(item.input), importBatchId: batch.id, importReviewStatus: "IMPORTED_UNREVIEWED" },
        reason: args.reason.trim(),
      } });
      created.push({ id: supplier.id, oidCode: supplier.oidCode });
    }
    await tx.importBatch.update({ where: { id: batch.id }, data: { status: "COMMITTED", startedAt: new Date(), completedAt: new Date() } });
    await tx.auditLog.create({ data: {
      oidCode: await nextOidCode(tx, "AUD"), eventType: "APPROVE", userId: args.userId,
      entityType: "IMPORT_BATCH", entityId: batch.id,
      previousValues: { status: batch.status }, newValues: { status: "COMMITTED", createdCount: created.length, supplierIds: created.map((item) => item.id) },
      reason: args.reason.trim(),
    } });
    return { batchId: batch.id, status: "COMMITTED", createdCount: created.length, idempotent: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 });
}
