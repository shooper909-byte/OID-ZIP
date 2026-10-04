import { describe, expect, it } from "vitest";
import { getTraceabilityGaps, isTraceabilityComplete } from "../../lib/traceability";
import { buildLotTimeline } from "../../services/evidence/lot-timeline";

const complete = {
  purchaseOrderId: "po",
  receiptId: "receipt",
  receiptItemId: "receipt-item",
  supplierLot: "SUP-LOT-1",
  sampleCount: 1,
  reviewedPassingIndependentTests: 1,
  blockingExceptions: 0,
};

describe("traceability", () => {
  it("requires exact PO, receipt, sample and reviewed independent result", () => {
    expect(isTraceabilityComplete(complete)).toBe(true);
    expect(getTraceabilityGaps({ ...complete, receiptItemId: null })).toContain("RECEIPT_ITEM_MISSING");
    expect(getTraceabilityGaps({ ...complete, reviewedPassingIndependentTests: 0 })).toContain("INDEPENDENT_TEST_NOT_PASSED_AND_REVIEWED");
  });
});

describe("lot timeline", () => {
  it("sorts evidence chronologically", () => {
    const events = buildLotTimeline({
      lot: { id: "l", oidCode: "OID-LOT-2026-00001", createdAt: new Date("2026-08-01"), receivedAt: new Date("2026-08-02"), status: "TESTING" },
      receipts: [{ id: "r", oidCode: "OID-REC-2026-00001", receivedAt: new Date("2026-08-02") }],
      samples: [{ id: "s", oidCode: "OID-SMP-2026-00001", createdAt: new Date("2026-08-03"), status: "COLLECTED" }],
      testOrders: [], testResults: [], exceptions: [], movements: [],
    });
    expect(events[0].type).toBe("LOT_CREATED");
    expect(events.at(-1)?.type).toBe("SAMPLE");
  });
});
