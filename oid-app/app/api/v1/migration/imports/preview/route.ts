import { NextResponse } from "next/server";
import { actorForServerRequest, requireHumanActor } from "../../../../../../lib/auth";
import { assertMutationOrigin, safeApiError } from "../../../../../../lib/security/request";
import { consumeRateLimit } from "../../../../../../lib/security/rate-limit";
import { stageSupplierImport } from "../../../../../../services/migration";

export async function POST(request: Request) {
  try {
    assertMutationOrigin(request);
    const actor = await actorForServerRequest(request);
    requireHumanActor(actor);
    if (!consumeRateLimit(`supplier-import-preview:${actor.userId}`, 10, 60_000).allowed) throw new Error("RATE_LIMITED");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("CSV_FILE_REQUIRED");
    if (file.type && !["text/csv", "application/csv", "application/vnd.ms-excel", "text/plain"].includes(file.type.toLowerCase())) throw new Error("CSV_FILE_TYPE_REQUIRED");
    const result = await stageSupplierImport({
      name: String(form.get("name") || file.name), sourceName: file.name,
      bytes: Buffer.from(await file.arrayBuffer()), userId: actor.userId, permissions: actor.permissions,
    });
    return NextResponse.json(result, { status: result.idempotent ? 200 : 201 });
  } catch (error) { return safeApiError(error, 409); }
}
