import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const ignored = new Set(["node_modules", ".next", ".git", ".tmp", "coverage"]);
const textExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".md", ".yml", ".yaml", ".prisma", ".sql", ".example"]);
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(?:password|secret|access[_-]?token)\s*[:=]\s*["']?(?!\$\{|process\.env|change-me|generate-|Set )[A-Za-z0-9_!@#$%^&*+./=-]{20,}/i,
];

async function walk(directory) {
  const findings = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name) || entry.name === ".env" || entry.name === ".env.local") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) findings.push(...await walk(path));
    else if (textExtensions.has(extname(entry.name)) || entry.name.startsWith(".env.example")) {
      const text = await readFile(path, "utf8");
      for (const pattern of patterns) if (pattern.test(text)) findings.push(relative(process.cwd(), path));
    }
  }
  return findings;
}

const findings = [...new Set(await walk(process.cwd()))];
if (findings.length) { console.error(`Potential committed secrets: ${findings.join(", ")}`); process.exit(1); }
console.log("Committed-source secret scan: PASS");
