import { z } from "zod";

export const SUPPLIER_TYPES = ["MANUFACTURER", "TRADING_COMPANY", "DISTRIBUTOR", "BROKER", "UNKNOWN"] as const;

const OptionalText = (max: number) => z.string().trim().max(max).optional().transform((value) => value || undefined);
const OptionalUrl = z.string().trim().max(500).optional().transform((value) => value || undefined).refine(
  (value) => !value || (() => { try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; } })(),
  "Website must be a valid http or https URL",
);

export const SupplierInputSchema = z.object({
  legalName: z.string().trim().min(2).max(240),
  tradeName: OptionalText(240),
  supplierType: z.enum(SUPPLIER_TYPES).default("UNKNOWN"),
  country: OptionalText(100),
  website: OptionalUrl,
  addressLine1: OptionalText(240),
  addressLine2: OptionalText(240),
  city: OptionalText(120),
  region: OptionalText(120),
  postalCode: OptionalText(40),
}).strict();

export type SupplierInput = z.infer<typeof SupplierInputSchema>;

export function supplierDuplicateKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export function supplierAuditValues(input: SupplierInput) {
  return { ...input, qualificationStatus: "UNSCREENED" as const, riskLevel: null };
}
