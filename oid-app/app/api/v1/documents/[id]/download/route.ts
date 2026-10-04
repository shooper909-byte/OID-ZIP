import { NextResponse } from "next/server";
import { z } from "zod";
import { actorForServerRequest } from "../../../../../../lib/auth";
import { downloadDocument } from "../../../../../../services/documents/download";
import { safeApiError } from "../../../../../../lib/security/request";

const Id = z.string().uuid();

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await actorForServerRequest(request);
    const { id } = await params;
    const { document, bytes } = await downloadDocument({ documentId: Id.parse(id), userId: actor.userId, permissions: actor.permissions });
    const filename = document.originalFilename.replace(/[^A-Za-z0-9._-]/g, "_");
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, private",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) { return safeApiError(error, 404); }
}
