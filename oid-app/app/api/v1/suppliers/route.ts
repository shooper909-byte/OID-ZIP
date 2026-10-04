import { NextResponse } from "next/server";
import { z } from "zod";
import { actorForServerRequest, requireHumanActor } from "../../../../lib/auth";
import { assertMutationOrigin, safeApiError } from "../../../../lib/security/request";
import { consumeRateLimit } from "../../../../lib/security/rate-limit";
import { SupplierInputSchema } from "../../../../lib/suppliers/input";
import { createSupplier } from "../../../../services/suppliers/create";

const Body = z.object({ input: SupplierInputSchema, reason: z.string().trim().min(12).max(1000).optional() }).strict();

export async function POST(request: Request) {
  try {
    assertMutationOrigin(request);
    const actor = await actorForServerRequest(request);
    requireHumanActor(actor);
    if (!consumeRateLimit(`supplier-create:${actor.userId}`, 20, 60_000).allowed) throw new Error("RATE_LIMITED");
    const body = Body.parse(await request.json());
    const supplier = await createSupplier({ input: body.input, reason: body.reason, userId: actor.userId, permissions: actor.permissions });
    return NextResponse.json({ id: supplier.id, oidCode: supplier.oidCode, qualificationStatus: supplier.qualificationStatus }, { status: 201 });
  } catch (error) { return safeApiError(error, 409); }
}
