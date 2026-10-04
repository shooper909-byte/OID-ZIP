import { db } from "../../lib/database";
import { assertEvidenceRefsExist, type IntelligenceResponse } from "../../lib/intelligence";
import { hasPermission, requirePermission, PERMISSIONS } from "../../lib/permissions";
import { explainLotStatus } from "./lot-answer";

async function recordQuery(userId: string, question: string, response: IntelligenceResponse) {
  await db.intelligenceQuery.create({
    data: {
      userId, question, normalizedQuestion: question.toLowerCase(), answer: response.answer, confidence: response.confidence,
      evidence: response.evidence as any, conflictingEvidence: response.conflictingEvidence as any,
      unknowns: response.unknowns as any, requiredActions: response.requiredActions as any,
    },
  });
}

export async function queryOid(args: { question: string; userId: string; permissions: Iterable<string> }) {
  requirePermission(args.permissions, PERMISSIONS.INTELLIGENCE_QUERY);
  const q = args.question.trim();
  if (q.length < 3 || q.length > 1000) throw new Error("INVALID_INTELLIGENCE_QUESTION");
  const code = q.match(/OID-LOT-\d{4}-\d{5}/i)?.[0]?.toUpperCase();
  if (code) {
    requirePermission(args.permissions, PERMISSIONS.LOT_READ);
    const testsVisible = hasPermission(args.permissions, PERMISSIONS.TEST_READ);
    const exceptionsVisible = hasPermission(args.permissions, PERMISSIONS.EXCEPTION_READ);
    const lot = await db.lot.findUnique({
      where: { oidCode: code },
      select: { id: true, oidCode: true, status: true, releaseGateStatus: true, purchaseOrderId: true, receiptId: true, receiptItemId: true },
    });
    if (!lot) return { answer: `${code} was not found.`, confidence: "LOW", evidence: [], conflictingEvidence: [], unknowns: ["The requested lot identifier does not exist in OID."], requiredActions: ["Verify the lot identifier."] } satisfies IntelligenceResponse;
    const [tests, exceptions] = await Promise.all([
      testsVisible ? db.testResult.findMany({ where: { lotId: lot.id }, select: { oidCode: true, resultStatus: true, reviewStatus: true, testOrder: { select: { isIndependent: true } } } }) : Promise.resolve([]),
      exceptionsVisible ? db.exception.findMany({ where: { lotId: lot.id }, select: { oidCode: true, status: true, blocksProcess: true, title: true } }) : Promise.resolve([]),
    ]);
    const response = explainLotStatus({
      oidCode: lot.oidCode, status: lot.status, releaseGateStatus: lot.releaseGateStatus,
      tests: tests.map((t) => ({ oidCode: t.oidCode, resultStatus: t.resultStatus, reviewStatus: t.reviewStatus, isIndependent: t.testOrder.isIndependent })),
      exceptions: exceptions.map((e) => ({ oidCode: e.oidCode, status: e.status, blocksProcess: e.blocksProcess, summary: e.title })),
      traceabilityComplete: Boolean(lot.purchaseOrderId && lot.receiptId && lot.receiptItemId), testsVisible, exceptionsVisible,
    });
    const known = new Set([...response.evidence, ...response.conflictingEvidence].map((ref) => ref.oidCode));
    assertEvidenceRefsExist([...response.evidence, ...response.conflictingEvidence], known);
    await recordQuery(args.userId, q, response);
    return response;
  }

  const productPromise = hasPermission(args.permissions, PERMISSIONS.PRODUCT_READ)
    ? db.product.findMany({ where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { oidCode: { contains: q, mode: "insensitive" } }] }, select: { oidCode: true, name: true }, take: 5 }) : Promise.resolve([]);
  const supplierPromise = hasPermission(args.permissions, PERMISSIONS.SUPPLIER_READ)
    ? db.supplier.findMany({ where: { OR: [{ legalName: { contains: q, mode: "insensitive" } }, { oidCode: { contains: q, mode: "insensitive" } }] }, select: { oidCode: true, legalName: true }, take: 5 }) : Promise.resolve([]);
  const exceptionPromise = hasPermission(args.permissions, PERMISSIONS.EXCEPTION_READ)
    ? db.exception.findMany({ where: { OR: [{ title: { contains: q, mode: "insensitive" } }, { oidCode: { contains: q, mode: "insensitive" } }] }, select: { oidCode: true, title: true }, take: 5 }) : Promise.resolve([]);
  const [products, suppliers, exceptions] = await Promise.all([productPromise, supplierPromise, exceptionPromise]);
  const evidence = [
    ...products.map((x) => ({ oidCode: x.oidCode, entityType: "PRODUCT", summary: x.name })),
    ...suppliers.map((x) => ({ oidCode: x.oidCode, entityType: "SUPPLIER", summary: x.legalName })),
    ...exceptions.map((x) => ({ oidCode: x.oidCode, entityType: "EXCEPTION", summary: x.title })),
  ];
  const known = new Set(evidence.map((ref) => ref.oidCode));
  assertEvidenceRefsExist(evidence, known);
  const response: IntelligenceResponse = {
    answer: evidence.length ? `OID found ${evidence.length} authorized records related to the query.` : "OID found no directly matching authorized records.",
    confidence: evidence.length > 1 ? "MODERATE" : "LOW", evidence, conflictingEvidence: [],
    unknowns: evidence.length ? [] : ["No matching authoritative record was found within the requesting user's authorized scope."], requiredActions: [],
  };
  await recordQuery(args.userId, q, response);
  return response;
}
