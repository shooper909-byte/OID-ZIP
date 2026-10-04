import { db } from "../../lib/database";
import { assertCapaCanClose } from "../../lib/control";
import { requirePermission, PERMISSIONS } from "../../lib/permissions";
import { nextOidCode } from "../../lib/oid-identifiers/counter";

export async function createCapa(args: { exceptionId?: string; title: string; ownerId?: string; dueAt?: Date; userId: string; permissions: Iterable<string> }) {
  requirePermission(args.permissions, PERMISSIONS.CAPA_WRITE);
  return db.capa.create({ data: { oidCode: await nextOidCode(db, "CAPA"), exceptionId: args.exceptionId, title: args.title, ownerId: args.ownerId, dueAt: args.dueAt } });
}

export async function closeCapa(args: { capaId: string; rootCause: string; correctiveAction: string; preventiveAction?: string; effectivenessReview: string; effectivenessStatus: string; userId: string; permissions: Iterable<string> }) {
  requirePermission(args.permissions, PERMISSIONS.CAPA_CLOSE);
  assertCapaCanClose(args);
  return db.$transaction(async tx => {
    const previous = await tx.capa.findUniqueOrThrow({ where: { id: args.capaId } });
    const updated = await tx.capa.update({ where: { id: args.capaId }, data: { rootCause: args.rootCause, correctiveAction: args.correctiveAction, preventiveAction: args.preventiveAction, effectivenessReview: args.effectivenessReview, effectivenessStatus: args.effectivenessStatus, status: "CLOSED", closedAt: new Date(), closedBy: args.userId } });
    await tx.auditLog.create({ data: { oidCode: await nextOidCode(tx, "AUD"), eventType: "STATUS_CHANGE", userId: args.userId, entityType: "CAPA", entityId: args.capaId, previousValues: { status: previous.status }, newValues: { status: "CLOSED" }, reason: args.effectivenessReview } });
    return updated;
  });
}
