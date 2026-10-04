export type AuditEvent = {
  eventType: string;
  entityType: string;
  entityId: string;
  userId?: string;
  previousValues?: unknown;
  newValues?: unknown;
  reason?: string;
};

export function makeAuditEvent(event: AuditEvent): AuditEvent & { createdAt: string } {
  if (!event.eventType || !event.entityType || !event.entityId) throw new Error("INVALID_AUDIT_EVENT");
  return { ...event, createdAt: new Date().toISOString() };
}
