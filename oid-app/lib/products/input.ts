import { z } from "zod";

export const PRODUCT_ENTRY_STATUSES = [
  "DISCOVERY",
  "RESEARCH",
  "UNDER_REVIEW",
  "DOCUMENTATION_INCOMPLETE",
  "TESTING_REQUIRED",
  "HOLD",
] as const;

const OptionalText = (max: number) => z.string().trim().max(max).optional().transform((value) => value || undefined);
const OptionalPositiveNumber = (max: number) => z.preprocess(
  (value) => value === "" || value === null || value === undefined ? undefined : Number(value),
  z.number().finite().positive().max(max).optional(),
);

export const ProductInputSchema = z.object({
  name: z.string().trim().min(2).max(240),
  canonicalName: OptionalText(240),
  productFamily: OptionalText(120),
  researchClassification: OptionalText(160),
  status: z.enum(PRODUCT_ENTRY_STATUSES).default("UNDER_REVIEW"),
}).strict();

export const SkuInputSchema = z.object({
  internalSku: z.string().trim().min(3).max(120).regex(/^[A-Z0-9][A-Z0-9-]*$/, "SKU must use uppercase letters, numbers, and hyphens"),
  displayName: z.string().trim().min(2).max(240),
  strengthValue: OptionalPositiveNumber(1_000_000),
  strengthUnit: OptionalText(40),
  form: OptionalText(80),
  packageQuantity: OptionalPositiveNumber(100_000).default(1),
  packageUnit: OptionalText(40),
  storageRequirements: OptionalText(500),
}).strict().superRefine((value, context) => {
  if ((value.strengthValue === undefined) !== (value.strengthUnit === undefined)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["strengthUnit"], message: "Strength value and unit must be entered together" });
  }
});

export const ProductCreateInputSchema = z.object({ product: ProductInputSchema, sku: SkuInputSchema }).strict();
export type ProductCreateInput = z.infer<typeof ProductCreateInputSchema>;

export function productDuplicateKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

