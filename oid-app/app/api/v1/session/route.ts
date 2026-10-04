import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "../../../../lib/database";
import { nextOidCode } from "../../../../lib/oid-identifiers/counter";
import { identityMode } from "../../../../lib/config/env";
import { createInternalSession, INTERNAL_SESSION_COOKIE, revokeInternalSession, sessionTokenFromRequest } from "../../../../lib/auth/session";
import { actorForServerRequest } from "../../../../lib/auth";
import { assertMutationOrigin, clientKey, safeApiError } from "../../../../lib/security/request";
import { consumeRateLimit } from "../../../../lib/security/rate-limit";
import { logSecurityEvent } from "../../../../lib/security/events";

function same(a: string, b: string) { const aa = Buffer.from(a), bb = Buffer.from(b); return aa.length === bb.length && timingSafeEqual(aa, bb); }

async function auditLogin(eventType: "LOGIN" | "LOGOUT" | "FAILED_LOGIN", userId: string | undefined, ipAddress: string, reason: string) {
  await db.auditLog.create({ data: { oidCode: await nextOidCode(db, "AUD"), eventType, userId, entityType: "SESSION", entityId: userId ?? "anonymous", ipAddress, reason } });
}

export async function POST(request: Request) {
  try {
    if (identityMode() !== "internal-token") throw new Error("UNAUTHORIZED:SSO_LOGIN_REQUIRED");
    assertMutationOrigin(request);
    const key = clientKey(request);
    const rate = consumeRateLimit(`login:${key}`, 5, 15 * 60_000);
    if (!rate.allowed) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
    const form = await request.formData();
    const supplied = String(form.get("token") ?? "");
    const expected = process.env.OID_INTERNAL_ACCESS_TOKEN ?? "";
    const userId = process.env.OID_INTERNAL_USER_ID;
    if (!expected || !same(supplied, expected)) {
      await auditLogin("FAILED_LOGIN", undefined, key, "Invalid internal access credential");
      logSecurityEvent({ event: "LOGIN", outcome: "DENY", route: "/api/v1/session", reason: "INVALID_CREDENTIAL" });
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const hours = Math.min(8, Math.max(1, Number(process.env.OID_SESSION_HOURS ?? 8)));
    if (!userId) throw new Error("PRODUCTION_CONFIG_INVALID:MISSING_ENV:OID_INTERNAL_USER_ID");
    const session = await createInternalSession(userId, hours);
    await auditLogin("LOGIN", userId, key, "Internal pilot login");
    const response = NextResponse.redirect(new URL("/command-center", request.url), 303);
    response.cookies.set(INTERNAL_SESSION_COOKIE, session.token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", expires: session.expiresAt });
    return response;
  } catch (error) { return safeApiError(error, 401); }
}

export async function DELETE(request: Request) {
  try {
    assertMutationOrigin(request);
    const actor = await actorForServerRequest(request);
    const revoked = await revokeInternalSession(sessionTokenFromRequest(request), actor.userId);
    if (!revoked) throw new Error("UNAUTHORIZED:SESSION_NOT_ACTIVE");
    await auditLogin("LOGOUT", actor.userId, clientKey(request), "Session terminated");
    const response = NextResponse.json({ ok: true });
    response.cookies.set(INTERNAL_SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
    return response;
  } catch (error) { return safeApiError(error, 401); }
}
