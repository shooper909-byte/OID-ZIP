import { readFileSync } from "node:fs";

const dockerfile = readFileSync(new URL("../Dockerfile", import.meta.url), "utf8");
const compose = readFileSync(new URL("../docker-compose.yml", import.meta.url), "utf8");
const checks = [
  ["runtime uses nonroot node user", /\nUSER node\s*\n/.test(dockerfile)],
  ["production NODE_ENV is fixed", /ENV NODE_ENV=production/.test(dockerfile)],
  ["runtime healthcheck is non-sensitive", /api\/v1\/health\/live/.test(dockerfile)],
  ["application filesystem is read-only", /\n\s+read_only:\s*true/.test(compose)],
  ["application drops all Linux capabilities", /\n\s+cap_drop:\s*\[ALL\]/.test(compose)],
  ["no-new-privileges is enabled", (compose.match(/no-new-privileges:true/g) ?? []).length >= 2],
  ["database network is internal", /database:\s*\n\s+internal:\s*true/.test(compose)],
  ["database has no published port", !/postgres:[\s\S]*?ports:/m.test(compose.split(/\n\s{2}oid-migrate:/)[0])],
  ["migration and runtime database URLs are separate", compose.includes("OID_MIGRATION_DATABASE_URL") && compose.includes("OID_DATABASE_URL")],
  ["application port is loopback-bound in local compose", compose.includes('"127.0.0.1:3000:3000"')],
];

const failed = checks.filter(([, passed]) => !passed).map(([name]) => name);
for (const [name, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"}: ${name}`);
if (failed.length) {
  console.error(`Container configuration hardening failed: ${failed.join(", ")}`);
  process.exit(1);
}
