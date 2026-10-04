import { db } from "../../lib/database";
import { assertDecisionCanFinalize } from "../../lib/control";
import { requirePermission, PERMISSIONS } from "../../lib/permissions";
import { nextOidCode } from "../../lib/oid-identifiers/counter";

export async function createDecision(args: { decisionType: string; title: string; question?: string; context?: string; recommendation?: string; userId: string; permissions: Iterable<string> }) {
  requirePermission(args.permissions, PERMISSIONS.DECISION_WRITE);
  return db.decision.create({ data: { oidCode: await nextOidCode(db, "DEC"), decisionType: args.decisionType, title: args.title, question: args.question, context: args.context, recommendation: args.recommendation } });
}

export async function finalizeDecision(args: { decisionId: string; finalDecision: string; conditions?: string; evidence: { entityType: string; entityId: string; relationship: string }[]; userId: string; permissions: Iterable<string> }) {
  requirePermission(args.permissions, PERMISSIONS.DECISION_APPROVE);
  const decision = await db.decision.findUniqueOrThrow({ where: { id: args.decisionId } });
  assertDecisionCanFinalize({ status: decision.decisionStatus as any, evidenceCount: args.evidence.length, finalDecision: args.finalDecision, authorized: true });
  return db.$transaction(async tx => {
    for (const e of args.evidence) await tx.decisionEvidence.create({ data: { decisionId: decision.id, entityType: e.entityType, entityId: e.entityId, relationship: e.relationship } });
    const updated = await tx.decision.update({ where: { id: decision.id }, data: { finalDecision: args.finalDecision, conditions: args.conditions, decisionStatus: "DECIDED", decisionMaker: args.userId, decisionDate: new Date() } });
    await tx.auditLog.create({ data: { oidCode: await nextOidCode(tx, "AUD"), eventType: "APPROVE", userId: args.userId, entityType: "DECISION", entityId: decision.id, previousValues: { status: decision.decisionStatus }, newValues: { status: "DECIDED", finalDecision: args.finalDecision }, reason: args.conditions } });
    return updated;
  });
}
