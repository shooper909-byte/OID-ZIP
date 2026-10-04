import { NextResponse } from "next/server";
import { z } from "zod";
import { actorForServerRequest, requireHumanActor } from "../../../../../../lib/auth";
import { db } from "../../../../../../lib/database";
import { assertCriticalExceptionCanClose } from "../../../../../../lib/control";
import { requirePermission, PERMISSIONS } from "../../../../../../lib/permissions";
import { nextOidCode } from "../../../../../../lib/oid-identifiers/counter";
import { assertMutationOrigin, safeApiError } from "../../../../../../lib/security/request";
import { consumeRateLimit } from "../../../../../../lib/security/rate-limit";

const Id = z.string().uuid();
const Body = z.object({ resolution: z.string().trim().min(12).max(2000) }).strict();
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertMutationOrigin(request);
    const actor = await actorForServerRequest(request);
    requireHumanActor(actor);
    requirePermission(actor.permissions, PERMISSIONS.EXCEPTION_CLOSE);
    if (!consumeRateLimit(`exception-close:${actor.userId}`, 20, 60_000).allowed) throw new Error("RATE_LIMITED");
    const { id: rawId } = await params;
    const id = Id.parse(rawId);
    const body = Body.parse(await request.json());
    const [current, evidenceCount] = await Promise.all([
      db.exception.findUniqueOrThrow({ where: { id } }),
      db.documentLink.count({ where: { entityType: "EXCEPTION", entityId: id } }),
    ]);
    assertCriticalExceptionCanClose({ severity: current.severity, resolution: body.resolution, evidenceCount, reviewerAuthorized: true });
    const result = await db.$transaction(async (tx) => {
      const updated = await tx.exception.update({ where: { id }, data: { status: "CLOSED", resolution: body.resolution, resolvedAt: new Date(), resolvedBy: actor.userId } });
      await tx.auditLog.create({ data: { oidCode: await nextOidCode(tx, "AUD"), eventType: "STATUS_CHANGE", userId: actor.userId, entityType: "EXCEPTION", entityId: id, previousValues: { status: current.status }, newValues: { status: "CLOSED", evidenceCount }, reason: body.resolution } });
      return updated;
    });
    return NextResponse.json(result);
  } catch (error) { return safeApiError(error, 409); }
}
