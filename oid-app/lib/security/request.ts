import { NextResponse } from "next/server";
import { logSecurityEvent } from "./events";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export function assertMutationOrigin(request: Request): void {
  if (!UNSAFE_METHODS.has(request.method.toUpperCase())) return;
  if (/^Bearer\s+/i.test(request.headers.get("authorization") ?? "")) return;
  const supplied = request.headers.get("origin");
  const expected = process.env.OID_ALLOWED_ORIGIN || new URL(request.url).origin;
  if (!supplied || supplied !== expected) throw new Error("CSRF_ORIGIN_REJECTED");
}

export function safeApiError(error: unknown, fallbackStatus = 400): NextResponse {
  const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
  const forbidden = message.startsWith("FORBIDDEN:") || message.includes("UNAUTHORIZED") || message.includes("CSRF_");
  const rateLimited = message === "RATE_LIMITED";
  const status = rateLimited ? 429 : forbidden ? 403 : fallbackStatus;
  const controlledWorkflowError = /^(CSV_|SUPPLIER_DUPLICATE:OID-SUP-|IMPORT_)/.test(message);
  const safeMessage = process.env.NODE_ENV === "production" && !forbidden && !rateLimited && !controlledWorkflowError ? "REQUEST_REJECTED" : message;
  const logReason = process.env.NODE_ENV === "production" ? safeMessage : message;
  logSecurityEvent({ event: "API_REQUEST", outcome: "DENY", reason: logReason });
  return NextResponse.json({ error: safeMessage }, { status });
}

export const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};

export function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(key, value);
  if (process.env.NODE_ENV === "production") response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  response.headers.set("Cache-Control", "no-store");
  return response;
}
