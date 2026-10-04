import http from "node:http";
import { randomBytes } from "node:crypto";

const listenPort = Number(process.env.OID_BRIDGE_LISTEN_PORT ?? "8080");
const targetPort = Number(process.env.OID_BRIDGE_TARGET_PORT ?? "3000");
const allowedTenant = (process.env.OID_ALLOWED_TENANT_ID ?? "").trim().toLowerCase();
const allowedAudiences = new Set((process.env.OID_ALLOWED_AUDIENCES ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean));
const proxySecret = process.env.OID_TRUSTED_PROXY_SECRET ?? "";
const healthPaths = new Set(["/api/v1/health/live", "/api/v1/health/ready"]);
const MAX_GROUPS = 200;

if (!Number.isInteger(listenPort) || !Number.isInteger(targetPort) || !allowedTenant || proxySecret.length < 32) {
  throw new Error("AZURE_IDENTITY_BRIDGE_CONFIG_INVALID");
}

const objectIdTypes = new Set(["oid", "http://schemas.microsoft.com/identity/claims/objectidentifier"]);
const tenantTypes = new Set(["tid", "http://schemas.microsoft.com/identity/claims/tenantid"]);
const audienceTypes = new Set(["aud"]);
const groupTypes = new Set(["groups", "http://schemas.microsoft.com/ws/2008/06/identity/claims/groups"]);
const nameTypes = new Set(["name"]);
// Email is secondary metadata only. Prefer a real mailbox over a B2B guest UPN (`...#EXT#@tenant.onmicrosoft.com`).
const emailTypePreference = ["email", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress", "preferred_username", "upn", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn"];
const mfaTypes = new Set(["amr", "http://schemas.microsoft.com/claims/authnmethodsreferences"]);
const mfaValues = new Set(["mfa", "ngcmfa", "fido"]);
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export class BridgeAuthError extends Error {
  constructor(code) { super(code); this.code = code; }
}

export function newReference() {
  return randomBytes(6).toString("hex").toUpperCase();
}

export function principal(headers, config = { allowedTenant, allowedAudiences }) {
  const encoded = headers["x-ms-client-principal"];
  if (typeof encoded !== "string" || !encoded) throw new BridgeAuthError("NO_PRINCIPAL");
  let value;
  try { value = JSON.parse(Buffer.from(encoded, "base64").toString("utf8")); } catch { throw new BridgeAuthError("NO_PRINCIPAL"); }
  if (!value || !Array.isArray(value.claims)) throw new BridgeAuthError("NO_PRINCIPAL");
  const claims = value.claims.map((claim) => ({ type: String(claim.typ ?? claim.type ?? "").toLowerCase(), value: String(claim.val ?? claim.value ?? "").trim() }));
  const first = (types) => claims.find((claim) => types.has(claim.type))?.value;

  const platformObjectId = typeof headers["x-ms-client-principal-id"] === "string" ? headers["x-ms-client-principal-id"].trim().toLowerCase() : undefined;
  const objectId = (first(objectIdTypes) ?? platformObjectId ?? "").toLowerCase();
  if (!GUID.test(objectId)) throw new BridgeAuthError("NO_PRINCIPAL");

  const tenant = first(tenantTypes)?.toLowerCase();
  if (tenant !== config.allowedTenant) throw new BridgeAuthError("WRONG_TENANT");

  if (config.allowedAudiences.size) {
    const audiences = claims.filter((claim) => audienceTypes.has(claim.type)).map((claim) => claim.value.toLowerCase());
    if (!audiences.some((audience) => config.allowedAudiences.has(audience))) throw new BridgeAuthError("WRONG_AUDIENCE");
  }

  const mfa = claims.some((claim) => mfaTypes.has(claim.type) && claim.value.toLowerCase().split(/[\s,;]+/).some((method) => mfaValues.has(method)));
  if (!mfa) throw new BridgeAuthError("MFA_CLAIM_MISSING");

  let email;
  for (const type of emailTypePreference) {
    const candidate = claims.find((claim) => claim.type === type && claim.value.includes("@") && !claim.value.includes("#EXT#"))?.value.toLowerCase();
    if (candidate) { email = candidate; break; }
  }

  const groupValues = claims.filter((claim) => groupTypes.has(claim.type)).map((claim) => claim.value.toLowerCase()).filter((group) => GUID.test(group));
  // A missing groups claim (not emitted, or overage) is forwarded as "unknown", never as "member of nothing".
  const groups = groupValues.length ? [...new Set(groupValues)].slice(0, MAX_GROUPS) : undefined;
  const name = first(nameTypes)?.replace(/[^\p{L}\p{N} .'-]/gu, "").slice(0, 120) || undefined;

  return { objectId, tenant, email, name, groups };
}

function cleanHeaders(headers) {
  const clean = {};
  for (const [name, value] of Object.entries(headers)) {
    const lower = name.toLowerCase();
    if (lower.startsWith("x-oid-") || lower.startsWith("x-ms-token-") || lower.startsWith("x-ms-client-principal") || lower === "connection" || lower === "transfer-encoding" || value === undefined) continue;
    clean[lower] = value;
  }
  return clean;
}

function logDecision(event) {
  const line = JSON.stringify({ timestamp: new Date().toISOString(), category: "security", event: "BRIDGE_AUTH_DECISION", ...event });
  if (event.outcome === "ALLOW") return;
  console.warn(line);
}

function denyPage(reference) {
  const support = `OID-AUTH-401-${reference}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OID sign-in not completed</title></head>` +
    `<body style="font-family:system-ui;max-width:520px;margin:12vh auto;padding:0 16px"><p style="text-transform:uppercase;letter-spacing:.08em;font-size:12px">OID access control</p>` +
    `<h1>Sign-in not completed</h1><p>Microsoft sign-in succeeded, but OID could not accept this sign-in for this application.</p>` +
    `<p>If support is needed, provide this reference only:</p><p><code>${support}</code></p>` +
    `<p><a href="/.auth/logout?post_logout_redirect_uri=%2F">Sign out and try a different account</a></p></body></html>`;
}

export function createBridgeServer() {
  return http.createServer((request, response) => {
    const path = new URL(request.url ?? "/", "http://bridge.invalid").pathname;
    const reference = newReference();
    let identity;
    try {
      if (!healthPaths.has(path)) identity = principal(request.headers);
    } catch (error) {
      const code = error instanceof BridgeAuthError ? error.code : "NO_PRINCIPAL";
      logDecision({ outcome: "DENY", reason: code, reference: `OID-AUTH-401-${reference}`, route: path });
      if (path.startsWith("/api/")) {
        response.writeHead(401, { "content-type": "application/json", "cache-control": "no-store" });
        response.end(JSON.stringify({ error: "UNAUTHORIZED", reference: `OID-AUTH-401-${reference}` }));
      } else {
        response.writeHead(401, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'" });
        response.end(denyPage(reference));
      }
      return;
    }

    const headers = cleanHeaders(request.headers);
    headers.host = `127.0.0.1:${targetPort}`;
    headers["x-oid-auth-ref"] = reference;
    if (identity) {
      headers["x-oid-user-oid"] = identity.objectId;
      headers["x-oid-tenant-id"] = identity.tenant;
      if (identity.email) headers["x-oid-user-email"] = identity.email;
      if (identity.name) headers["x-oid-user-name"] = identity.name;
      if (identity.groups) headers["x-oid-groups"] = identity.groups.join(",");
      headers["x-oid-mfa"] = "true";
      headers["x-oid-proxy-secret"] = proxySecret;
    }

    const upstream = http.request({ hostname: "127.0.0.1", port: targetPort, method: request.method, path: request.url, headers }, (upstreamResponse) => {
      const responseHeaders = { ...upstreamResponse.headers };
      delete responseHeaders.connection;
      delete responseHeaders["transfer-encoding"];
      response.writeHead(upstreamResponse.statusCode ?? 502, responseHeaders);
      upstreamResponse.pipe(response);
    });
    upstream.on("error", () => {
      if (!response.headersSent) response.writeHead(502, { "content-type": "application/json", "cache-control": "no-store" });
      response.end('{"error":"UPSTREAM_UNAVAILABLE"}');
    });
    request.pipe(upstream);
  });
}

createBridgeServer().listen(listenPort, "0.0.0.0");
