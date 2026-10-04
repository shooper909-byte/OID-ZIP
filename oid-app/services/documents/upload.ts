import { DocumentType } from "@prisma/client";
import { db } from "../../lib/database";
import { requirePermission, PERMISSIONS } from "../../lib/permissions";
import { nextOidCode } from "../../lib/oid-identifiers/counter";
import { objectStorage } from "../../lib/storage";
import { sha256Buffer } from "./hash";

export async function uploadDocument(args: {
  filename: string; mimeType: string; bytes: Buffer; documentType: DocumentType; title: string;
  entityType?: string; entityId?: string; supersedesDocumentId?: string; userId: string; permissions: Iterable<string>;
}) {
  requirePermission(args.permissions, PERMISSIONS.DOCUMENT_UPLOAD);
  if (args.bytes.length === 0) throw new Error("EMPTY_DOCUMENT");
  if (args.bytes.length > 25 * 1024 * 1024) throw new Error("DOCUMENT_TOO_LARGE");
  if (!args.title.trim() || args.title.length > 240) throw new Error("INVALID_DOCUMENT_TITLE");
  const hash = sha256Buffer(args.bytes);

  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${hash}))`;
    const duplicate = await tx.document.findFirst({ where: { sha256Hash: hash, status: "ACTIVE" } });
    if (duplicate) throw new Error(`DUPLICATE_DOCUMENT:${duplicate.oidCode}`);

    let supersedes: { id: string; version: number } | null = null;
    if (args.supersedesDocumentId) {
      supersedes = await tx.document.findFirst({ where: { id: args.supersedesDocumentId, status: "ACTIVE" }, select: { id: true, version: true } });
      if (!supersedes) throw new Error("SUPERSEDED_DOCUMENT_NOT_ACTIVE");
    }

    const oidCode = await nextOidCode(tx, "DOC");
    const safeName = args.filename.replace(/[^A-Za-z0-9._-]/g, "_");
    const key = `${new Date().getUTCFullYear()}/${oidCode}/${safeName}`;
    await objectStorage().put(key, args.bytes);
    const doc = await tx.document.create({
      data: {
        oidCode, documentType: args.documentType, title: args.title.trim(), originalFilename: args.filename,
        storageKey: key, mimeType: args.mimeType, fileSize: args.bytes.length, sha256Hash: hash,
        uploadedBy: args.userId, supersedesDocumentId: supersedes?.id, version: (supersedes?.version ?? 0) + 1,
      },
    });
    if (supersedes) await tx.document.update({ where: { id: supersedes.id }, data: { status: "SUPERSEDED" } });
    if (args.entityType && args.entityId) await tx.documentLink.create({ data: { documentId: doc.id, entityType: args.entityType, entityId: args.entityId, createdBy: args.userId } });
    await tx.auditLog.create({
      data: {
        oidCode: await nextOidCode(tx, "AUD"), eventType: "CREATE", userId: args.userId,
        entityType: "DOCUMENT", entityId: doc.id,
        newValues: { oidCode, hash, entityType: args.entityType, entityId: args.entityId, supersedesDocumentId: supersedes?.id },
      },
    });
    return doc;
  });
}
