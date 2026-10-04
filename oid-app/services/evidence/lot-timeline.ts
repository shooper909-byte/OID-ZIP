export type TimelineEvent = {
  at: Date;
  type: string;
  label: string;
  entityType: string;
  entityId: string;
  severity?: string;
};

export type LotTimelineSource = {
  lot: { id: string; oidCode: string; createdAt: Date; receivedAt?: Date | null; releasedAt?: Date | null; status: string };
  receipts: Array<{ id: string; oidCode: string; receivedAt: Date }>;
  samples: Array<{ id: string; oidCode: string; createdAt: Date; collectedAt?: Date | null; status: string }>;
  testOrders: Array<{ id: string; oidCode: string; createdAt: Date; resultReceivedAt?: Date | null; status: string }>;
  testResults: Array<{ id: string; oidCode: string; createdAt: Date; reviewedAt?: Date | null; resultStatus: string }>;
  exceptions: Array<{ id: string; oidCode: string; discoveredAt: Date; resolvedAt?: Date | null; severity: string; status: string }>;
  movements: Array<{ id: string; oidCode: string; occurredAt: Date; movementType: string }>;
};

export function buildLotTimeline(source: LotTimelineSource): TimelineEvent[] {
  const events: TimelineEvent[] = [{ at: source.lot.createdAt, type: "LOT_CREATED", label: `Lot ${source.lot.oidCode} created`, entityType: "LOT", entityId: source.lot.id }];
  if (source.lot.receivedAt) events.push({ at: source.lot.receivedAt, type: "LOT_RECEIVED", label: "Lot received", entityType: "LOT", entityId: source.lot.id });
  if (source.lot.releasedAt) events.push({ at: source.lot.releasedAt, type: "LOT_RELEASED", label: "Lot released", entityType: "LOT", entityId: source.lot.id });
  for (const r of source.receipts) events.push({ at: r.receivedAt, type: "RECEIPT", label: `Receipt ${r.oidCode}`, entityType: "RECEIPT", entityId: r.id });
  for (const s of source.samples) events.push({ at: s.collectedAt ?? s.createdAt, type: "SAMPLE", label: `Sample ${s.oidCode}: ${s.status}`, entityType: "SAMPLE", entityId: s.id });
  for (const t of source.testOrders) events.push({ at: t.resultReceivedAt ?? t.createdAt, type: "TEST_ORDER", label: `Test ${t.oidCode}: ${t.status}`, entityType: "TEST_ORDER", entityId: t.id });
  for (const r of source.testResults) events.push({ at: r.reviewedAt ?? r.createdAt, type: "TEST_RESULT", label: `Result ${r.oidCode}: ${r.resultStatus}`, entityType: "TEST_RESULT", entityId: r.id });
  for (const e of source.exceptions) {
    events.push({ at: e.discoveredAt, type: "EXCEPTION_OPENED", label: `Exception ${e.oidCode}: ${e.status}`, entityType: "EXCEPTION", entityId: e.id, severity: e.severity });
    if (e.resolvedAt) events.push({ at: e.resolvedAt, type: "EXCEPTION_RESOLVED", label: `Exception ${e.oidCode} resolved`, entityType: "EXCEPTION", entityId: e.id, severity: e.severity });
  }
  for (const m of source.movements) events.push({ at: m.occurredAt, type: "INVENTORY_MOVEMENT", label: `${m.movementType} ${m.oidCode}`, entityType: "INVENTORY_MOVEMENT", entityId: m.id });
  return events.sort((a, b) => a.at.getTime() - b.at.getTime());
}
