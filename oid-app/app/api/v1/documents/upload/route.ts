import { DocumentType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { actorForServerRequest } from "../../../../../lib/auth";
import { uploadDocument } from "../../../../../services/documents/upload";
import { assertMutationOrigin, safeApiError } from "../../../../../lib/security/request";
import { consumeRateLimit } from "../../../../../lib/security/rate-limit";

const OptionalUuid = z.string().uuid().optional();
export async function POST(request: Request) {
  try {
    assertMutationOrigin(request);
    const actor = await actorForServerRequest(request);
    if (!consumeRateLimit(`document-upload:${actor.userId}`, 30, 60_000).allowed) throw new Error("RATE_LIMITED");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("FILE_REQUIRED");
    const documentType = z.nativeEnum(DocumentType).parse(String(form.get("documentType") ?? "OTHER"));
    const title = z.string().trim().min(1).max(240).parse(String(form.get("title") ?? file.name));
    const entityType = z.string().trim().min(1).max(80).optional().parse(String(form.get("entityType") ?? "") || undefined);
    const entityId = z.string().trim().min(1).max(120).optional().parse(String(form.get("entityId") ?? "") || undefined);
    const supersedesDocumentId = OptionalUuid.parse(String(form.get("supersedesDocumentId") ?? "") || undefined);
    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await uploadDocument({ filename: file.name, mimeType: file.type || "application/octet-stream", bytes, documentType, title, entityType, entityId, supersedesDocumentId, userId: actor.userId, permissions: actor.permissions });
    return NextResponse.json(result, { status: 201 });
  } catch (error) { return safeApiError(error); }
}
