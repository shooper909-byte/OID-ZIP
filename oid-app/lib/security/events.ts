export type SecurityEvent = {
  event: string;
  outcome: "ALLOW" | "DENY" | "ERROR";
  actorId?: string;
  route?: string;
  reason?: string;
  entityType?: string;
  entityId?: string;
};

export function logSecurityEvent(event: SecurityEvent): void {
  const safe = { timestamp: new Date().toISOString(), category: "security", ...event };
  const line = JSON.stringify(safe);
  if (event.outcome === "ALLOW") console.info(line);
  else console.warn(line);
}
