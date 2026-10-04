import { describe, expect, it } from "vitest";
import { formatOidCode } from "../../lib/oid-identifiers";
import { assertCanAllocate, calculateAvailableQuantity } from "../../lib/inventory";
import { assertLotCanRelease, getReleaseBlockers } from "../../lib/quality-gates";

describe("OID identifiers", () => {
  it("formats yearless and yearly identifiers", () => {
    expect(formatOidCode("PROD", 1, 2026)).toBe("OID-PROD-000001");
    expect(formatOidCode("LOT", 37, 2026)).toBe("OID-LOT-2026-00037");
  });
});

describe("lot release controls", () => {
  it("blocks release without reviewed passing independent test", () => {
    const blockers = getReleaseBlockers({
      lotStatus: "QUALITY_REVIEW",
      releaseGateStatus: "IN_REVIEW",
      reviewedPassingIndependentTests: 0,
      blockingExceptions: 0,
      hasReceiptTraceability: true,
      hasSupplierLot: true,
    });
    expect(blockers).toContain("INDEPENDENT_TEST_NOT_PASSED_AND_REVIEWED");
  });

  it("allows a fully supported release candidate", () => {
    expect(() => assertLotCanRelease({
      lotStatus: "QUALITY_REVIEW",
      releaseGateStatus: "IN_REVIEW",
      reviewedPassingIndependentTests: 1,
      blockingExceptions: 0,
      hasReceiptTraceability: true,
      hasSupplierLot: true,
    })).not.toThrow();
  });
});

describe("allocation controls", () => {
  it("blocks allocation from quarantine", () => {
    expect(() => assertCanAllocate({
      lotStatus: "QUARANTINE",
      releaseGateStatus: "BLOCKED",
      availableQuantity: 10,
      requestedQuantity: 1,
    })).toThrow("LOT_NOT_RELEASED");
  });

  it("calculates movement-derived inventory", () => {
    expect(calculateAvailableQuantity([
      { quantityIn: 10, quantityOut: 0 },
      { quantityIn: 0, quantityOut: 2 },
      { quantityIn: 1, quantityOut: 0 },
    ])).toBe(9);
  });
});
