import { db } from "../../lib/database";
import { nextOidCode } from "../../lib/oid-identifiers/counter";
import { createReceipt, type ReceiptItemInput } from "./create";

export async function createReceiptWithPrisma(args: {
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
}) {
  return createReceipt({
    ...args,
    deps: {
      getPurchaseOrder: (id) => db.purchaseOrder.findUniqueOrThrow({ where: { id }, select: { id: true, supplierId: true, orderStatus: true } }),
      createReceiptTransaction: async (input) => db.$transaction(async (tx) => {
        const receipt = await tx.receipt.create({
          data: {
            oidCode: await nextOidCode(tx, "REC", input.receivedAt),
            purchaseOrderId: input.purchaseOrderId,
            receivedAt: input.receivedAt,
            receivedBy: input.receivedBy,
            trackingNumber: input.trackingNumber,
            carrier: input.carrier,
            photographsComplete: input.photographsComplete,
            packingSlipPresent: input.packingSlipPresent,
            invoicePresent: input.invoicePresent,
          },
        });

        for (const item of input.items) {
          const receiptItem = await tx.receiptItem.create({ data: { receiptId: receipt.id, ...item } });
          if (item.supplierLot?.trim()) {
            const lot = await tx.lot.create({
              data: {
                oidCode: await nextOidCode(tx, "LOT", input.receivedAt),
                productId: item.productId,
                skuId: item.skuId,
                supplierId: input.supplierId,
                purchaseOrderId: input.purchaseOrderId,
                receiptId: receipt.id,
                receiptItemId: receiptItem.id,
                supplierLot: item.supplierLot,
                receivedQuantity: item.quantityReceived,
                quantityUnit: item.unit,
                status: "QUARANTINE",
                releaseGateStatus: "INCOMPLETE",
                receivedAt: input.receivedAt,
              },
            });
            await tx.inventoryMovement.create({
              data: {
                oidCode: await nextOidCode(tx, "MOV", input.receivedAt),
                lotId: lot.id,
                movementType: "RECEIPT",
                quantityIn: item.quantityReceived,
                quantityOut: 0,
                unit: item.unit,
                referenceType: "RECEIPT",
                referenceId: receipt.id,
                reason: `Received under ${receipt.oidCode}`,
                performedBy: input.receivedBy,
              },
            });
          }
        }
        await tx.purchaseOrder.update({ where: { id: input.purchaseOrderId }, data: { orderStatus: "RECEIVED", actualDeliveryDate: input.receivedAt } });
        return receipt;
      }),
    },
  });
}
