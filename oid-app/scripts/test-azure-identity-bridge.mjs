import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import { fileURLToPath } from "node:url";

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

const OBJECT_ID = "bab63204-7cb9-465d-a074-56124afeaa98";
const CLIENT_ID = "3374f580-d9d4-4d42-8e44-cbcc95fa6317";
const GROUP_ID = "da7ae7e7-0bb3-4bdf-a411-75726b97b418";

function encodedPrincipal({ tenant = "00000000-0000-0000-0000-000000000123", email = "quality@example.invalid", mfa = true, objectId = OBJECT_ID, audience = CLIENT_ID, groups = [GROUP_ID], guestUpnFirst = false } = {}) {
  const claims = [{ typ: "aud", val: audience }, { typ: "http://schemas.microsoft.com/identity/claims/tenantid", val: tenant }];
  if (objectId) claims.push({ typ: "http://schemas.microsoft.com/identity/claims/objectidentifier", val: objectId });
  if (guestUpnFirst) claims.push({ typ: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn", val: "labs_oligopolypeptides.com#EXT#@labsoligopolypeptides.onmicrosoft.com" });
  claims.push({ typ: "preferred_username", val: email });
  for (const group of groups) claims.push({ typ: "groups", val: group });
  if (mfa) claims.push({ typ: "http://schemas.microsoft.com/claims/authnmethodsreferences", val: "pwd" }, { typ: "http://schemas.microsoft.com/claims/authnmethodsreferences", val: "mfa" });
  return Buffer.from(JSON.stringify({ claims }), "utf8").toString("base64");
}

async function reservePort() {
  const server = http.createServer();
  const port = await listen(server);
  await close(server);
  return port;
}

const received = [];
const upstream = http.createServer((request, response) => {
  received.push({ path: request.url, headers: request.headers });
  response.writeHead(200, { "content-type": "application/json" });
  response.end('{"ok":true}');
});

const targetPort = await listen(upstream);
const bridgePort = await reservePort();
const tenant = "00000000-0000-0000-0000-000000000123";
const proxySecret = Buffer.alloc(32, 7).toString("base64");
const child = spawn(process.execPath, [fileURLToPath(new URL("azure-identity-bridge.mjs", import.meta.url))], {
  env: {
    ...process.env,
    OID_BRIDGE_LISTEN_PORT: String(bridgePort),
    OID_BRIDGE_TARGET_PORT: String(targetPort),
    OID_ALLOWED_TENANT_ID: tenant,
    OID_TRUSTED_PROXY_SECRET: proxySecret,
    OID_ALLOWED_AUDIENCES: `${CLIENT_ID},api://${CLIENT_ID}`,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let childError = "";
let childLog = "";
child.stderr.on("data", (chunk) => { childError += String(chunk); childLog += String(chunk); });
child.stdout.on("data", (chunk) => { childLog += String(chunk); });

try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${bridgePort}/api/v1/health/live`);
      if (response.ok) { ready = true; break; }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.equal(ready, true, `bridge did not start: ${childError}`);

  const valid = await fetch(`http://127.0.0.1:${bridgePort}/protected`, {
    headers: {
      "x-ms-client-principal": encodedPrincipal(),
      "x-oid-user-email": "attacker@example.invalid",
      "x-oid-proxy-secret": "attacker-value",
    },
  });
  assert.equal(valid.status, 200);
  const protectedRequest = received.find((entry) => entry.path === "/protected");
  assert.equal(protectedRequest.headers["x-oid-user-email"], "quality@example.invalid");
  assert.equal(protectedRequest.headers["x-oid-mfa"], "true");
  assert.equal(protectedRequest.headers["x-oid-proxy-secret"], proxySecret);
  assert.equal(protectedRequest.headers["x-ms-client-principal"], undefined);
  assert.equal(protectedRequest.headers["x-oid-user-oid"], OBJECT_ID);
  assert.equal(protectedRequest.headers["x-oid-tenant-id"], tenant);
  assert.equal(protectedRequest.headers["x-oid-groups"], GROUP_ID);
  assert.match(protectedRequest.headers["x-oid-auth-ref"], /^[A-F0-9]{12}$/);

  // B2B guest: the #EXT# UPN is never used as the email; object ID is the key.
  const guest = await fetch(`http://127.0.0.1:${bridgePort}/guest`, {
    headers: { "x-ms-client-principal": encodedPrincipal({ email: "labs@oligopolypeptides.com", guestUpnFirst: true }), "x-oid-auth-ref": "AAAAAAAAAAAA" },
  });
  assert.equal(guest.status, 200);
  const guestRequest = received.find((entry) => entry.path === "/guest");
  assert.equal(guestRequest.headers["x-oid-user-email"], "labs@oligopolypeptides.com");
  assert.equal(guestRequest.headers["x-oid-user-oid"], OBJECT_ID);
  assert.notEqual(guestRequest.headers["x-oid-auth-ref"], "AAAAAAAAAAAA");

  const noGroups = await fetch(`http://127.0.0.1:${bridgePort}/nogroups`, { headers: { "x-ms-client-principal": encodedPrincipal({ groups: [] }) } });
  assert.equal(noGroups.status, 200);
  assert.equal(received.find((entry) => entry.path === "/nogroups").headers["x-oid-groups"], undefined);

  const noObjectId = await fetch(`http://127.0.0.1:${bridgePort}/protected`, { headers: { "x-ms-client-principal": encodedPrincipal({ objectId: "" }) } });
  assert.equal(noObjectId.status, 401);
  const wrongAudience = await fetch(`http://127.0.0.1:${bridgePort}/api/v1/search`, { headers: { "x-ms-client-principal": encodedPrincipal({ audience: "00000000-0000-0000-0000-000000000abc" }) } });
  assert.equal(wrongAudience.status, 401);
  const wrongAudienceBody = await wrongAudience.json();
  assert.match(wrongAudienceBody.reference, /^OID-AUTH-401-[A-F0-9]{12}$/);
  assert.ok(childLog.includes(`"reason":"WRONG_AUDIENCE","reference":"${wrongAudienceBody.reference}"`), "denial reference must correlate with server-side reason code");

  const wrongTenant = await fetch(`http://127.0.0.1:${bridgePort}/protected`, {
    headers: { "x-ms-client-principal": encodedPrincipal({ tenant: "00000000-0000-0000-0000-000000000999" }) },
  });
  assert.equal(wrongTenant.status, 401);

  const noMfa = await fetch(`http://127.0.0.1:${bridgePort}/protected`, {
    headers: { "x-ms-client-principal": encodedPrincipal({ mfa: false }) },
  });
  assert.equal(noMfa.status, 401);
  assert.match(await noMfa.text(), /OID-AUTH-401-[A-F0-9]{12}/);
  assert.ok(childLog.includes('"reason":"MFA_CLAIM_MISSING"'));

  const noIdentity = await fetch(`http://127.0.0.1:${bridgePort}/protected`);
  assert.equal(noIdentity.status, 401);

  const healthRequest = received.find((entry) => entry.path === "/api/v1/health/live");
  assert.ok(healthRequest);
  assert.equal(healthRequest.headers["x-oid-user-email"], undefined);
  assert.equal(healthRequest.headers["x-oid-proxy-secret"], undefined);

  console.log("Azure identity bridge security test: PASS");
} finally {
  child.kill();
  await close(upstream);
}
