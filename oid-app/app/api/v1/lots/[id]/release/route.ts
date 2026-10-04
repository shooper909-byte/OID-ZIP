import { NextResponse } from "next/server";
import { z } from "zod";
import { actorForServerRequest, requireHumanActor } from "../../../../../../lib/auth";
import { releaseLotWithPrisma } from "../../../../../../services/lots/prisma-release";
import { assertMutationOrigin, safeApiError } from "../../../../../../lib/security/request";
import { consumeRateLimit } from "../../../../../../lib/security/rate-limit";

const Body = z.object({ reason: z.string().trim().min(12).max(1000) }).strict();
const Id = z.string().uuid();
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertMutationOrigin(request);
    const actor = await actorForServerRequest(request);
    requireHumanActor(actor);
    if (!consumeRateLimit(`release:${actor.userId}`, 20, 60_000).allowed) throw new Error("RATE_LIMITED");
    const { id } = await params;
    const body = Body.parse(await request.json());
    return NextResponse.json(await releaseLotWithPrisma({ lotId: Id.parse(id), userId: actor.userId, permissions: actor.permissions, reason: body.reason }));
  } catch (error) { return safeApiError(error, 409); }
}
