import { NextResponse } from "next/server";
import { actorForServerRequest, requireHumanActor } from "../../../../../../lib/auth";
import { assertMutationOrigin, safeApiError } from "../../../../../../lib/security/request";
import { consumeRateLimit } from "../../../../../../lib/security/rate-limit";
import { stageProductImport } from "../../../../../../services/migration/products";

export async function POST(request: Request) {
  try {
    assertMutationOrigin(request);
    const actor = await actorForServerRequest(request);
    requireHumanActor(actor);
    if (!consumeRateLimit(`product-import-preview:${actor.userId}`, 10, 60_000).allowed) throw new Error("RATE_LIMITED");
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 1_100_000) throw new Error("CSV_SIZE_LIMIT_EXCEEDED");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("CSV_FILE_REQUIRED");
    if (file.type && !["text/csv", "application/csv", "application/vnd.ms-excel", "text/plain"].includes(file.type.toLowerCase())) throw new Error("CSV_FILE_TYPE_REQUIRED");
    if (file.size > 1_000_000) throw new Error("CSV_SIZE_LIMIT_EXCEEDED");
    const sourceSystem = String(form.get("source_system") || "").trim();
    if (!sourceSystem || sourceSystem.length > 200) throw new Error("CSV_SOURCE_SYSTEM_REQUIRED");
    const result = await stageProductImport({
      sourceSystem, neutralSkus: form.get("neutral_skus") === "on",
      name: String(form.get("name") || file.name), sourceName: file.name,
      bytes: Buffer.from(await file.arrayBuffer()), userId: actor.userId, permissions: actor.permissions,
    });
    return NextResponse.json(result, { status: result.idempotent ? 200 : 201 });
  } catch (error) { return safeApiError(error, 409); }
}
