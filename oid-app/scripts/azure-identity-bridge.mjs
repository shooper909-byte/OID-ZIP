import http from "node:http";

const listenPort = Number(process.env.OID_BRIDGE_LISTEN_PORT ?? "8080");
const targetPort = Number(process.env.OID_BRIDGE_TARGET_PORT ?? "3000");
const allowedTenant = (process.env.OID_ALLOWED_TENANT_ID ?? "").trim().toLowerCase();
const proxySecret = process.env.OID_TRUSTED_PROXY_SECRET ?? "";
const healthPaths = new Set(["/api/v1/health/live", "/api/v1/health/ready"]);

if (!Number.isInteger(listenPort) || !Number.isInteger(targetPort) || !allowedTenant || proxySecret.length < 32) {
  throw new Error("AZURE_IDENTITY_BRIDGE_CONFIG_INVALID");
}

const tenantTypes = new Set(["tid", "http://schemas.microsoft.com/identity/claims/tenantid"]);
const emailTypes = new Set(["preferred_username", "email", "upn", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn"]);
const mfaTypes = new Set(["amr", "http://schemas.microsoft.com/claims/authnmethodsreferences"]);

function principal(headers) {
  const encoded = headers["x-ms-client-principal"];
  if (typeof encoded !== "string" || !encoded) throw new Error("MISSING_PLATFORM_PRINCIPAL");
  let value;
  try { value = JSON.parse(Buffer.from(encoded, "base64").toString("utf8")); } catch { throw new Error("INVALID_PLATFORM_PRINCIPAL"); }
  if (!value || !Array.isArray(value.claims)) throw new Error("INVALID_PLATFORM_PRINCIPAL");
  const claims = value.claims.map((claim) => ({ type: String(claim.typ ?? claim.type ?? "").toLowerCase(), value: String(claim.val ?? claim.value ?? "") }));
  const tenant = claims.find((claim) => tenantTypes.has(claim.type))?.value.toLowerCase();
  const email = claims.find((claim) => emailTypes.has(claim.type))?.value.trim().toLowerCase();
  const mfa = claims.some((claim) => mfaTypes.has(claim.type) && claim.value.toLowerCase().split(/[\s,;]+/).includes("mfa"));
  if (tenant !== allowedTenant) throw new Error("TENANT_NOT_ALLOWED");
  if (!email || !email.includes("@")) throw new Error("IDENTITY_EMAIL_MISSING");
  if (!mfa) throw new Error("MFA_NOT_PROVEN");
  return { email };
}

function cleanHeaders(headers) {
  const clean = {};
  for (const [name, value] of Object.entries(headers)) {
    const lower = name.toLowerCase();
    if (lower.startsWith("x-oid-") || lower.startsWith("x-ms-token-") || lower === "x-ms-client-principal" || lower === "connection" || lower === "transfer-encoding" || value === undefined) continue;
    clean[lower] = value;
  }
  return clean;
}

const server = http.createServer((request, response) => {
  const path = new URL(request.url ?? "/", "http://bridge.invalid").pathname;
  let identity;
  try {
    if (!healthPaths.has(path)) identity = principal(request.headers);
  } catch {
    response.writeHead(401, { "content-type": "application/json", "cache-control": "no-store" });
    response.end('{"error":"UNAUTHORIZED"}');
    return;
  }

  const headers = cleanHeaders(request.headers);
  headers.host = `127.0.0.1:${targetPort}`;
  if (identity) {
    headers["x-oid-user-email"] = identity.email;
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

server.listen(listenPort, "0.0.0.0");
