import { describe, expect, it } from "vitest";
import { ProductCreateInputSchema, productDuplicateKey } from "../../lib/products/input";
import { SupplierProductInputSchema } from "../../lib/supplier-products/input";

describe("controlled product-master input", () => {
  it("normalizes a product and SKU without creating approval state", () => {
    const parsed = ProductCreateInputSchema.parse({
      product: { name: " Retatrutide 10 mg Research Peptide ", status: "UNDER_REVIEW" },
      sku: { internalSku: "OP-MET-RETA-10MG", displayName: "Retatrutide 10 mg Research Peptide", strengthValue: "10", strengthUnit: "mg", form: "Lyophilized vial", packageQuantity: "1", packageUnit: "vial" },
    });
    expect(parsed.product.name).toBe("Retatrutide 10 mg Research Peptide");
    expect(parsed.product.status).toBe("UNDER_REVIEW");
    expect(parsed.sku.strengthValue).toBe(10);
    expect(parsed.sku.packageQuantity).toBe(1);
  });

  it("blocks released status, malformed SKUs, and incomplete strength pairs", () => {
    const base = { product: { name: "Example", status: "UNDER_REVIEW" }, sku: { internalSku: "OP-EXAMPLE-10MG", displayName: "Example", packageQuantity: 1 } };
    expect(() => ProductCreateInputSchema.parse({ ...base, product: { ...base.product, status: "RELEASED" } })).toThrow();
    expect(() => ProductCreateInputSchema.parse({ ...base, sku: { ...base.sku, internalSku: "bad sku" } })).toThrow();
    expect(() => ProductCreateInputSchema.parse({ ...base, sku: { ...base.sku, strengthValue: 10 } })).toThrow();
  });

  it("uses normalized product names for duplicate detection", () => {
    expect(productDuplicateKey("  GHK-Cu   50 mg ")).toBe(productDuplicateKey("ghk-cu 50 MG"));
  });
});

describe("supplier-product input", () => {
  it("normalizes quoted commercial fields and leaves qualification outside user input", () => {
    const parsed = SupplierProductInputSchema.parse({
      supplierId: "00000000-0000-0000-0000-000000000001",
      productId: "00000000-0000-0000-0000-000000000002",
      skuId: "",
      minimumOrderQuantity: "10",
      leadTimeDays: "14",
      lastPrice: "58",
      currency: "usd",
    });
    expect(parsed.minimumOrderQuantity).toBe(10);
    expect(parsed.leadTimeDays).toBe(14);
    expect(parsed.lastPrice).toBe(58);
    expect(parsed.currency).toBe("USD");
    expect(parsed).not.toHaveProperty("qualificationStatus");
  });
});
