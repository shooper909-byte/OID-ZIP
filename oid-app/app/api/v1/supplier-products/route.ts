import { NextResponse } from "next/server";
import { z } from "zod";
import { actorForServerRequest, requireHumanActor } from "../../../../lib/auth";
import { assertMutationOrigin, safeApiError } from "../../../../lib/security/request";
import { consumeRateLimit } from "../../../../lib/security/rate-limit";
import { SupplierProductInputSchema } from "../../../../lib/supplier-products/input";
import { createSupplierProduct } from "../../../../services/supplier-products/create";

const Body = z.object({ input: SupplierProductInputSchema, reason: z.string().trim().min(12).max(1000).optional() }).strict();

export async function POST(request: Request) {
  try {
    assertMutationOrigin(request);
    const actor = await actorForServerRequest(request);
    requireHumanActor(actor);
    if (!consumeRateLimit(`supplier-product-create:${actor.userId}`, 40, 60_000).allowed) throw new Error("RATE_LIMITED");
    const body = Body.parse(await request.json());
    const mapping = await createSupplierProduct({ input: body.input, reason: body.reason, userId: actor.userId, permissions: actor.permissions });
    return NextResponse.json({ id: mapping.id, qualificationStatus: mapping.qualificationStatus, documentationStatus: mapping.documentationStatus }, { status: 201 });
  } catch (error) { return safeApiError(error, 409); }
}

