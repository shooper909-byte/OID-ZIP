import { assertLotCanRelease } from "../../lib/quality-gates";
import { requirePermission, PERMISSIONS } from "../../lib/permissions";

export type ReleaseDependencies = {
  getLot: (lotId: string) => Promise<{ id: string; status: string; releaseGateStatus: string; supplierLot: string | null; hasReceiptTraceability: boolean }>;
  countReviewedPassingIndependentTests: (lotId: string) => Promise<number>;
  countBlockingExceptions: (lotId: string) => Promise<number>;
  releaseLotTransaction: (lotId: string, userId: string, reason: string) => Promise<unknown>;
};

export async function releaseLot(args: {
  lotId: string;
  userId: string;
  permissions: Iterable<string>;
  reason: string;
  deps: ReleaseDependencies;
}) {
  requirePermission(args.permissions, PERMISSIONS.LOT_RELEASE);
  if (!args.reason.trim()) throw new Error("RELEASE_REASON_REQUIRED");
  const [lot, tests, blockers] = await Promise.all([
    args.deps.getLot(args.lotId),
    args.deps.countReviewedPassingIndependentTests(args.lotId),
    args.deps.countBlockingExceptions(args.lotId),
  ]);
  assertLotCanRelease({
    lotStatus: lot.status,
    releaseGateStatus: lot.releaseGateStatus,
    reviewedPassingIndependentTests: tests,
    blockingExceptions: blockers,
    hasReceiptTraceability: lot.hasReceiptTraceability,
    hasSupplierLot: Boolean(lot.supplierLot),
  });
  return args.deps.releaseLotTransaction(args.lotId, args.userId, args.reason);
}
