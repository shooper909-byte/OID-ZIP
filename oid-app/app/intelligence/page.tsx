import { EmptyState } from "../_components/EmptyState";
import { requirePagePermission } from "../../lib/auth/page-actor";
import { PERMISSIONS } from "../../lib/permissions";

export default async function Page() {
  await requirePagePermission(PERMISSIONS.INTELLIGENCE_QUERY);
  return <><div className="eyebrow">OID Intelligence · Controlled product staging</div><h1>Ask OID</h1><div className="card"><p>Evidence-linked questions use the existing permission-scoped <span className="code">POST /api/v1/intelligence/query</span> service.</p><p className="muted">Responses will separately display supporting evidence, conflicting evidence, unknowns, required actions, and confidence. OID Intelligence cannot release lots or make founder-reserved decisions.</p></div><div className="section-gap"><EmptyState title="Interactive questions are not enabled in this phase" description="The future interface will query only records visible to the authenticated actor and will never convert an answer into an approval or mutation." actionLabel="Ask OID · Later phase" note="The existing API authorization, origin checks, rate limits, and evidence structure remain unchanged."/></div></>;
}
