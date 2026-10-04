import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "../../lib/database";
import { actorForEntraIdentity, type EntraIdentity, type EntraPolicy } from "../../lib/auth/entra";
import { PERMISSIONS } from "../../lib/permissions";

const tenantId = "595ff05a-ce72-406d-82ff-e3f924d7f0e1";
const pilotGroup = "da7ae7e7-0bb3-4bdf-a411-75726b97b418";
// Synthetic per-run IDs so the suite can run repeatedly against one database.
const ownerObjectId = randomUUID();
const ownerEmail = `owner-${ownerObjectId.slice(0, 8)}@example.invalid`;
const policy: EntraPolicy = { allowedTenantId: tenantId, requireMfa: true, ownerObjectIds: [ownerObjectId], ownerGroupId: pilotGroup, ownerRole: "FOUNDER" };
const owner = (overrides: Partial<EntraIdentity> = {}): EntraIdentity => ({ objectId: ownerObjectId, tenantId, email: ownerEmail, name: "Synthetic Owner", groups: [pilotGroup], mfa: true, reference: "A1B2C3D4E5F6", ...overrides });

describe.sequential("Entra object-ID authorization and owner bootstrap", { timeout: 60_000 }, () => {
  afterAll(async () => { await db.$disconnect(); });

  it("denies the approved owner before bootstrap when tenant, MFA or group proof is missing, without creating a user", async () => {
    await expect(actorForEntraIdentity(owner({ tenantId: randomUUID() }), policy)).rejects.toThrow("UNAUTHORIZED:WRONG_TENANT");
    await expect(actorForEntraIdentity(owner({ mfa: false }), policy)).rejects.toThrow("UNAUTHORIZED:MFA_CLAIM_MISSING");
    await expect(actorForEntraIdentity(owner({ groups: [] }), policy)).rejects.toThrow("UNAUTHORIZED:GROUP_MISSING");
    await expect(actorForEntraIdentity(owner({ groups: undefined }), policy)).rejects.toThrow("UNAUTHORIZED:GROUP_MISSING");
    await expect(actorForEntraIdentity(owner({ objectId: undefined }), policy)).rejects.toThrow("UNAUTHORIZED:NO_PRINCIPAL");
    expect(await db.user.findUnique({ where: { authProviderId: ownerObjectId } })).toBeNull();
  });

  it("bootstraps the approved owner on first verified sign-in with FOUNDER and audit evidence (concurrent first requests)", async () => {
    const actors = await Promise.all([actorForEntraIdentity(owner(), policy), actorForEntraIdentity(owner(), policy), actorForEntraIdentity(owner(), policy)]);
    expect(new Set(actors.map((actor) => actor.userId)).size).toBe(1);
    const [actor] = actors;
    expect(actor.roles).toEqual(["FOUNDER"]);
    expect(actor.permissions.has(PERMISSIONS.LOT_READ)).toBe(true);
    const user = await db.user.findUniqueOrThrow({ where: { authProviderId: ownerObjectId } });
    expect(user).toMatchObject({ status: "ACTIVE", email: ownerEmail, mfaEnabled: true });
    const audit = await db.auditLog.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
    expect(audit.map((event) => event.eventType)).toEqual(expect.arrayContaining(["CREATE", "PERMISSION_CHANGE", "LOGIN"]));
    expect(audit.filter((event) => event.eventType === "CREATE")).toHaveLength(1);
  });

  it("keeps working on refresh and on a new sign-in after sign-out / restart, with no further bootstrap", async () => {
    const before = await db.auditLog.count({ where: { eventType: { in: ["CREATE", "PERMISSION_CHANGE"] }, user: { authProviderId: ownerObjectId } } });
    for (let request = 0; request < 3; request += 1) expect((await actorForEntraIdentity(owner({ reference: undefined }), policy)).roles).toEqual(["FOUNDER"]);
    // New process / new deployment: state is entirely in PostgreSQL, keyed by object ID; email claim changes are irrelevant.
    expect((await actorForEntraIdentity(owner({ email: "different@example.invalid", groups: undefined }), policy)).email).toBe(ownerEmail);
    const after = await db.auditLog.count({ where: { eventType: { in: ["CREATE", "PERMISSION_CHANGE"] }, user: { authProviderId: ownerObjectId } } });
    expect(after).toBe(before);
  });

  it("never auto-provisions or promotes an unapproved authenticated identity", async () => {
    const stranger = randomUUID();
    await expect(actorForEntraIdentity(owner({ objectId: stranger, email: `stranger-${stranger.slice(0, 8)}@example.invalid` }), policy)).rejects.toThrow("UNAUTHORIZED:LOCAL_USER_MISSING");
    expect(await db.user.findUnique({ where: { authProviderId: stranger } })).toBeNull();
    // Even presenting the owner's email does not let another object ID take over the owner record.
    await expect(actorForEntraIdentity(owner({ objectId: stranger }), policy)).rejects.toThrow("UNAUTHORIZED:LOCAL_USER_MISSING");
  });

  it("links a pre-existing owner record created by email instead of duplicating it", async () => {
    const legacyOwnerId = randomUUID();
    const legacyEmail = `legacy-owner-${legacyOwnerId.slice(0, 8)}@example.invalid`;
    const legacy = await db.user.create({ data: { email: legacyEmail, status: "INVITED" } });
    const actor = await actorForEntraIdentity(owner({ objectId: legacyOwnerId, email: legacyEmail }), { ...policy, ownerObjectIds: [legacyOwnerId] });
    expect(actor.userId).toBe(legacy.id);
    expect(actor.roles).toEqual(["FOUNDER"]);
    expect(await db.user.findUniqueOrThrow({ where: { id: legacy.id } })).toMatchObject({ authProviderId: legacyOwnerId, status: "ACTIVE" });
  });

  it("respects an administrator disabling the owner record (no silent re-bootstrap)", async () => {
    await db.user.update({ where: { authProviderId: ownerObjectId }, data: { status: "DISABLED" } });
    await expect(actorForEntraIdentity(owner(), policy)).rejects.toThrow("UNAUTHORIZED:LOCAL_USER_DISABLED");
    await db.user.update({ where: { authProviderId: ownerObjectId }, data: { status: "ACTIVE" } });
  });
});
