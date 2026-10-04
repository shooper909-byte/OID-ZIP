import { db } from "../../lib/database";
import { nextOidCode } from "../../lib/oid-identifiers/counter";
import { releaseLot } from "./release";

export async function releaseLotWithPrisma(args: {
  lotId: string;
  userId: string;
  permissions: Iterable<string>;
  reason: string;
}) {
  return releaseLot({
    ...args,
    deps: {
      getLot: async (lotId) => {
        const lot = await db.lot.findUniqueOrThrow({
          where: { id: lotId },
          select: { id: true, status: true, releaseGateStatus: true, supplierLot: true, purchaseOrderId: true, receiptId: true, receiptItemId: true },
        });
        return {
          id: lot.id,
          status: lot.status,
          releaseGateStatus: lot.releaseGateStatus,
          supplierLot: lot.supplierLot,
          hasReceiptTraceability: Boolean(lot.purchaseOrderId && lot.receiptId && lot.receiptItemId),
        };
      },
      countReviewedPassingIndependentTests: (lotId) => db.testResult.count({
        where: {
          lotId,
          resultStatus: "PASS",
          reviewStatus: { in: ["REVIEWED", "APPROVED"] },
          testOrder: { isIndependent: true },
        },
      }),
      countBlockingExceptions: (lotId) => db.exception.count({ where: { lotId, status: { notIn: ["CLOSED", "MITIGATED"] }, blocksProcess: { in: ["RELEASE", "ALL"] } } }),
      releaseLotTransaction: async (lotId, userId, reason) => db.$transaction(async (tx) => {
        const current = await tx.lot.findUniqueOrThrow({ where: { id: lotId } });
        const released = await tx.lot.update({ where: { id: lotId }, data: { status: "RELEASED", releaseGateStatus: "PASS", releasedAt: new Date(), releasedBy: userId } });
        await tx.auditLog.create({
          data: {
            oidCode: await nextOidCode(tx, "AUD"),
            eventType: "RELEASE",
            userId,
            entityType: "LOT",
            entityId: lotId,
            previousValues: { status: current.status, releaseGateStatus: current.releaseGateStatus },
            newValues: { status: released.status, releaseGateStatus: released.releaseGateStatus },
            reason,
          },
        });
        return released;
      }),
    },
  });
}
