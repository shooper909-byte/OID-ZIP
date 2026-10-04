import { isAbsolute, resolve, sep } from "node:path";

export type IdentityMode = "internal-token" | "trusted-proxy";
export const REQUIRED_DATA_MODE = "controlled-product-staging" as const;

export function identityMode(env = process.env): IdentityMode {
  return env.OID_IDENTITY_MODE === "trusted-proxy" ? "trusted-proxy" : "internal-token";
}

export function validateProductionEnvironment(env = process.env): string[] {
  const errors: string[] = [];
  if (env.OID_DATA_MODE !== REQUIRED_DATA_MODE) errors.push("OID_DATA_MODE_MUST_BE_CONTROLLED_PRODUCT_STAGING");
  const storageBackend = env.OID_STORAGE_BACKEND?.trim().toLowerCase() || "local";
  const required = ["DATABASE_URL"];
  for (const key of required) if (!env[key]?.trim()) errors.push(`MISSING_ENV:${key}`);

  if (!['local', 'azure-blob'].includes(storageBackend)) errors.push("OID_STORAGE_BACKEND_INVALID");
  if (storageBackend === "local" && !env.OID_STORAGE_ROOT?.trim()) errors.push("MISSING_ENV:OID_STORAGE_ROOT");
  if (storageBackend === "azure-blob") {
    if (!env.OID_BLOB_SERVICE_URL?.trim()) errors.push("MISSING_ENV:OID_BLOB_SERVICE_URL");
    if (!env.OID_BLOB_CONTAINER?.trim()) errors.push("MISSING_ENV:OID_BLOB_CONTAINER");
    if (env.OID_BLOB_SERVICE_URL) {
      try {
        const endpoint = new URL(env.OID_BLOB_SERVICE_URL);
        if (endpoint.protocol !== "https:" || !endpoint.hostname.endsWith(".blob.core.windows.net")) errors.push("OID_BLOB_SERVICE_URL_INVALID");
      } catch {
        errors.push("OID_BLOB_SERVICE_URL_INVALID");
      }
    }
  }

  if (env.DATABASE_URL) {
    try {
      const database = new URL(env.DATABASE_URL);
      if (!database.protocol.startsWith("postgres")) errors.push("DATABASE_URL_NOT_POSTGRESQL");
      const local = ["localhost", "127.0.0.1", "::1"].includes(database.hostname);
      if (!local && database.searchParams.get("sslmode") !== "require") errors.push("DATABASE_TLS_REQUIRED");
    } catch {
      errors.push("DATABASE_URL_INVALID");
    }
  }

  const storageRoot = storageBackend === "local" ? env.OID_STORAGE_ROOT?.trim() : undefined;
  if (storageRoot) {
    if (!isAbsolute(storageRoot)) errors.push("OID_STORAGE_ROOT_MUST_BE_ABSOLUTE");
    const resolved = resolve(storageRoot);
    const publicRoot = resolve(process.cwd(), "public");
    if (resolved === publicRoot || resolved.startsWith(`${publicRoot}${sep}`)) errors.push("OID_STORAGE_ROOT_MUST_NOT_BE_PUBLIC");
  }

  const mode = identityMode(env);
  if (mode === "internal-token") {
    if (!env.OID_INTERNAL_USER_ID?.trim()) errors.push("MISSING_ENV:OID_INTERNAL_USER_ID");
    if (!env.OID_INTERNAL_USER_EMAIL?.trim()) errors.push("MISSING_ENV:OID_INTERNAL_USER_EMAIL");
    if ((env.OID_INTERNAL_ACCESS_TOKEN?.length ?? 0) < 32) errors.push("OID_INTERNAL_ACCESS_TOKEN_TOO_SHORT");
  } else {
    if ((env.OID_TRUSTED_PROXY_SECRET?.length ?? 0) < 32) errors.push("OID_TRUSTED_PROXY_SECRET_TOO_SHORT");
    if (!env.OID_IDENTITY_EMAIL_HEADER?.trim()) errors.push("MISSING_ENV:OID_IDENTITY_EMAIL_HEADER");
    if (env.OID_REQUIRE_MFA !== "true") errors.push("OID_REQUIRE_MFA_MUST_BE_TRUE");
    const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (env.OID_ALLOWED_TENANT_ID && !guid.test(env.OID_ALLOWED_TENANT_ID.trim())) errors.push("OID_ALLOWED_TENANT_ID_INVALID");
    if (env.OID_OWNER_BOOTSTRAP_OBJECT_IDS && !env.OID_OWNER_BOOTSTRAP_OBJECT_IDS.split(",").every((id) => guid.test(id.trim()))) errors.push("OID_OWNER_BOOTSTRAP_OBJECT_IDS_INVALID");
    if (env.OID_OWNER_BOOTSTRAP_GROUP_ID && !guid.test(env.OID_OWNER_BOOTSTRAP_GROUP_ID.trim())) errors.push("OID_OWNER_BOOTSTRAP_GROUP_ID_INVALID");
    if (env.OID_OWNER_BOOTSTRAP_OBJECT_IDS && !env.OID_ALLOWED_TENANT_ID) errors.push("OID_OWNER_BOOTSTRAP_REQUIRES_OID_ALLOWED_TENANT_ID");
  }

  if (env.OID_ALLOWED_ORIGIN) {
    try {
      const origin = new URL(env.OID_ALLOWED_ORIGIN);
      const local = ["localhost", "127.0.0.1", "::1"].includes(origin.hostname);
      if (origin.protocol !== "https:" && !(local && env.OID_ALLOW_INSECURE_LOCALHOST === "true")) errors.push("OID_ALLOWED_ORIGIN_MUST_USE_HTTPS");
    } catch {
      errors.push("OID_ALLOWED_ORIGIN_INVALID");
    }
  } else {
    errors.push("MISSING_ENV:OID_ALLOWED_ORIGIN");
  }

  return [...new Set(errors)];
}

export function assertProductionEnvironment(env = process.env): void {
  if (env.NODE_ENV !== "production") return;
  const errors = validateProductionEnvironment(env);
  if (errors.length) throw new Error(`PRODUCTION_CONFIG_INVALID:${errors.join(",")}`);
}
