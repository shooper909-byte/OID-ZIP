import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ db: { $transaction: vi.fn(), importBatch: { findUnique: vi.fn() } } }));
vi.mock("../../lib/database", () => ({ db: mocks.db }));
import { commitProductImport, stageProductImport } from "../../services/migration/products";
import { validateProductCsv } from "../../lib/migration/product-csv";

const data = validateProductCsv('website_id,internal_sku,name\n12,OP-R-00012,Example material', { sourceSystem: "woocommerce:example.test" }).rows[0].normalized;
const args = { batchId: "batch", userId: "user", permissions: ["migration.resolve", "product.write"], confirmation: "COMMIT PRODUCT IMPORT", reason: "Reviewed the catalog specifications" };
let tx: any;
beforeEach(() => {
  vi.clearAllMocks();
  let counter = 0;
  tx = {
    importBatch: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "batch", status: "PRODUCT_PREVIEW_READY", errorCount: 0, rows: [{ id: "row", rowNumber: 2, proposedAction: "CREATE_PRODUCT", validationStatus: "WARNING", normalizedData: data }] }), update: vi.fn() },
    product: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockImplementation(async ({ data }: any) => ({ id: "product", ...data })) },
    sku: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockImplementation(async ({ data }: any) => ({ id: "sku", ...data })) },
    legacyImportMap: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn() },
    importRow: { update: vi.fn() }, auditLog: { create: vi.fn() },
    oidCounter: { upsert: vi.fn().mockImplementation(async () => ({ currentValue: ++counter })) },
  };
  mocks.db.$transaction.mockImplementation(async (fn: any) => fn(tx));
});
describe("product import commit service", () => {
  it("requires both migration authority and product-write permission", async () => {
    await expect(commitProductImport({ ...args, permissions: ["migration.resolve"] })).rejects.toThrow("FORBIDDEN:product.write");
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });
  it("requires explicit confirmation before any database access", async () => {
    await expect(commitProductImport({ ...args, confirmation: "yes" })).rejects.toThrow("IMPORT_EXPLICIT_CONFIRMATION");
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });
  it("rejects a supplier batch", async () => {
    tx.importBatch.findUniqueOrThrow.mockResolvedValue({ status: "PREVIEW_READY" });
    await expect(commitProductImport(args)).rejects.toThrow("IMPORT_WRONG_TYPE");
    expect(tx.product.create).not.toHaveBeenCalled();
  });
  it("makes an already committed batch idempotent", async () => {
    tx.importBatch.findUniqueOrThrow.mockResolvedValue({ id: "batch", status: "PRODUCT_COMMITTED", rows: [{ committedEntityId: "product" }] });
    expect(await commitProductImport(args)).toMatchObject({ createdCount: 1, idempotent: true });
    expect(tx.product.create).not.toHaveBeenCalled();
  });
  it("rechecks duplicates that appeared after preview before writing", async () => {
    tx.legacyImportMap.findMany.mockResolvedValue([{ legacySource: "woocommerce:example.test", legacyIdentifier: "12" }]);
    await expect(commitProductImport(args)).rejects.toThrow("IMPORT_DUPLICATE_AT_COMMIT");
    expect(tx.product.create).not.toHaveBeenCalled();
  });
  it("writes unknown package quantity as null, retains source mapping and audits in one serializable transaction", async () => {
    expect(await commitProductImport(args)).toMatchObject({ createdCount: 1, idempotent: false });
    expect(tx.product.create.mock.calls[0][0].data).toMatchObject({ status: "UNDER_REVIEW", evidenceState: "UNKNOWN" });
    expect(tx.sku.create.mock.calls[0][0].data).toMatchObject({ packageQuantity: null, status: "UNDER_REVIEW", internalSku: "OP-R-00012" });
    expect(tx.legacyImportMap.create.mock.calls[0][0].data).toMatchObject({ legacyIdentifier: "12", oidEntityId: "product", importReviewStatus: "IMPORTED_REVIEW_REQUIRED" });
    expect(tx.auditLog.create).toHaveBeenCalledTimes(2);
    expect(mocks.db.$transaction.mock.calls[0][1]).toMatchObject({ isolationLevel: "Serializable" });
  });
  it("rejects error rows without creating products", async () => {
    tx.importBatch.findUniqueOrThrow.mockResolvedValue({ status: "PRODUCT_PREVIEW_READY", errorCount: 1, rows: [] });
    await expect(commitProductImport(args)).rejects.toThrow("IMPORT_VALIDATION_ERRORS");
    expect(tx.product.create).not.toHaveBeenCalled();
  });
  it("returns the existing preview for a repeated file without creating records", async () => {
    mocks.db.importBatch.findUnique.mockResolvedValue({ id: "prior", rows: [] });
    const result = await stageProductImport({ name: "Products", sourceName: "products.csv", bytes: Buffer.from("a,b"), sourceSystem: "woocommerce:example.test", neutralSkus: false, userId: "user", permissions: ["migration.run", "product.write"] });
    expect(result.idempotent).toBe(true);
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });
});
