export type TraceabilityState = {
  purchaseOrderId?: string | null;
  receiptId?: string | null;
  receiptItemId?: string | null;
  supplierLot?: string | null;
  sampleCount?: number;
  reviewedPassingIndependentTests?: number;
  blockingExceptions?: number;
};

export function getTraceabilityGaps(state: TraceabilityState): string[] {
  const gaps: string[] = [];
  if (!state.purchaseOrderId) gaps.push("PURCHASE_ORDER_MISSING");
  if (!state.receiptId) gaps.push("RECEIPT_MISSING");
  if (!state.receiptItemId) gaps.push("RECEIPT_ITEM_MISSING");
  if (!state.supplierLot?.trim()) gaps.push("SUPPLIER_LOT_MISSING");
  if ((state.sampleCount ?? 0) < 1) gaps.push("SAMPLE_MISSING");
  if ((state.reviewedPassingIndependentTests ?? 0) < 1) gaps.push("INDEPENDENT_TEST_NOT_PASSED_AND_REVIEWED");
  if ((state.blockingExceptions ?? 0) > 0) gaps.push("OPEN_BLOCKING_EXCEPTION");
  return gaps;
}

export function isTraceabilityComplete(state: TraceabilityState): boolean {
  return getTraceabilityGaps(state).length === 0;
}
