import { describe, expect, it } from "vitest";
import { validateProductCsv, sourceKey } from "../../lib/migration/product-csv";
const sourceSystem = "woocommerce:oligopolypeptides.com";
const base = "website_id,internal_sku,name\n12,OP-R-00012,Example research material\n";
describe("product CSV validation", () => {
  it("keeps missing specifications unknown and products under review", () => {
    const row = validateProductCsv(base, { sourceSystem }).rows[0];
    expect(row.status).toBe("WARNING");
    expect(row.normalized?.packageKnown).toBe(false);
    expect(row.normalized?.sku.form).toBeUndefined();
    expect(row.normalized?.sku.strengthValue).toBeUndefined();
    expect(row.normalized?.product.status).toBe("UNDER_REVIEW");
  });
  it("maps WooCommerce headers, neutral SKUs and exclusions without importing stock", () => {
    const rows = validateProductCsv('ID,Name,SKU,Categories,Type,Stock\n12,Example,OLD-12,Research Products,simple,9\n13,Vitamin D,VIT-13,Vitamins,simple,9\n14,Archived,OLD-14,Archived Catalog Records,simple,9\n', { sourceSystem, neutralSkus: true }).rows;
    expect(rows.map(r => r.action)).toEqual(["CREATE_PRODUCT", "SKIP_PRODUCT", "SKIP_PRODUCT"]);
    expect(rows[0].normalized?.sku.internalSku).toBe("OP-R-00012");
    expect(rows[0].normalized).not.toHaveProperty("stock");
    expect(rows[0].normalized?.originalSku).toBe("OLD-12");
  });
  it("blocks duplicate IDs and SKUs in one upload", () => {
    const rows = validateProductCsv(base + '12,OP-R-00013,Other material\n14,OP-R-00012,Third material\n', { sourceSystem }).rows;
    expect(rows.map(r => r.status)).toEqual(["WARNING", "ERROR", "ERROR"]);
  });
  it("skips a previously imported website ID even if its proposed SKU changes", () => {
    expect(validateProductCsv(base, { sourceSystem, existingSources: [sourceKey(sourceSystem, "12")] }).rows[0].action).toBe("SKIP_PRODUCT");
  });
  it("blocks collisions with OID SKUs and manually created product names", () => {
    expect(validateProductCsv(base, { sourceSystem, existingSkus: ["OP-R-00012"] }).rows[0].status).toBe("ERROR");
    expect(validateProductCsv(base, { sourceSystem, existingNames: ["EXAMPLE   research material"] }).rows[0].status).toBe("ERROR");
  });
  it("checks original website SKUs as well as proposed replacements", () => {
    const text = 'ID,Name,SKU,Categories,Type\n12,Example,OLD-12,Research Products,simple\n';
    expect(validateProductCsv(text, { sourceSystem, neutralSkus: true, existingSkus: ["OLD-12"] }).rows[0].status).toBe("ERROR");
  });
  it("warns on duplicate names with distinct source IDs", () => {
    const rows = validateProductCsv(base + '13,OP-R-00013,Example research material\n', { sourceSystem }).rows;
    expect(rows[1].messages.join(" ")).toContain("separate catalog record");
    expect(rows[1].status).toBe("WARNING");
  });
  it("rejects incomplete strength pairs and invalid quantity", () => {
    expect(validateProductCsv('website_id,internal_sku,name,strength_value\n12,OP-R-00012,Example,10', { sourceSystem }).rows[0].status).toBe("ERROR");
    expect(validateProductCsv('website_id,internal_sku,name,package_quantity\n12,OP-R-00012,Example,-1', { sourceSystem }).rows[0].status).toBe("ERROR");
  });
  it("handles BOM, quoted commas and embedded newlines", () => {
    const row = validateProductCsv('\uFEFFwebsite_id,internal_sku,name,notes\r\n12,OP-R-00012,"Example, material","first\nsecond"\r\n', { sourceSystem }).rows[0];
    expect(row.normalized?.product.name).toBe("Example, material");
    expect(row.normalized?.notes).toBe("first\nsecond");
  });
  it("rejects malformed columns, duplicate headers and unclosed quotes", () => {
    expect(validateProductCsv(base + '13,OP-R-00013,Other,extra\n', { sourceSystem }).rows[1].status).toBe("ERROR");
    expect(() => validateProductCsv('website_id,name,name\n1,a,b', { sourceSystem })).toThrow("CSV_DUPLICATE");
    expect(() => validateProductCsv('website_id,internal_sku,name\n1,ABC,"broken', { sourceSystem })).toThrow("CSV_UNCLOSED");
  });
  it("never imports an unrecognized WooCommerce category silently", () => {
    expect(validateProductCsv('ID,Name,SKU,Categories,Type\n12,Example,ABC,Unknown,simple', { sourceSystem }).rows[0].status).toBe("ERROR");
  });
  it("flags configurable contents as requiring separate setup", () => {
    const row = validateProductCsv('ID,Name,SKU,Categories,Type\n12,Example bundle,ABC,Research Bundles,mix-and-match', { sourceSystem }).rows[0];
    expect(row.messages.join(" ")).toContain("configurable contents");
  });
});
