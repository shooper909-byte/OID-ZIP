import { describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
  forbidden: vi.fn(() => { throw new Error("TEST_HTTP_403"); }),
  unauthorized: vi.fn(() => { throw new Error("TEST_HTTP_401"); }),
}));
vi.mock("next/navigation", () => navigation);
import { createAccessReference } from "../../app/_components/AccessDenied";
import { actorFromRoles } from "../../lib/auth";
import { actorCanReadAll, classifyPageAccessError, interruptForPageAccess } from "../../lib/auth/page-actor";
import { PERMISSIONS } from "../../lib/permissions";

describe("page access semantics", () => {
  it("maps authenticated permission denial to the 403 interrupt", () => {
    expect(classifyPageAccessError(new Error("FORBIDDEN:supplier.read"))).toBe("forbidden");
    expect(() => interruptForPageAccess(new Error("FORBIDDEN:supplier.read"))).toThrow("TEST_HTTP_403");
    expect(navigation.forbidden).toHaveBeenCalledOnce();
  });
  it("maps missing MFA and unknown users to the 401 interrupt", () => {
    for (const message of ["UNAUTHORIZED:MFA_REQUIRED", "UNAUTHORIZED:USER_INACTIVE_OR_UNKNOWN"]) {
      expect(classifyPageAccessError(new Error(message))).toBe("unauthorized");
      expect(() => interruptForPageAccess(new Error(message))).toThrow("TEST_HTTP_401");
    }
    expect(navigation.unauthorized).toHaveBeenCalledTimes(2);
  });
  it("rethrows unexpected failures without exposing them as access outcomes", () => {
    const unexpected = new Error("database detail");
    expect(classifyPageAccessError(unexpected)).toBe("unexpected");
    expect(() => interruptForPageAccess(unexpected)).toThrow(unexpected);
  });
  it("creates a bounded opaque correlation reference", () => {
    expect(createAccessReference(403, "12345678-1234-1234-1234-123456789abc")).toBe("OID-AUTH-403-123456781234");
  });
  it("preserves authorized access", () => {
    const founder = actorFromRoles("id", "founder@example.invalid", ["FOUNDER"]);
    expect(actorCanReadAll(founder, [PERMISSIONS.SUPPLIER_READ, PERMISSIONS.LOT_READ, PERMISSIONS.DECISION_READ])).toBe(true);
  });
});
