import { requirePermission, PERMISSIONS } from "../../lib/permissions";

export type ReviewResultDependencies = {
  getResult: (resultId: string) => Promise<{ id: string; lotId: string; resultStatus: string; reviewStatus: string }>;
  reviewResultTransaction: (input: { resultId: string; lotId: string; reviewerId: string; reviewStatus: "REVIEWED" | "APPROVED" | "REJECTED"; note: string; shouldHoldLot: boolean }) => Promise<unknown>;
};

export async function reviewTestResult(args: {
  resultId: string;
  reviewerId: string;
  reviewStatus: "REVIEWED" | "APPROVED" | "REJECTED";
  note: string;
  permissions: Iterable<string>;
  deps: ReviewResultDependencies;
}) {
  requirePermission(args.permissions, PERMISSIONS.TEST_REVIEW);
  if (!args.note.trim()) throw new Error("TEST_REVIEW_NOTE_REQUIRED");
  const result = await args.deps.getResult(args.resultId);
  const shouldHoldLot = ["FAIL", "INCONCLUSIVE", "RETEST_REQUIRED"].includes(result.resultStatus) || args.reviewStatus === "REJECTED";
  return args.deps.reviewResultTransaction({
    resultId: result.id,
    lotId: result.lotId,
    reviewerId: args.reviewerId,
    reviewStatus: args.reviewStatus,
    note: args.note,
    shouldHoldLot,
  });
}
