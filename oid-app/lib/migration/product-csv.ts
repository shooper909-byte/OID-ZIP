import { z } from "zod";
import { ProductInputSchema, SkuInputSchema, productDuplicateKey } from "../products/input";
import { MAX_CSV_ROWS, parseCsv } from "./supplier-csv";

// Imports must preserve an unknown package size instead of the manual form's default of 1.
export const ProductImportInput = z.object({
  product: ProductInputSchema,
  sku: SkuInputSchema,
  packageKnown: z.boolean(),
  sourceSystem: z.string().trim().min(1).max(200),
  sourceId: z.string().trim().min(1).max(120),
  originalSku: z.string().trim().max(120),
  catalogType: z.string().trim().max(120),
  notes: z.string().max(5000),
}).strict();
export type ProductImportData = z.infer<typeof ProductImportInput>;
export type ProductImportRow = {
  rowNumber: number; raw: Record<string, string>; normalized: ProductImportData | null;
  status: "VALID" | "WARNING" | "ERROR"; action: "CREATE_PRODUCT" | "SKIP_PRODUCT"; messages: string[];
};
export const PRODUCT_CSV_HEADERS = ["source_system", "website_id", "original_sku", "internal_sku", "name", "canonical_name", "product_family", "research_classification", "strength_value", "strength_unit", "form", "package_quantity", "package_unit", "storage_requirements", "catalog_type", "notes"];

export function sourceKey(source: string, id: string) { return JSON.stringify([source, id]); }
function decodeName(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0*39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
export function validateProductCsv(text: string, options: {
  neutralSkus?: boolean; sourceSystem: string; existingSkus?: Iterable<string>;
  existingNames?: Iterable<string>; existingSources?: Iterable<string>;
}) {
  const parsed = parseCsv(text.replace(/^\uFEFF/, ""));
  if (parsed.length < 2) throw new Error("CSV_NO_DATA_ROWS");
  if (parsed.length - 1 > MAX_CSV_ROWS) throw new Error("CSV_ROW_LIMIT_EXCEEDED:1000");
  const headers = parsed[0].map(h => h.trim().toLowerCase());
  if (headers.some(h => !h) || new Set(headers).size !== headers.length) throw new Error("CSV_DUPLICATE_OR_EMPTY_HEADERS");
  const woo = headers.includes("id") && headers.includes("categories") && headers.includes("sku");
  for (const h of woo ? ["id", "name", "sku", "categories", "type"] : ["website_id", "name", "internal_sku"]) {
    if (!headers.includes(h)) throw new Error(`CSV_REQUIRED_HEADER_MISSING:${h}`);
  }
  const existingSkus = new Set(options.existingSkus);
  const existingNames = new Set(Array.from(options.existingNames ?? [], productDuplicateKey));
  const existingSources = new Set(options.existingSources);
  const seenSources = new Set<string>(), seenSkus = new Set<string>(), seenNames = new Set<string>();
  const rows = parsed.slice(1).map((cells, index): ProductImportRow => {
    const raw = Object.fromEntries(headers.map((h, i) => [h, (cells[i] ?? "").trim()]));
    const errors: string[] = [], messages: string[] = [];
    const base = { rowNumber: index + 2, raw, normalized: null, action: "CREATE_PRODUCT" as const };
    if (cells.length !== headers.length) return { ...base, status: "ERROR", messages: ["Column count does not match header"] };
    if (woo && (/Archived Catalog Records/i.test(raw.categories) || /Vitamins|Wellness|Nutraceutical|Performance/i.test(raw.categories))) {
      return { ...base, action: "SKIP_PRODUCT", status: "VALID", messages: ["Excluded: archived or nutraceutical catalog record"] };
    }
    if (woo && !/Research|ORII/i.test(raw.categories)) errors.push("Category is not recognized as research; review before importing");
    const sourceSystem = woo ? options.sourceSystem : raw.source_system || options.sourceSystem;
    const sourceId = woo ? raw.id : raw.website_id;
    const originalSku = woo ? raw.sku : raw.original_sku || "";
    const name = decodeName(raw.name);
    const internalSku = options.neutralSkus ? (/^\d+$/.test(sourceId) ? `OP-R-${sourceId.padStart(5, "0")}` : "") : woo ? raw.sku : raw.internal_sku;
    const key = sourceKey(sourceSystem, sourceId);
    if (seenSources.has(key)) errors.push("Duplicate website ID within this file");
    if (seenSkus.has(internalSku)) errors.push("Duplicate proposed SKU within this file");
    seenSources.add(key); seenSkus.add(internalSku);
    // Previously imported IDs are never silently updated, even if the SKU has changed.
    if (existingSources.has(key) && !errors.length) return { ...base, action: "SKIP_PRODUCT", status: "WARNING", messages: ["Website ID already imported; existing product will not be changed"] };
    if (existingSkus.has(internalSku) || (originalSku && existingSkus.has(originalSku))) errors.push("Proposed or original SKU already exists in OID; reconcile the existing record");
    const nameKey = productDuplicateKey(name);
    if (existingNames.has(nameKey)) errors.push("Product name already exists in OID; reconcile the existing record");
    if (seenNames.has(nameKey)) messages.push("Same name has a different website ID in this file; retained as a separate catalog record for review");
    seenNames.add(nameKey);
    const catalogType = woo ? raw.type : raw.catalog_type || "";
    const candidate = {
      product: { name, canonicalName: raw.canonical_name, productFamily: raw.product_family, researchClassification: raw.research_classification, status: "UNDER_REVIEW" },
      sku: { internalSku, displayName: name, strengthValue: raw.strength_value, strengthUnit: raw.strength_unit, form: raw.form, packageQuantity: raw.package_quantity || undefined, packageUnit: raw.package_unit, storageRequirements: raw.storage_requirements },
      packageKnown: Boolean(raw.package_quantity), sourceSystem, sourceId, originalSku, catalogType, notes: raw.notes || "",
    };
    const checked = ProductImportInput.safeParse(candidate);
    if (!checked.success) errors.push(...checked.error.issues.map(i => `${i.path.join(".")}: ${i.message}`));
    for (const [field, label] of [["form", "Physical form"], ["storage_requirements", "Storage requirements"], ["package_quantity", "Package quantity"], ["strength_value", "Strength"]]) {
      if (!raw[field]) messages.push(`${label} is unspecified; verify before use`);
    }
    if (raw.package_unit && !raw.package_quantity) errors.push("Package unit requires a known package quantity");
    if (woo) messages.push("WooCommerce export mapped by column names; specifications are not inferred from names or SKUs");
    if (/mix-and-match|bundle|grouped|variable|variation/i.test(catalogType)) messages.push("Catalog record only; configurable contents, parent links and inventory are not imported");
    if (raw.notes) messages.push(raw.notes);
    return { ...base, normalized: checked.success ? checked.data : null, status: errors.length ? "ERROR" : messages.length ? "WARNING" : "VALID", messages: [...errors, ...messages] };
  });
  return { rows, format: woo ? "WooCommerce export" : "OID product CSV" };
}
