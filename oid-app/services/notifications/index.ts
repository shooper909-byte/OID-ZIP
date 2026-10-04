import { db } from "../../lib/database";
export async function notify(args: { userId?: string; eventType: string; entityType?: string; entityId?: string; title: string; message: string; severity?: string }) {
  return db.notification.create({ data: { ...args, severity: args.severity ?? "INFO" } });
}
