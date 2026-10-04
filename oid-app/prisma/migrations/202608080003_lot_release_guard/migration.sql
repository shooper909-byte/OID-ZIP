CREATE OR REPLACE FUNCTION oid_lot_release_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND (NEW."status" = 'RELEASED' OR NEW."releaseGateStatus" = 'PASS') THEN
    RAISE EXCEPTION 'LOT_RELEASE_BLOCKED:RELEASE_REQUIRES_CONTROLLED_TRANSITION';
  END IF;

  IF TG_OP = 'UPDATE' AND (
    (NEW."status" = 'RELEASED' AND OLD."status" IS DISTINCT FROM 'RELEASED') OR
    (NEW."releaseGateStatus" = 'PASS' AND OLD."releaseGateStatus" IS DISTINCT FROM 'PASS')
  ) THEN
    IF NEW."status" IS DISTINCT FROM 'RELEASED' OR NEW."releaseGateStatus" IS DISTINCT FROM 'PASS' THEN
      RAISE EXCEPTION 'LOT_RELEASE_BLOCKED:STATUS_AND_GATE_MUST_RELEASE_TOGETHER';
    END IF;
    IF OLD."status" NOT IN ('QUALITY_REVIEW', 'HOLD') THEN
      RAISE EXCEPTION 'LOT_RELEASE_BLOCKED:LOT_NOT_IN_RELEASE_REVIEW_STATE';
    END IF;
    IF NEW."purchaseOrderId" IS NULL OR NEW."receiptId" IS NULL OR NEW."receiptItemId" IS NULL OR btrim(NEW."supplierLot") = '' THEN
      RAISE EXCEPTION 'LOT_RELEASE_BLOCKED:TRACEABILITY_INCOMPLETE';
    END IF;
    IF NEW."releasedBy" IS NULL OR NEW."releasedAt" IS NULL THEN
      RAISE EXCEPTION 'LOT_RELEASE_BLOCKED:HUMAN_RELEASE_IDENTITY_REQUIRED';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM "TestResult" result
      JOIN "TestOrder" test_order ON test_order."id" = result."testOrderId"
      WHERE result."lotId" = NEW."id"
        AND result."resultStatus" = 'PASS'
        AND result."reviewStatus" IN ('REVIEWED', 'APPROVED')
        AND test_order."isIndependent" = true
    ) THEN
      RAISE EXCEPTION 'LOT_RELEASE_BLOCKED:INDEPENDENT_TEST_NOT_PASSED_AND_REVIEWED';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM "Exception" exception_record
      WHERE exception_record."lotId" = NEW."id"
        AND exception_record."status" NOT IN ('CLOSED', 'MITIGATED')
        AND exception_record."blocksProcess" IN ('RELEASE', 'ALL')
    ) THEN
      RAISE EXCEPTION 'LOT_RELEASE_BLOCKED:OPEN_BLOCKING_EXCEPTION';
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS lot_release_guard ON "Lot";
CREATE TRIGGER lot_release_guard
BEFORE INSERT OR UPDATE ON "Lot"
FOR EACH ROW EXECUTE FUNCTION oid_lot_release_guard();
