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

function encodedPrincipal({ tenant = "00000000-0000-0000-0000-000000000123", email = "quality@example.invalid", mfa = true } = {}) {
  const claims = [
    { typ: "tid", val: tenant },
    { typ: "preferred_username", val: email },
  ];
  if (mfa) claims.push({ typ: "amr", val: "pwd mfa" });
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
  },
  stdio: ["ignore", "ignore", "pipe"],
});

let childError = "";
child.stderr.on("data", (chunk) => { childError += String(chunk); });

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

  const wrongTenant = await fetch(`http://127.0.0.1:${bridgePort}/protected`, {
    headers: { "x-ms-client-principal": encodedPrincipal({ tenant: "00000000-0000-0000-0000-000000000999" }) },
  });
  assert.equal(wrongTenant.status, 401);

  const noMfa = await fetch(`http://127.0.0.1:${bridgePort}/protected`, {
    headers: { "x-ms-client-principal": encodedPrincipal({ mfa: false }) },
  });
  assert.equal(noMfa.status, 401);

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
