import { randomUUID } from "node:crypto";
import Link from "next/link";
import { logSecurityEvent } from "../../lib/security/events";

export function createAccessReference(status: 401 | 403, id = randomUUID()): string {
  return `OID-AUTH-${status}-${id.replace(/[^a-z0-9]/gi, "").slice(0, 12).toUpperCase()}`;
}

export function AccessDenied({ status }: { status: 401 | 403 }) {
  const reference = createAccessReference(status);
  logSecurityEvent({ event: "PAGE_ACCESS_DENIED", outcome: "DENY", reason: reference });
  const unauthorized = status === 401;
  return <section className="access-state" role="alert" aria-labelledby="access-state-title">
    <div className="eyebrow">OID access control</div>
    <h1 id="access-state-title">{unauthorized ? "Authentication required" : "Access denied"}</h1>
    <p>{unauthorized ? "OID could not confirm an approved session with required MFA. Reauthenticate before trying again." : "Your authenticated account is not authorized for this section. No protected record details were disclosed."}</p>
    <p className="muted">If support is needed, provide this reference only:</p>
    <p><code className="access-reference">{reference}</code></p>
    <div className="access-actions"><Link className="button primary" href={unauthorized ? "/login" : "/"}>{unauthorized ? "Return to sign in" : "Return to OID home"}</Link></div>
  </section>;
}
