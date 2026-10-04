import { resolve } from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { actorFromRoles } from "../../lib/auth";
import { PERMISSIONS } from "../../lib/permissions";
import { validateProductionEnvironment } from "../../lib/config/env";
import { assertMutationOrigin, safeApiError } from "../../lib/security/request";
import { clearRateLimitsForTests, consumeRateLimit } from "../../lib/security/rate-limit";
import { assertSafeStorageKey, LocalPrivateStorage } from "../../lib/storage";
import { proxy } from "../../proxy";

afterEach(() => vi.unstubAllEnvs());

describe("production environment validation", () => {
  it("rejects missing, short, public-storage, and non-TLS production configuration", () => {
    const errors = validateProductionEnvironment({
      NODE_ENV: "production", DATABASE_URL: "postgresql://oid:password@example.com/oid",
      OID_STORAGE_ROOT: `${process.cwd()}/public/documents`, OID_INTERNAL_USER_ID: "id",
      OID_INTERNAL_USER_EMAIL: "owner@example.invalid", OID_INTERNAL_ACCESS_TOKEN: "short",
      OID_ALLOWED_ORIGIN: "http://example.com",
    } as NodeJS.ProcessEnv);
    expect(errors).toContain("DATABASE_TLS_REQUIRED");
    expect(errors).toContain("OID_STORAGE_ROOT_MUST_NOT_BE_PUBLIC");
    expect(errors).toContain("OID_INTERNAL_ACCESS_TOKEN_TOO_SHORT");
    expect(errors).toContain("OID_ALLOWED_ORIGIN_MUST_USE_HTTPS");
    expect(errors).toContain("OID_DATA_MODE_MUST_BE_CONTROLLED_PRODUCT_STAGING");
  });
});

describe("request security", () => {
  beforeEach(() => clearRateLimitsForTests());
  function stubValidInternalProductionEnvironment() {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgresql://oid:password@127.0.0.1:55432/oid?schema=public");
    vi.stubEnv("OID_STORAGE_ROOT", resolve(".tmp/private-session-test"));
    vi.stubEnv("OID_IDENTITY_MODE", "internal-token");
    vi.stubEnv("OID_INTERNAL_USER_ID", "00000000-0000-0000-0000-000000000001");
    vi.stubEnv("OID_INTERNAL_USER_EMAIL", "founder@oid.internal");
    vi.stubEnv("OID_ALLOWED_ORIGIN", "https://oid.example.invalid");
    vi.stubEnv("OID_INTERNAL_ACCESS_TOKEN", "original-session-key-material-0000000000000000");
    vi.stubEnv("OID_DATA_MODE", "controlled-product-staging");
  }
  it("rejects cookie-authenticated cross-origin mutations but permits bearer clients", () => {
    process.env.OID_ALLOWED_ORIGIN = "https://oid.example.invalid";
    expect(() => assertMutationOrigin(new Request("https://oid.example.invalid/api", { method: "POST", headers: { origin: "https://evil.example" } }))).toThrow("CSRF_ORIGIN_REJECTED");
    expect(() => assertMutationOrigin(new Request("https://oid.example.invalid/api", { method: "POST", headers: { authorization: "Bearer token" } }))).not.toThrow();
  });
  it("enforces bounded rate limits", () => {
    expect(consumeRateLimit("login:test", 2, 60_000, 1000).allowed).toBe(true);
    expect(consumeRateLimit("login:test", 2, 60_000, 1001).allowed).toBe(true);
    expect(consumeRateLimit("login:test", 2, 60_000, 1002).allowed).toBe(false);
  });
  it("invalidates an existing internal bearer when its access secret is revoked", async () => {
    const originalToken = "original-session-key-material-0000000000000000";
    stubValidInternalProductionEnvironment();
    const request = new NextRequest("https://oid.example.invalid/api/v1/search?q=OID", {
      headers: { authorization: `Bearer ${originalToken}` },
    });
    expect((await proxy(request)).status).toBe(200);
    vi.stubEnv("OID_INTERNAL_ACCESS_TOKEN", "rotated-session-key-material-00000000000000000");
    expect((await proxy(request)).status).toBe(401);
  });
  it("redirects unauthenticated pages to login and returns 401 for unauthenticated APIs", async () => {
    stubValidInternalProductionEnvironment();
    const page = await proxy(new NextRequest("https://oid.example.invalid/suppliers"));
    expect(page.status).toBe(307);
    expect(page.headers.get("location")).toBe("https://oid.example.invalid/login");
    const api = await proxy(new NextRequest("https://oid.example.invalid/api/v1/search?q=OID"));
    expect(api.status).toBe(401);
  });
  it("returns 503 before authentication when synthetic data mode is absent", async () => {
    stubValidInternalProductionEnvironment();
    vi.stubEnv("OID_DATA_MODE", "");
    const response = await proxy(new NextRequest("https://oid.example.invalid/suppliers"));
    expect(response.status).toBe(503);
    expect(await response.text()).toBe("OID production configuration is invalid.");
  });
  it("redacts unexpected production exception details from responses and security logs", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const sensitiveDetail = ["sensitive", "database", "detail"].join("-");
    const response = safeApiError(new Error(sensitiveDetail), 500);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "REQUEST_REJECTED" });
    expect(warning.mock.calls.flat().join(" ")).not.toContain(sensitiveDetail);
    expect(warning.mock.calls.flat().join(" ")).toContain("REQUEST_REJECTED");
    warning.mockRestore();
  });
});

describe("RBAC privilege separation", () => {
  it("keeps administrative, operational, commercial, auditor, and AI roles out of quality release", () => {
    for (const role of ["SYSTEM_ADMIN", "OPERATIONS", "COMMERCIAL", "AUDITOR", "AI_ASSISTANT"]) {
      expect(actorFromRoles("id", `${role}@example.invalid`, [role]).permissions.has(PERMISSIONS.LOT_RELEASE)).toBe(false);
    }
  });
  it("prevents AI from supplier qualification, purchasing, release, allocation, and critical closure", () => {
    const ai = actorFromRoles("id", "ai@example.invalid", ["AI_ASSISTANT"]);
    for (const permission of [PERMISSIONS.SUPPLIER_QUALIFY, PERMISSIONS.PURCHASE_ORDER_WRITE, PERMISSIONS.PAYMENT_AUTHORIZE, PERMISSIONS.LOT_RELEASE, PERMISSIONS.INVENTORY_ALLOCATE, PERMISSIONS.EXCEPTION_CLOSE]) {
      expect(ai.permissions.has(permission)).toBe(false);
    }
    expect(ai.human).toBe(false);
  });
  it("prevents Operations from reviewing tests, releasing lots, or closing quality exceptions", () => {
    const operations = actorFromRoles("id", "operations@example.invalid", ["OPERATIONS"]);
    for (const permission of [PERMISSIONS.TEST_REVIEW, PERMISSIONS.LOT_RELEASE, PERMISSIONS.EXCEPTION_CLOSE, PERMISSIONS.CAPA_CLOSE]) {
      expect(operations.permissions.has(permission)).toBe(false);
    }
  });
  it("keeps auditors read-only and commercial users away from supplier/document records", () => {
    const auditor = actorFromRoles("id", "audit@example.invalid", ["AUDITOR"]);
    expect([...auditor.permissions].every((permission) => permission.endsWith(".read") || permission === PERMISSIONS.AUDIT_READ)).toBe(true);
    const commercial = actorFromRoles("id", "commercial@example.invalid", ["COMMERCIAL"]);
    expect(commercial.permissions.has(PERMISSIONS.SUPPLIER_READ)).toBe(false);
    expect(commercial.permissions.has(PERMISSIONS.DOCUMENT_READ)).toBe(false);
    expect(commercial.permissions.has(PERMISSIONS.TEST_READ)).toBe(false);
    expect(commercial.permissions.has(PERMISSIONS.AUDIT_READ)).toBe(false);
    expect(commercial.permissions.has(PERMISSIONS.ADMIN_USERS)).toBe(false);
  });
});

describe("private storage boundaries", () => {
  it("rejects traversal outside the configured root", async () => {
    const storage = new LocalPrivateStorage(`${process.cwd()}/.tmp/private-storage-test`);
    await expect(storage.get("../../outside.txt")).rejects.toThrow("STORAGE_KEY_OUTSIDE_PRIVATE_ROOT");
  });
  it("rejects absolute, empty-segment, and parent Azure Blob object keys", () => {
    for (const key of ["/absolute", "a//b", "a/../b", "a/./b"]) expect(() => assertSafeStorageKey(key)).toThrow("STORAGE_KEY_INVALID");
    expect(assertSafeStorageKey("2026/DOC-001/evidence.pdf")).toBe("2026/DOC-001/evidence.pdf");
  });
  it("requires a managed-identity Blob endpoint and container for the Azure backend", () => {
    const errors = validateProductionEnvironment({
      NODE_ENV: "production", DATABASE_URL: "postgresql://oid:password@example.com/oid?sslmode=require",
      OID_STORAGE_BACKEND: "azure-blob", OID_BLOB_SERVICE_URL: "http://invalid.example", OID_IDENTITY_MODE: "trusted-proxy",
      OID_TRUSTED_PROXY_SECRET: "a".repeat(32), OID_IDENTITY_EMAIL_HEADER: "x-oid-user-email", OID_REQUIRE_MFA: "true",
      OID_ALLOWED_ORIGIN: "https://oid.example.invalid",
      OID_DATA_MODE: "controlled-product-staging",
    } as NodeJS.ProcessEnv);
    expect(errors).toContain("MISSING_ENV:OID_BLOB_CONTAINER");
    expect(errors).toContain("OID_BLOB_SERVICE_URL_INVALID");
  });
});
