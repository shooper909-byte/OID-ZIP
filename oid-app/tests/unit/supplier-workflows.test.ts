import { describe, expect, it } from "vitest";
import { parseCsv, supplierCsvTemplate, validateSupplierCsv } from "../../lib/migration/supplier-csv";
import { SupplierInputSchema, supplierAuditValues } from "../../lib/suppliers/input";
import { stageSupplierImport } from "../../services/migration";
import { createSupplier } from "../../services/suppliers/create";

describe("supplier input controls", () => {
  it("normalizes supported fields and fixes safe initial state", () => {
    const input = SupplierInputSchema.parse({ legalName: "  Synthetic Labs  ", supplierType: "MANUFACTURER", website: "https://example.invalid" });
    expect(input.legalName).toBe("Synthetic Labs");
    expect(supplierAuditValues(input)).toMatchObject({ qualificationStatus: "UNSCREENED", riskLevel: null });
  });
  it("rejects unknown fields, invalid types, and unsafe website schemes", () => {
    expect(() => SupplierInputSchema.parse({ legalName: "Valid Name", approved: true })).toThrow();
    expect(() => SupplierInputSchema.parse({ legalName: "Valid Name", supplierType: "LAB" })).toThrow();
    expect(() => SupplierInputSchema.parse({ legalName: "Valid Name", website: "javascript:alert(1)" })).toThrow();
  });
  it("enforces write permission before database access", async () => {
    await expect(createSupplier({ input: SupplierInputSchema.parse({ legalName: "Synthetic Supplier" }), userId: "00000000-0000-0000-0000-000000000001", permissions: [] })).rejects.toThrow("FORBIDDEN:supplier.write");
  });
});

describe("supplier CSV validation", () => {
  it("parses quoted commas, escaped quotes, and embedded newlines", () => {
    expect(parseCsv('legal_name,trade_name\n"Lab, One","A ""quoted""\nname"\n')).toEqual([["legal_name", "trade_name"], ["Lab, One", 'A "quoted"\nname']]);
  });
  it("produces valid normalized rows without creating qualification or risk values", () => {
    const result = validateSupplierCsv("legal_name,supplier_type,country\nSynthetic One,MANUFACTURER,US\n");
    expect(result.rows[0]).toMatchObject({ rowNumber: 2, status: "VALID", normalized: { legalName: "Synthetic One", supplierType: "MANUFACTURER", country: "US" } });
    expect(result.rows[0].normalized).not.toHaveProperty("qualificationStatus");
    expect(result.rows[0].normalized).not.toHaveProperty("riskLevel");
  });
  it("blocks duplicate names both within a file and against the database snapshot", () => {
    const result = validateSupplierCsv("legal_name\nExisting Labs\n existing   labs \n", ["Existing Labs"]);
    expect(result.rows.every((row) => row.status === "ERROR")).toBe(true);
    expect(result.rows.flatMap((row) => row.messages).join(" ")).toContain("already exists");
    expect(result.rows[1].messages).toContain("Duplicate legal name within this file");
  });
  it("reports unknown columns as warnings and invalid rows as errors", () => {
    const result = validateSupplierCsv("legal_name,unexpected,supplier_type\nSynthetic Labs,value,INVALID\n");
    expect(result.unknownHeaders).toEqual(["unexpected"]);
    expect(result.rows[0].status).toBe("ERROR");
    expect(result.rows[0].messages.join(" ")).toContain("supplierType");
  });
  it("rejects malformed headers and quoting", () => {
    expect(() => validateSupplierCsv("trade_name\nOnly trade\n")).toThrow("CSV_REQUIRED_HEADER_MISSING:legal_name");
    expect(() => validateSupplierCsv("legal_name\n")).toThrow("CSV_NO_DATA_ROWS");
    expect(() => validateSupplierCsv('legal_name\n"Unclosed')).toThrow("CSV_UNCLOSED_QUOTE");
    expect(() => validateSupplierCsv("legal_name,legal_name\nA,A\n")).toThrow("CSV_DUPLICATE_HEADERS");
  });
  it("ships a reusable valid template", () => {
    const preview = validateSupplierCsv(supplierCsvTemplate());
    expect(preview.rows).toHaveLength(1);
    expect(preview.rows[0].status).toBe("VALID");
  });
  it("rejects unauthorized and non-CSV staging before database access", async () => {
    await expect(stageSupplierImport({ name: "x", sourceName: "x.csv", bytes: Buffer.from("legal_name\nA"), userId: "00000000-0000-0000-0000-000000000001", permissions: [] })).rejects.toThrow("FORBIDDEN:migration.run");
    await expect(stageSupplierImport({ name: "x", sourceName: "x.xlsx", bytes: Buffer.from("x"), userId: "00000000-0000-0000-0000-000000000001", permissions: ["migration.run"] })).rejects.toThrow("CSV_FILE_TYPE_REQUIRED");
  });
});
