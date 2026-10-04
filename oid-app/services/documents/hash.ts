import { createHash } from "node:crypto";
export function sha256Buffer(input: Buffer): string { return createHash("sha256").update(input).digest("hex"); }
export function verifySha256(input: Buffer, expected: string): boolean { return sha256Buffer(input) === expected.toLowerCase(); }
