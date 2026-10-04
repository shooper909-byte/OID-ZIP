import { headers } from "next/headers";
import { forbidden, unauthorized } from "next/navigation";
import { actorForServerRequest, type Actor } from "../auth";
import { logSecurityEvent } from "../security/events";
import { hasPermission, requirePermission, type PermissionKey } from "../permissions";

export async function actorForPage(): Promise<Actor> {
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "oid.invalid";
  const protocol = incoming.get("x-forwarded-proto") ?? "https";
  return actorForServerRequest(new Request(`${protocol}://${host}/`, { headers: incoming }));
}

export type PageAccessOutcome = "unauthorized" | "forbidden" | "unexpected";

export function classifyPageAccessError(error: unknown): PageAccessOutcome {
  const message = error instanceof Error ? error.message : "";
  if (message.startsWith("UNAUTHORIZED:")) return "unauthorized";
  if (message.startsWith("FORBIDDEN:")) return "forbidden";
  return "unexpected";
}

export function interruptForPageAccess(error: unknown): never {
  const outcome = classifyPageAccessError(error);
  // 401s are already logged with their reason code and reference by the auth layer.
  if (outcome === "forbidden") logSecurityEvent({ event: "PAGE_ACCESS_DENIED", outcome: "DENY", reason: (error as Error).message });
  if (outcome === "unauthorized") unauthorized();
  if (outcome === "forbidden") forbidden();
  throw error;
}

export async function actorForPageOrInterrupt(): Promise<Actor> {
  try { return await actorForPage(); }
  catch (error) { return interruptForPageAccess(error); }
}

export async function requirePagePermission(permission: PermissionKey): Promise<Actor> {
  const actor = await actorForPageOrInterrupt();
  try { requirePermission(actor.permissions, permission); }
  catch (error) { return interruptForPageAccess(error); }
  return actor;
}

export async function requirePagePermissions(permissions: readonly PermissionKey[]): Promise<Actor> {
  const actor = await actorForPageOrInterrupt();
  try { for (const permission of permissions) requirePermission(actor.permissions, permission); }
  catch (error) { return interruptForPageAccess(error); }
  return actor;
}

export function actorCanRead(actor: Actor, permission: PermissionKey): boolean {
  return hasPermission(actor.permissions, permission);
}

export function actorCanReadAll(actor: Actor, permissions: readonly PermissionKey[]): boolean {
  return permissions.every((permission) => hasPermission(actor.permissions, permission));
}
