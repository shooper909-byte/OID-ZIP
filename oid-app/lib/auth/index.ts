import { timingSafeEqual } from "node:crypto";
import { db } from "../database";
import { ROLE_PERMISSIONS } from "../permissions";
import { identityMode } from "../config/env";
import { logSecurityEvent } from "../security/events";
import { actorForEntraIdentity, entraIdentityFromHeaders, supportReference } from "./entra";

export type Actor = { userId: string; email: string; roles: string[]; permissions: Set<string>; human: boolean };

export function actorFromRoles(userId: string, email: string, roles: string[]): Actor {
  const permissions = new Set<string>();
  for (const role of roles) for (const permission of ROLE_PERMISSIONS[role] ?? []) permissions.add(permission);
  return { userId, email, roles, permissions, human: !roles.includes("AI_ASSISTANT") };
}

export function developmentActor(): Actor {
  if (process.env.NODE_ENV === "production") throw new Error("DEVELOPMENT_ACTOR_DISABLED_IN_PRODUCTION");
  return actorFromRoles("00000000-0000-0000-0000-000000000001", "founder@local.oid", ["FOUNDER"]);
}

function sameSecret(a: string | null, b: string): boolean {
  if (!a) return false;
  const aa = Buffer.from(a), bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

async function databaseActor(where: { id?: string; email?: string }): Promise<Actor> {
  const user = await db.user.findFirst({
    where,
    include: { roles: { include: { role: true } } },
  });
  if (!user || user.status !== "ACTIVE") throw new Error("UNAUTHORIZED:USER_INACTIVE_OR_UNKNOWN");
  const roles = user.roles.map((assignment) => assignment.role.name);
  if (!roles.length) throw new Error("UNAUTHORIZED:NO_ACTIVE_ROLE");
  return actorFromRoles(user.id, user.email, roles);
}

export async function actorForServerRequest(request: Request): Promise<Actor> {
  if (process.env.NODE_ENV !== "production") return developmentActor();
  if (identityMode() === "internal-token") {
    const id = process.env.OID_INTERNAL_USER_ID;
    if (!id) throw new Error("PRODUCTION_CONFIG_INVALID:MISSING_ENV:OID_INTERNAL_USER_ID");
    return databaseActor({ id });
  }

  const secret = process.env.OID_TRUSTED_PROXY_SECRET ?? "";
  if (!sameSecret(request.headers.get("x-oid-proxy-secret"), secret)) {
    logSecurityEvent({ event: "AUTH_DECISION", outcome: "DENY", reason: "UNTRUSTED_IDENTITY_PROXY", reference: supportReference(401, request.headers.get("x-oid-auth-ref")) });
    throw new Error("UNAUTHORIZED:UNTRUSTED_IDENTITY_PROXY");
  }
  // Primary key is the immutable Entra object ID; email is secondary metadata only.
  return actorForEntraIdentity(entraIdentityFromHeaders(request.headers));
}

export function requireHumanActor(actor: Actor): void {
  if (!actor.human) throw new Error("FORBIDDEN:HUMAN_AUTHORITY_REQUIRED");
}
