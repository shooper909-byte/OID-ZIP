import { NextResponse } from "next/server";
import { z } from "zod";
import { actorForServerRequest } from "../../../../../lib/auth";
import { queryOid } from "../../../../../services/intelligence/query";
import { assertMutationOrigin, safeApiError } from "../../../../../lib/security/request";
import { consumeRateLimit } from "../../../../../lib/security/rate-limit";

const Body = z.object({ question: z.string().trim().min(3).max(1000) }).strict();
export async function POST(request: Request) {
  try {
    assertMutationOrigin(request);
    const actor = await actorForServerRequest(request);
    if (!consumeRateLimit(`intelligence:${actor.userId}`, 30, 60_000).allowed) throw new Error("RATE_LIMITED");
    const body = Body.parse(await request.json());
    return NextResponse.json(await queryOid({ question: body.question, userId: actor.userId, permissions: actor.permissions }));
  } catch (error) { return safeApiError(error); }
}
