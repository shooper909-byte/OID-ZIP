import { requirePermission, PERMISSIONS } from "../../lib/permissions";

export type ReceiptItemInput = {
  purchaseOrderItemId: string;
  productId: string;
  skuId?: string | null;
  supplierLot?: string | null;
  quantityReceived: number;
  unit: string;
  labelPresent: boolean;
  lotMarkingPresent: boolean;
  coaReceived: boolean;
  conditionStatus?: string | null;
};

export type CreateReceiptDependencies = {
  getPurchaseOrder: (purchaseOrderId: string) => Promise<{ id: string; supplierId: string; orderStatus: string }>;
  createReceiptTransaction: (input: {
    purchaseOrderId: string;
    supplierId: string;
    receivedAt: Date;
    receivedBy: string;
    trackingNumber?: string;
    carrier?: string;
    photographsComplete: boolean;
    packingSlipPresent: boolean;
    invoicePresent: boolean;
    items: ReceiptItemInput[];
  }) => Promise<unknown>;
};

export async function createReceipt(args: {
  purchaseOrderId: string;
  receivedAt: Date;
  receivedBy: string;
  trackingNumber?: string;
  carrier?: string;
  photographsComplete: boolean;
  packingSlipPresent: boolean;
  invoicePresent: boolean;
  items: ReceiptItemInput[];
  permissions: Iterable<string>;
  deps: CreateReceiptDependencies;
}) {
  requirePermission(args.permissions, PERMISSIONS.RECEIPT_CREATE);
  if (!args.items.length) throw new Error("RECEIPT_ITEMS_REQUIRED");
  for (const item of args.items) {
    if (!(item.quantityReceived > 0)) throw new Error("INVALID_RECEIPT_QUANTITY");
    if (!item.unit.trim()) throw new Error("RECEIPT_UNIT_REQUIRED");
  }
  const po = await args.deps.getPurchaseOrder(args.purchaseOrderId);
  if (["CANCELLED", "CLOSED"].includes(po.orderStatus)) throw new Error("PURCHASE_ORDER_NOT_RECEIVABLE");
  return args.deps.createReceiptTransaction({
    purchaseOrderId: po.id,
    supplierId: po.supplierId,
    receivedAt: args.receivedAt,
    receivedBy: args.receivedBy,
    trackingNumber: args.trackingNumber,
    carrier: args.carrier,
    photographsComplete: args.photographsComplete,
    packingSlipPresent: args.packingSlipPresent,
    invoicePresent: args.invoicePresent,
    items: args.items,
  });
}
