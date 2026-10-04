import { NextResponse } from "next/server";
import { z } from "zod";
import { actorForServerRequest, requireHumanActor } from "../../../../../../../lib/auth";
import { assertMutationOrigin, safeApiError } from "../../../../../../../lib/security/request";
import { consumeRateLimit } from "../../../../../../../lib/security/rate-limit";
import { commitSupplierImport } from "../../../../../../../services/migration";

const Id = z.string().uuid();
const Body = z.object({ confirmation: z.literal("COMMIT SUPPLIER IMPORT"), reason: z.string().trim().min(12).max(1000) }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertMutationOrigin(request);
    const actor = await actorForServerRequest(request);
    requireHumanActor(actor);
    if (!consumeRateLimit(`supplier-import-commit:${actor.userId}`, 5, 60_000).allowed) throw new Error("RATE_LIMITED");
    const { id } = await params;
    const body = Body.parse(await request.json());
    return NextResponse.json(await commitSupplierImport({ batchId: Id.parse(id), userId: actor.userId, permissions: actor.permissions, ...body }));
  } catch (error) { return safeApiError(error, 409); }
}
