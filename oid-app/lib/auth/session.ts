import { createHash, randomBytes } from "node:crypto";
import { db } from "../database";

export const INTERNAL_SESSION_COOKIE = "oid_access_token";

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function sessionTokenFromRequest(request: Request): string | undefined {
  const cookie = request.headers.get("cookie") ?? "";
  const encoded = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${INTERNAL_SESSION_COOKIE}=`))?.slice(INTERNAL_SESSION_COOKIE.length + 1);
  if (!encoded) return undefined;
  try { return decodeURIComponent(encoded); } catch { return undefined; }
}

export async function createInternalSession(userId: string, hours: number): Promise<{ token: string; expiresAt: Date }> {
  const user = await db.user.findFirst({ where: { id: userId, status: "ACTIVE" }, select: { id: true } });
  if (!user) throw new Error("UNAUTHORIZED:USER_INACTIVE_OR_UNKNOWN");
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  await db.authSession.create({ data: { userId, tokenHash: hashSessionToken(token), expiresAt } });
  return { token, expiresAt };
}

export async function validateInternalSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const session = await db.authSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: { revokedAt: true, expiresAt: true, user: { select: { status: true } } },
  });
  return Boolean(session && !session.revokedAt && session.expiresAt > new Date() && session.user.status === "ACTIVE");
}

export async function revokeInternalSession(token: string | undefined, userId: string): Promise<boolean> {
  if (!token) return false;
  const result = await db.authSession.updateMany({
    where: { tokenHash: hashSessionToken(token), userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count === 1;
}
