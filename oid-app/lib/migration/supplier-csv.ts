import { SupplierInputSchema, supplierDuplicateKey, type SupplierInput } from "../suppliers/input";

export const MAX_CSV_BYTES = 1_000_000;
export const MAX_CSV_ROWS = 1_000;
export const SUPPLIER_CSV_HEADERS = [
  "legal_name", "trade_name", "supplier_type", "country", "website",
  "address_line_1", "address_line_2", "city", "region", "postal_code", "legacy_identifier",
] as const;

export type SupplierCsvRow = {
  rowNumber: number;
  raw: Record<string, string>;
  normalized: SupplierInput | null;
  legacyIdentifier?: string;
  status: "VALID" | "WARNING" | "ERROR";
  messages: string[];
};

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field.length === 0) quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (char !== "\r") field += char;
  }
  if (quoted) throw new Error("CSV_UNCLOSED_QUOTE");
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

export function validateSupplierCsv(text: string, existingNames: Iterable<string> = []): { rows: SupplierCsvRow[]; unknownHeaders: string[] } {
  const parsed = parseCsv(text.replace(/^\uFEFF/, ""));
  if (!parsed.length) throw new Error("CSV_EMPTY");
  if (parsed.length === 1) throw new Error("CSV_NO_DATA_ROWS");
  const headers = parsed[0].map((header) => header.trim().toLowerCase());
  if (new Set(headers).size !== headers.length) throw new Error("CSV_DUPLICATE_HEADERS");
  if (!headers.includes("legal_name")) throw new Error("CSV_REQUIRED_HEADER_MISSING:legal_name");
  if (parsed.length - 1 > MAX_CSV_ROWS) throw new Error(`CSV_ROW_LIMIT_EXCEEDED:${MAX_CSV_ROWS}`);
  const known = new Set<string>(SUPPLIER_CSV_HEADERS);
  const unknownHeaders = headers.filter((header) => !known.has(header));
  const seen = new Set<string>();
  const existing = new Set(Array.from(existingNames, supplierDuplicateKey));
  const rows = parsed.slice(1).map((cells, index): SupplierCsvRow => {
    const raw = Object.fromEntries(headers.map((header, column) => [header, (cells[column] ?? "").trim()]));
    const messages: string[] = [];
    if (cells.length > headers.length) messages.push("Row has more columns than the header");
    if (unknownHeaders.length) messages.push(`Ignored unknown columns: ${unknownHeaders.join(", ")}`);
    const candidate = {
      legalName: raw.legal_name,
      tradeName: raw.trade_name,
      supplierType: raw.supplier_type || "UNKNOWN",
      country: raw.country,
      website: raw.website,
      addressLine1: raw.address_line_1,
      addressLine2: raw.address_line_2,
      city: raw.city,
      region: raw.region,
      postalCode: raw.postal_code,
    };
    const result = SupplierInputSchema.safeParse(candidate);
    if (!result.success) messages.push(...result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`));
    if (result.success) {
      const key = supplierDuplicateKey(result.data.legalName);
      if (seen.has(key)) messages.push("Duplicate legal name within this file");
      if (existing.has(key)) messages.push("Supplier legal name already exists");
      seen.add(key);
    }
    const hasError = !result.success || messages.some((message) => message.startsWith("Duplicate") || message.endsWith("already exists") || message.startsWith("Row has more"));
    return {
      rowNumber: index + 2,
      raw,
      normalized: result.success ? result.data : null,
      legacyIdentifier: raw.legacy_identifier || undefined,
      status: hasError ? "ERROR" : messages.length ? "WARNING" : "VALID",
      messages,
    };
  });
  return { rows, unknownHeaders };
}

export function supplierCsvTemplate(): string {
  return `${SUPPLIER_CSV_HEADERS.join(",")}\nExample Supplier,Example Trade Name,UNKNOWN,US,https://example.invalid,,,,,,LEGACY-001\n`;
}
