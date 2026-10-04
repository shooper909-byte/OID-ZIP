export type EvidenceRef = { oidCode: string; entityType: string; summary: string; relationship?: "SUPPORTS"|"CONTRADICTS"|"BACKGROUND" };
export type IntelligenceResponse = { answer: string; confidence: "HIGH"|"MODERATE"|"LOW"; evidence: EvidenceRef[]; conflictingEvidence: EvidenceRef[]; unknowns: string[]; requiredActions: string[] };

export function computeConfidence(input: { supportingEvidence: number; conflictingEvidence: number; unknowns: number }): IntelligenceResponse["confidence"] {
  if (input.supportingEvidence >= 2 && input.conflictingEvidence === 0 && input.unknowns === 0) return "HIGH";
  if (input.supportingEvidence >= 1 && input.conflictingEvidence <= 1) return "MODERATE";
  return "LOW";
}

export function buildEvidenceResponse(input: Omit<IntelligenceResponse,"confidence">): IntelligenceResponse {
  return { ...input, confidence: computeConfidence({ supportingEvidence: input.evidence.length, conflictingEvidence: input.conflictingEvidence.length, unknowns: input.unknowns.length }) };
}

export function assertEvidenceRefsExist(refs: EvidenceRef[], knownOidCodes: Set<string>): void {
  for (const ref of refs) if (!knownOidCodes.has(ref.oidCode)) throw new Error(`UNKNOWN_EVIDENCE_REFERENCE:${ref.oidCode}`);
}
