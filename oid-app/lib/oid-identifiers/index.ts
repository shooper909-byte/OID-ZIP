export type OidEntity =
  | "PROD" | "SKU" | "SUP" | "PO" | "REC" | "LOT" | "SMP"
  | "TST" | "RES" | "DOC" | "MOV" | "ORG" | "ORD" | "ALLOC"
  | "EXC" | "ACT" | "CAPA" | "DEC" | "MKT" | "RSH" | "AUD";

const YEARLESS = new Set<OidEntity>(["PROD", "SKU", "SUP", "ORG"]);

export function formatOidCode(entity: OidEntity, sequence: number, year = new Date().getUTCFullYear()): string {
  if (!Number.isInteger(sequence) || sequence < 1) throw new Error("sequence must be a positive integer");
  const width = entity === "AUD" ? 8 : entity === "PROD" || entity === "SKU" || entity === "SUP" || entity === "ORG" ? 6 : 5;
  const seq = String(sequence).padStart(width, "0");
  return YEARLESS.has(entity) ? `OID-${entity}-${seq}` : `OID-${entity}-${year}-${seq}`;
}
