import { randomUUID } from "node:crypto";
import Link from "next/link";
import { headers } from "next/headers";
import { identityMode } from "../../lib/config/env";
import { supportReference } from "../../lib/auth/entra";

export function createAccessReference(status: 401 | 403, id = randomUUID()): string {
  return `OID-AUTH-${status}-${id.replace(/[^a-z0-9]/gi, "").slice(0, 12).toUpperCase()}`;
}

/** Entra sign-out, then back to OID root, which Easy Auth sends to Microsoft sign-in. Never auto-redirects. */
export const ENTRA_SIGN_OUT_PATH = "/.auth/logout?post_logout_redirect_uri=%2F";

export async function AccessDenied({ status }: { status: 401 | 403 }) {
  // Reuse the per-request reference minted by the identity bridge so the code the user reports
  // matches the server-side AUTH_DECISION log line (which carries the exact failure reason).
  // Next.js pre-renders this boundary on every request, so it must not log; denials are logged where they occur.
  const reference = supportReference(status, (await headers()).get("x-oid-auth-ref")) ?? createAccessReference(status);
  const unauthorized = status === 401;
  const sso = identityMode() === "trusted-proxy";
  const action = unauthorized
    ? sso ? <a className="button primary" href={ENTRA_SIGN_OUT_PATH}>Sign out and try again</a> : <Link className="button primary" href="/login">Return to sign in</Link>
    : <Link className="button primary" href="/">Return to OID home</Link>;
  return <section className="access-state" role="alert" aria-labelledby="access-state-title">
    <div className="eyebrow">OID access control</div>
    <h1 id="access-state-title">{unauthorized ? "Authentication required" : "Access denied"}</h1>
    <p>{unauthorized ? (sso ? "Microsoft sign-in completed, but OID could not authorize this account. Retrying the same account will not change the result until support resolves the reference below." : "OID could not confirm an approved session. Reauthenticate before trying again.") : "Your authenticated account is not authorized for this section. No protected record details were disclosed."}</p>
    <p className="muted">If support is needed, provide this reference only:</p>
    <p><code className="access-reference">{reference}</code></p>
    <div className="access-actions">{action}</div>
  </section>;
}
