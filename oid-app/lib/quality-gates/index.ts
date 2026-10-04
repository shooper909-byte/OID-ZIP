export type ReleaseCheck = {
  lotStatus: string;
  releaseGateStatus: string;
  reviewedPassingIndependentTests: number;
  blockingExceptions: number;
  hasReceiptTraceability: boolean;
  hasSupplierLot: boolean;
};

export function getReleaseBlockers(input: ReleaseCheck): string[] {
  const blockers: string[] = [];
  if (!["QUALITY_REVIEW", "HOLD"].includes(input.lotStatus)) blockers.push("LOT_NOT_IN_RELEASE_REVIEW_STATE");
  if (!input.hasReceiptTraceability) blockers.push("RECEIPT_TRACEABILITY_INCOMPLETE");
  if (!input.hasSupplierLot) blockers.push("SUPPLIER_LOT_MISSING");
  if (input.reviewedPassingIndependentTests < 1) blockers.push("INDEPENDENT_TEST_NOT_PASSED_AND_REVIEWED");
  if (input.blockingExceptions > 0) blockers.push("OPEN_BLOCKING_EXCEPTION");
  return blockers;
}

export function assertLotCanRelease(input: ReleaseCheck): void {
  const blockers = getReleaseBlockers(input);
  if (blockers.length) throw new Error(`LOT_RELEASE_BLOCKED:${blockers.join(",")}`);
}
