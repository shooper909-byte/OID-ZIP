import { readFileSync, writeFileSync } from "node:fs";
import { parseCsv } from "../lib/migration/supplier-csv";
import { PRODUCT_CSV_HEADERS, validateProductCsv } from "../lib/migration/product-csv";

const [referencePath, exportPath, outputPath] = process.argv.slice(2);
if (!referencePath || !exportPath || !outputPath) throw new Error("Usage: tsx scripts/prepare-product-import.ts reference.txt woo.csv output.csv");
const reference = readFileSync(referencePath, "utf8");
const source = parseCsv(readFileSync(exportPath, "utf8").replace(/^\uFEFF/, ""));
const exportsById = new Map(source.slice(1).map(cells => { const row = Object.fromEntries(source[0].map((h, i) => [h, cells[i]])); return [row.ID, row]; }));
const blocks = reference.split(/\n(?=\d{2} \/ 83 — )/).slice(1);
const mapped = blocks.map(block => {
  const fields = Object.fromEntries(block.split("\n").filter(line => /^[A-Za-z][^:]*: /.test(line)).map(line => { const i = line.indexOf(": "); return [line.slice(0, i), line.slice(i + 2).trim()]; }));
  const id = /Website product ID: (\d+)/.exec(block)?.[1];
  const exported = id ? exportsById.get(id) : undefined;
  if (!exported) throw new Error("Source website ID missing from export");
  if (fields["Original website SKU (reference only)"] !== exported.SKU) throw new Error(`Original SKU mismatch for ${id}`);
  if (fields["Internal SKU"] !== `OP-R-${id!.padStart(5, "0")}`) throw new Error(`Proposed SKU mismatch for ${id}`);
  const clean = (key: string) => fields[key]?.startsWith("[") ? "" : fields[key] || "";
  const notes = block.split("ENTRY NOTES (do not paste into form):")[1]?.split(/\n={5,}/)[0].trim() || "";
  // Individual-vial package conventions are explicitly unverified in this reference.
  const knownPackage = /SIX-VIAL KITS|CUSTOM BUNDLES/.test(fields.Group ?? "");
  return {
    source_system: "woocommerce:oligopolypeptides.com", website_id: id!, original_sku: exported.SKU,
    internal_sku: fields["Internal SKU"], name: clean("Product name"), canonical_name: clean("Canonical name"),
    product_family: clean("Product family"), research_classification: clean("Research classification"),
    strength_value: clean("Strength"), strength_unit: clean("Strength") ? clean("Strength unit") : "", form: "",
    package_quantity: knownPackage ? clean("Package quantity") : "", package_unit: knownPackage ? clean("Package unit") : "",
    storage_requirements: "", catalog_type: exported.Type,
    notes: `${notes}\nCanonical names and classifications are suggested labels from the reference. Nominal amounts, where supplied, come from the catalog and are not laboratory verification. Physical form and storage are unknown. ${knownPackage ? "Package count comes from the named bundle or kit." : "Unverified package conventions were left blank."}`.trim(),
  };
});
if (mapped.length !== 83 || new Set(mapped.map(r => r.website_id)).size !== 83) throw new Error("Expected exactly 83 unique source records");
const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
const csv = [PRODUCT_CSV_HEADERS, ...mapped.map(row => PRODUCT_CSV_HEADERS.map(h => row[h as keyof typeof row]))].map(row => row.map(quote).join(",")).join("\r\n") + "\r\n";
const preview = validateProductCsv(csv, { sourceSystem: "woocommerce:oligopolypeptides.com" });
const errors = preview.rows.filter(r => r.status === "ERROR");
if (errors.length) throw new Error(JSON.stringify(errors.map(r => ({ row: r.rowNumber, errors: r.messages }))));
writeFileSync(outputPath, csv);
console.log(JSON.stringify({ rows: mapped.length, errors: errors.length, warnings: preview.rows.filter(r => r.status === "WARNING").length, output: outputPath }));
