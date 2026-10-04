import { db } from "../../lib/database";
import { nextOidCode } from "../../lib/oid-identifiers/counter";
import { reviewTestResult } from "./review-result";

export async function reviewTestResultWithPrisma(args: {
  resultId: string;
  reviewerId: string;
  reviewStatus: "REVIEWED" | "APPROVED" | "REJECTED";
  note: string;
  permissions: Iterable<string>;
}) {
  return reviewTestResult({
    ...args,
    deps: {
      getResult: (id) => db.testResult.findUniqueOrThrow({ where: { id }, select: { id: true, lotId: true, resultStatus: true, reviewStatus: true } }),
      reviewResultTransaction: async (input) => db.$transaction(async (tx) => {
        const result = await tx.testResult.update({ where: { id: input.resultId }, data: { reviewStatus: input.reviewStatus, reviewedBy: input.reviewerId, reviewedAt: new Date() } });
        if (input.shouldHoldLot) {
          await tx.lot.update({ where: { id: input.lotId }, data: { status: "HOLD", releaseGateStatus: "BLOCKED" } });
          await tx.exception.create({
            data: {
              oidCode: await nextOidCode(tx, "EXC"),
              title: "Laboratory result requires investigation",
              description: `${result.oidCode} reviewed as ${input.reviewStatus}; analytical result is ${result.resultStatus}. ${input.note}`,
              severity: result.resultStatus === "FAIL" ? "CRITICAL" : "HIGH",
              lotId: input.lotId,
              entityType: "TEST_RESULT",
              entityId: input.resultId,
              blocksProcess: "RELEASE",
              ownerUserId: input.reviewerId,
            },
          });
        } else {
          await tx.lot.updateMany({ where: { id: input.lotId, status: { in: ["TESTING", "DOCUMENT_REVIEW", "SAMPLING"] } }, data: { status: "QUALITY_REVIEW", releaseGateStatus: "IN_REVIEW" } });
        }
        return result;
      }),
    },
  });
}
