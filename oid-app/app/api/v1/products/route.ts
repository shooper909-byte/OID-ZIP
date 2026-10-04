import { NextResponse } from "next/server";
import { z } from "zod";
import { actorForServerRequest, requireHumanActor } from "../../../../lib/auth";
import { ProductCreateInputSchema } from "../../../../lib/products/input";
import { assertMutationOrigin, safeApiError } from "../../../../lib/security/request";
import { consumeRateLimit } from "../../../../lib/security/rate-limit";
import { createProduct } from "../../../../services/products/create";

const Body = z.object({ input: ProductCreateInputSchema, reason: z.string().trim().min(12).max(1000).optional() }).strict();

export async function POST(request: Request) {
  try {
    assertMutationOrigin(request);
    const actor = await actorForServerRequest(request);
    requireHumanActor(actor);
    if (!consumeRateLimit(`product-create:${actor.userId}`, 30, 60_000).allowed) throw new Error("RATE_LIMITED");
    const body = Body.parse(await request.json());
    const created = await createProduct({ input: body.input, reason: body.reason, userId: actor.userId, permissions: actor.permissions });
    return NextResponse.json({ product: { id: created.product.id, oidCode: created.product.oidCode, status: created.product.status }, sku: { id: created.sku.id, oidCode: created.sku.oidCode, internalSku: created.sku.internalSku } }, { status: 201 });
  } catch (error) { return safeApiError(error, 409); }
}

