import { db } from "../../lib/database";
import { PERMISSIONS, requirePermission } from "../../lib/permissions";
import { objectStorage } from "../../lib/storage";
import { nextOidCode } from "../../lib/oid-identifiers/counter";
import { verifySha256 } from "./hash";

export async function downloadDocument(args: { documentId: string; userId: string; permissions: Iterable<string> }) {
  requirePermission(args.permissions, PERMISSIONS.DOCUMENT_READ);
  const document = await db.document.findUniqueOrThrow({
    where: { id: args.documentId },
    select: { id: true, oidCode: true, title: true, originalFilename: true, storageKey: true, mimeType: true, sha256Hash: true, status: true },
  });
  if (document.status !== "ACTIVE") throw new Error("DOCUMENT_NOT_ACTIVE");
  const bytes = await objectStorage().get(document.storageKey);
  if (!verifySha256(bytes, document.sha256Hash)) throw new Error("DOCUMENT_HASH_MISMATCH");
  await db.auditLog.create({
    data: {
      oidCode: await nextOidCode(db, "AUD"), eventType: "DOWNLOAD", userId: args.userId,
      entityType: "DOCUMENT", entityId: document.id, reason: "Authorized private document retrieval",
      newValues: { oidCode: document.oidCode, sha256Verified: true },
    },
  });
  return { document, bytes };
}
