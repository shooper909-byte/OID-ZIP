import { Prisma, type PrismaClient } from "@prisma/client";
import { db as defaultDb } from "../database";
import { nextOidCode } from "../oid-identifiers/counter";
import { logSecurityEvent } from "../security/events";
import { actorFromRoles, type Actor } from "./index";

/** Server-side reason codes. Only the opaque OID-AUTH-401-<ref> reference ever reaches the browser. */
export type AuthFailureCode =
  | "NO_PRINCIPAL"
  | "UNTRUSTED_IDENTITY_PROXY"
  | "WRONG_TENANT"
  | "WRONG_AUDIENCE"
  | "MFA_CLAIM_MISSING"
  | "GROUP_MISSING"
  | "LOCAL_USER_MISSING"
  | "LOCAL_USER_DISABLED"
  | "LOCAL_USER_NO_ROLE"
  | "SESSION_CREATION_FAILED";

export type EntraIdentity = {
  objectId?: string;
  tenantId?: string;
  email?: string;
  name?: string;
  /** undefined = groups claim not present (unknown), [] = present but empty. */
  groups?: string[];
  mfa: boolean;
  reference?: string;
};

export type EntraPolicy = {
  allowedTenantId?: string;
  requireMfa: boolean;
  ownerObjectIds: string[];
  ownerGroupId?: string;
  ownerRole: string;
};

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const REFERENCE = /^[A-F0-9]{12}$/;
const LOGIN_AUDIT_INTERVAL_MS = 8 * 60 * 60 * 1000;

export function authFailure(code: AuthFailureCode): Error {
  return new Error(`UNAUTHORIZED:${code}`);
}

export function supportReference(status: 401 | 403, reference: string | undefined | null): string | undefined {
  const ref = reference?.trim().toUpperCase();
  return ref && REFERENCE.test(ref) ? `OID-AUTH-${status}-${ref}` : undefined;
}

function guidList(value: string | undefined): string[] {
  return (value ?? "").split(",").map((item) => item.trim().toLowerCase()).filter((item) => GUID.test(item));
}

export function entraPolicyFromEnv(env = process.env): EntraPolicy {
  return {
    allowedTenantId: env.OID_ALLOWED_TENANT_ID?.trim().toLowerCase() || undefined,
    requireMfa: env.OID_REQUIRE_MFA === "true",
    ownerObjectIds: guidList(env.OID_OWNER_BOOTSTRAP_OBJECT_IDS),
    ownerGroupId: guidList(env.OID_OWNER_BOOTSTRAP_GROUP_ID)[0],
    ownerRole: env.OID_OWNER_BOOTSTRAP_ROLE?.trim() || "FOUNDER",
  };
}

export function entraIdentityFromHeaders(headers: Headers): EntraIdentity {
  const groupsHeader = headers.get("x-oid-groups");
  return {
    objectId: headers.get("x-oid-user-oid")?.trim().toLowerCase() || undefined,
    tenantId: headers.get("x-oid-tenant-id")?.trim().toLowerCase() || undefined,
    email: headers.get(process.env.OID_IDENTITY_EMAIL_HEADER?.toLowerCase() || "x-oid-user-email")?.trim().toLowerCase() || undefined,
    name: headers.get("x-oid-user-name")?.trim() || undefined,
    groups: groupsHeader === null ? undefined : guidList(groupsHeader),
    mfa: headers.get("x-oid-mfa") === "true",
    reference: headers.get("x-oid-auth-ref") ?? undefined,
  };
}

type UserWithRoles = Prisma.UserGetPayload<{ include: { roles: { include: { role: true } } } }>;
const withRoles = { roles: { include: { role: true } } } as const;

async function audit(tx: Prisma.TransactionClient | PrismaClient, data: Omit<Prisma.AuditLogUncheckedCreateInput, "oidCode">) {
  await tx.auditLog.create({ data: { ...data, oidCode: await nextOidCode(tx, "AUD") } });
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * Controlled owner bootstrap: only an object ID explicitly listed in OID_OWNER_BOOTSTRAP_OBJECT_IDS,
 * already validated for tenant/MFA (and group, when configured), may have its missing OID user created
 * or an unlinked legacy record (same email) linked. Never applies to any other identity.
 */
async function bootstrapOwner(store: PrismaClient, identity: Required<Pick<EntraIdentity, "objectId">> & EntraIdentity, policy: EntraPolicy): Promise<UserWithRoles> {
  return store.$transaction(async (tx) => {
    const role = await tx.role.upsert({ where: { name: policy.ownerRole }, update: {}, create: { name: policy.ownerRole, description: `OID ${policy.ownerRole} role` } });
    const legacy = identity.email ? await tx.user.findUnique({ where: { email: identity.email } }) : null;
    if (legacy?.authProviderId && legacy.authProviderId !== identity.objectId) throw authFailure("LOCAL_USER_MISSING");
    if (legacy && legacy.status !== "ACTIVE" && legacy.status !== "INVITED") throw authFailure("LOCAL_USER_DISABLED");

    const user = legacy
      ? await tx.user.update({ where: { id: legacy.id }, data: { authProviderId: identity.objectId, status: "ACTIVE", mfaEnabled: true, lastLoginAt: new Date() } })
      : await tx.user.create({ data: {
          authProviderId: identity.objectId,
          email: identity.email ?? `${identity.objectId}@entra.oid.invalid`,
          displayName: identity.name ?? "OID Owner",
          status: "ACTIVE",
          mfaEnabled: true,
          lastLoginAt: new Date(),
        } });
    const existingAssignment = await tx.userRole.findUnique({ where: { userId_roleId: { userId: user.id, roleId: role.id } } });
    if (!existingAssignment) await tx.userRole.create({ data: { userId: user.id, roleId: role.id, assignedBy: user.id } });

    await audit(tx, {
      eventType: legacy ? "UPDATE" : "CREATE", userId: user.id, entityType: "USER", entityId: user.id,
      previousValues: legacy ? { authProviderId: legacy.authProviderId, status: legacy.status } : Prisma.JsonNull,
      newValues: { authProviderId: identity.objectId, status: "ACTIVE", tenantId: identity.tenantId ?? null },
      reason: legacy ? "Entra owner bootstrap: linked approved owner object ID to existing OID user" : "Entra owner bootstrap: created approved owner OID user on first verified sign-in",
    });
    if (!existingAssignment) {
      await audit(tx, {
        eventType: "PERMISSION_CHANGE", userId: user.id, entityType: "USER_ROLE", entityId: user.id,
        newValues: { role: policy.ownerRole }, reason: "Entra owner bootstrap: approved owner role assigned (OID_OWNER_BOOTSTRAP_OBJECT_IDS)",
      });
    }
    await audit(tx, { eventType: "LOGIN", userId: user.id, entityType: "SESSION", entityId: user.id, reason: "Entra sign-in (owner bootstrap)" });
    return tx.user.findUniqueOrThrow({ where: { id: user.id }, include: withRoles });
  });
}

/** Legacy records created before object-ID linkage: link once by exact email, never create, never grant roles. */
async function linkLegacyUser(store: PrismaClient, identity: Required<Pick<EntraIdentity, "objectId">> & EntraIdentity): Promise<UserWithRoles | null> {
  if (!identity.email) return null;
  const legacy = await store.user.findUnique({ where: { email: identity.email } });
  if (!legacy || legacy.authProviderId) return null;
  return store.$transaction(async (tx) => {
    const linked = await tx.user.updateMany({ where: { id: legacy.id, authProviderId: null }, data: { authProviderId: identity.objectId } });
    if (linked.count !== 1) throw authFailure("LOCAL_USER_MISSING");
    await audit(tx, {
      eventType: "UPDATE", userId: legacy.id, entityType: "USER", entityId: legacy.id,
      previousValues: { authProviderId: null }, newValues: { authProviderId: identity.objectId },
      reason: "Linked Entra object ID to existing OID user by verified email (one-time migration)",
    });
    return tx.user.findUniqueOrThrow({ where: { id: legacy.id }, include: withRoles });
  });
}

async function resolve(identity: EntraIdentity, policy: EntraPolicy, store: PrismaClient): Promise<{ actor: Actor; bootstrapped: boolean }> {
  const objectId = identity.objectId;
  if (!objectId || !GUID.test(objectId)) throw authFailure("NO_PRINCIPAL");
  if (policy.allowedTenantId && identity.tenantId !== policy.allowedTenantId) throw authFailure("WRONG_TENANT");
  if (policy.requireMfa && !identity.mfa) throw authFailure("MFA_CLAIM_MISSING");
  const verified = { ...identity, objectId };

  let bootstrapped = false;
  let user: UserWithRoles | null;
  try {
    user = await store.user.findUnique({ where: { authProviderId: objectId }, include: withRoles });
    if (!user && policy.ownerObjectIds.includes(objectId)) {
      if (policy.ownerGroupId && !identity.groups?.includes(policy.ownerGroupId)) throw authFailure("GROUP_MISSING");
      try {
        user = await bootstrapOwner(store, verified, policy);
        bootstrapped = true;
      } catch (error) {
        // Concurrent first requests (page + assets) can race; the loser re-reads the winner's record.
        if (!isUniqueViolation(error)) throw error;
        user = await store.user.findUnique({ where: { authProviderId: objectId }, include: withRoles });
      }
    }
    if (!user) user = await linkLegacyUser(store, verified);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("UNAUTHORIZED:")) throw error;
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), category: "security", event: "AUTH_LOOKUP_ERROR", reference: identity.reference, detail: error instanceof Error ? error.name : "unknown" }));
    throw authFailure("SESSION_CREATION_FAILED");
  }

  if (!user) throw authFailure("LOCAL_USER_MISSING");
  if (user.status !== "ACTIVE") throw authFailure("LOCAL_USER_DISABLED");
  const roles = user.roles.map((assignment) => assignment.role.name);
  if (!roles.length) throw authFailure("LOCAL_USER_NO_ROLE");

  if (!bootstrapped && (!user.lastLoginAt || Date.now() - user.lastLoginAt.getTime() > LOGIN_AUDIT_INTERVAL_MS)) {
    // Easy Auth owns the browser session; record one LOGIN per session window rather than per request.
    const stamped = await store.user.updateMany({ where: { id: user.id, lastLoginAt: user.lastLoginAt }, data: { lastLoginAt: new Date() } }).catch(() => ({ count: 0 }));
    if (stamped.count === 1) await audit(store, { eventType: "LOGIN", userId: user.id, entityType: "SESSION", entityId: user.id, reason: "Entra sign-in" }).catch(() => undefined);
  }
  return { actor: actorFromRoles(user.id, user.email, roles), bootstrapped };
}

export async function actorForEntraIdentity(identity: EntraIdentity, policy = entraPolicyFromEnv(), store: PrismaClient = defaultDb): Promise<Actor> {
  const reference = supportReference(401, identity.reference);
  try {
    const { actor, bootstrapped } = await resolve(identity, policy, store);
    if (bootstrapped) logSecurityEvent({ event: "OWNER_BOOTSTRAP", outcome: "ALLOW", actorId: actor.userId, reason: "APPROVED_OWNER_OBJECT_ID", reference: identity.reference });
    return actor;
  } catch (error) {
    const code = error instanceof Error && error.message.startsWith("UNAUTHORIZED:") ? error.message.slice("UNAUTHORIZED:".length) : "SESSION_CREATION_FAILED";
    logSecurityEvent({ event: "AUTH_DECISION", outcome: "DENY", reason: code, reference });
    throw error instanceof Error && error.message.startsWith("UNAUTHORIZED:") ? error : authFailure("SESSION_CREATION_FAILED");
  }
}
