import { buildEvidenceResponse, type EvidenceRef, type IntelligenceResponse } from "../../lib/intelligence";

export function explainLotStatus(input: { oidCode: string; status: string; releaseGateStatus: string; tests: { oidCode: string; resultStatus: string; reviewStatus: string; isIndependent: boolean }[]; exceptions: { oidCode: string; status: string; blocksProcess: string; summary: string }[]; traceabilityComplete: boolean; testsVisible?: boolean; exceptionsVisible?: boolean }): IntelligenceResponse {
  const evidence: EvidenceRef[] = [];
  const conflicts: EvidenceRef[] = [];
  const unknowns: string[] = [];
  const actions: string[] = [];
  for (const t of input.tests) {
    const ref = { oidCode: t.oidCode, entityType: "TEST_RESULT", summary: `${t.resultStatus}; review ${t.reviewStatus}; independent ${t.isIndependent}` } satisfies EvidenceRef;
    if (t.resultStatus === "FAIL" || t.resultStatus === "INCONCLUSIVE") conflicts.push({ ...ref, relationship: "CONTRADICTS" }); else evidence.push({ ...ref, relationship: "SUPPORTS" });
  }
  for (const e of input.exceptions.filter(e => !["CLOSED","MITIGATED"].includes(e.status))) conflicts.push({ oidCode: e.oidCode, entityType: "EXCEPTION", summary: e.summary, relationship: "CONTRADICTS" });
  if (!input.traceabilityComplete) { unknowns.push("Complete purchase-order, receipt, and receipt-item traceability is not established."); actions.push("Complete lot traceability before release review."); }
  if (input.testsVisible === false) unknowns.push("Testing evidence is outside the requesting user's authorized retrieval scope.");
  else if (!input.tests.some(t => t.isIndependent && t.resultStatus === "PASS" && ["REVIEWED","APPROVED"].includes(t.reviewStatus))) { unknowns.push("No reviewed passing independent test is available."); actions.push("Complete independent testing and human review."); }
  if (input.exceptionsVisible === false) unknowns.push("Exception evidence is outside the requesting user's authorized retrieval scope.");
  if (conflicts.some(c => c.entityType === "EXCEPTION")) actions.push("Resolve blocking exceptions with evidence.");
  return buildEvidenceResponse({ answer: `${input.oidCode} is ${input.status}; release gate is ${input.releaseGateStatus}.`, evidence, conflictingEvidence: conflicts, unknowns, requiredActions: actions });
}
