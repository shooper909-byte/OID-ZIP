import { z } from "zod";

const OptionalText = (max: number) => z.string().trim().max(max).optional().transform((value) => value || undefined);
const OptionalPositiveNumber = (max: number) => z.preprocess(
  (value) => value === "" || value === null || value === undefined ? undefined : Number(value),
  z.number().finite().positive().max(max).optional(),
);
const OptionalPositiveInteger = (max: number) => z.preprocess(
  (value) => value === "" || value === null || value === undefined ? undefined : Number(value),
  z.number().int().positive().max(max).optional(),
);

export const SupplierProductInputSchema = z.object({
  supplierId: z.string().uuid(),
  productId: z.string().uuid(),
  skuId: z.preprocess((value) => value === "" || value === null ? undefined : value, z.string().uuid().optional()),
  supplierProductName: OptionalText(240),
  supplierCatalogReference: OptionalText(160),
  minimumOrderQuantity: OptionalPositiveNumber(1_000_000),
  leadTimeDays: OptionalPositiveInteger(3650),
  lastPrice: OptionalPositiveNumber(100_000_000),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Currency must be a three-letter code").default("USD"),
}).strict();

export type SupplierProductInput = z.infer<typeof SupplierProductInputSchema>;
