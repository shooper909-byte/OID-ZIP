import { db } from "../../lib/database";
import { requirePermission, PERMISSIONS } from "../../lib/permissions";
import { assertActionCanComplete } from "../../lib/control";
import { nextOidCode } from "../../lib/oid-identifiers/counter";

export async function createAction(args: { title: string; description?: string; priority?: string; entityType?: string; entityId?: string; assignedTo?: string; dueAt?: Date; sourceReference?: string; userId: string; permissions: Iterable<string> }) {
  requirePermission(args.permissions, PERMISSIONS.ACTION_WRITE);
  return db.action.create({ data: { oidCode: await nextOidCode(db, "ACT"), title: args.title, description: args.description, priority: args.priority ?? "MEDIUM", entityType: args.entityType, entityId: args.entityId, assignedTo: args.assignedTo, dueAt: args.dueAt, sourceReference: args.sourceReference } });
}

export async function completeAction(args: { actionId: string; resolution: string; evidenceCount: number; userId: string; permissions: Iterable<string> }) {
  requirePermission(args.permissions, PERMISSIONS.ACTION_COMPLETE);
  const action = await db.action.findUniqueOrThrow({ where: { id: args.actionId } });
  assertActionCanComplete({ status: action.status as any, resolution: args.resolution, evidenceCount: args.evidenceCount });
  return db.$transaction(async tx => {
    const updated = await tx.action.update({ where: { id: action.id }, data: { status: "COMPLETE", completedAt: new Date(), description: [action.description, `Resolution: ${args.resolution}`].filter(Boolean).join("\n\n") } });
    await tx.auditLog.create({ data: { oidCode: await nextOidCode(tx, "AUD"), eventType: "STATUS_CHANGE", userId: args.userId, entityType: "ACTION", entityId: action.id, previousValues: { status: action.status }, newValues: { status: "COMPLETE" }, reason: args.resolution } });
    return updated;
  });
}
