export type Severity = "INFO"|"LOW"|"MEDIUM"|"HIGH"|"CRITICAL";
export type ActionStatus = "PLANNED"|"OPEN"|"IN_PROGRESS"|"WAITING_INTERNAL"|"WAITING_VENDOR"|"WAITING_LAB"|"COMPLETE"|"CANCELLED";
export type DecisionStatus = "DRAFT"|"READY_FOR_REVIEW"|"DECIDED"|"DEFERRED"|"SUPERSEDED";

export function assertActionCanComplete(input: { status: ActionStatus; resolution?: string; evidenceCount: number }): void {
  if (["COMPLETE","CANCELLED"].includes(input.status)) throw new Error("ACTION_ALREADY_FINAL");
  if (!input.resolution?.trim()) throw new Error("ACTION_RESOLUTION_REQUIRED");
  if (input.evidenceCount < 1) throw new Error("ACTION_EVIDENCE_REQUIRED");
}

export function assertCriticalExceptionCanClose(input: { severity: Severity; resolution?: string; evidenceCount: number; reviewerAuthorized: boolean }): void {
  if (!input.resolution?.trim()) throw new Error("EXCEPTION_RESOLUTION_REQUIRED");
  if (input.evidenceCount < 1) throw new Error("EXCEPTION_EVIDENCE_REQUIRED");
  if (input.severity === "CRITICAL" && !input.reviewerAuthorized) throw new Error("CRITICAL_EXCEPTION_AUTHORIZATION_REQUIRED");
}

export function assertCapaCanClose(input: { rootCause?: string; correctiveAction?: string; effectivenessStatus?: string }): void {
  if (!input.rootCause?.trim()) throw new Error("CAPA_ROOT_CAUSE_REQUIRED");
  if (!input.correctiveAction?.trim()) throw new Error("CAPA_CORRECTIVE_ACTION_REQUIRED");
  if (input.effectivenessStatus !== "EFFECTIVE") throw new Error("CAPA_EFFECTIVENESS_NOT_CONFIRMED");
}

export function assertDecisionCanFinalize(input: { status: DecisionStatus; evidenceCount: number; finalDecision?: string; authorized: boolean }): void {
  if (input.status === "DECIDED" || input.status === "SUPERSEDED") throw new Error("DECISION_ALREADY_FINAL");
  if (!input.authorized) throw new Error("DECISION_AUTHORIZATION_REQUIRED");
  if (input.evidenceCount < 1) throw new Error("DECISION_EVIDENCE_REQUIRED");
  if (!input.finalDecision?.trim()) throw new Error("FINAL_DECISION_REQUIRED");
}
