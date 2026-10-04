import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { identityMode, validateProductionEnvironment } from "./lib/config/env";
import { applySecurityHeaders } from "./lib/security/request";
import { sessionTokenFromRequest, validateInternalSession } from "./lib/auth/session";

function sameSecret(supplied: string | undefined, expected: string): boolean {
  if (!supplied) return false;
  const suppliedBytes = Buffer.from(supplied), expectedBytes = Buffer.from(expected);
  return suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes);
}

function finish(response: NextResponse): NextResponse { return applySecurityHeaders(response); }

export async function proxy(req: NextRequest) {
  if (process.env.NODE_ENV !== "production") return finish(NextResponse.next());
  const errors = validateProductionEnvironment();
  if (errors.length) return finish(new NextResponse("OID production configuration is invalid.", { status: 503 }));

  const path = req.nextUrl.pathname;
  if (path === "/api/v1/health/live" || path === "/api/v1/health/ready") return finish(NextResponse.next());
  if (path === "/login" || (path === "/api/v1/session" && req.method === "POST")) {
    return finish(NextResponse.next());
  }

  let authorized = false;
  if (identityMode() === "internal-token") {
    const expected = process.env.OID_INTERNAL_ACCESS_TOKEN!;
    const cookie = sessionTokenFromRequest(req);
    const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    authorized = await validateInternalSession(cookie) || sameSecret(bearer, expected);
  } else {
    authorized = sameSecret(req.headers.get("x-oid-proxy-secret") ?? undefined, process.env.OID_TRUSTED_PROXY_SECRET!);
  }

  if (authorized) return finish(NextResponse.next());
  if (path.startsWith("/api/")) return finish(NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }));
  return finish(NextResponse.redirect(new URL("/login", req.url)));
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
