import { EmptyState } from "../_components/EmptyState";
import { requirePagePermission } from "../../lib/auth/page-actor";
import { db } from "../../lib/database";
import { PERMISSIONS } from "../../lib/permissions";

export const dynamic = "force-dynamic";
export default async function Page() {
  await requirePagePermission(PERMISSIONS.DECISION_READ);
  const rows = await db.decision.findMany({orderBy:{createdAt:"desc"},take:100});
  return <><div className="page-head"><div><div className="eyebrow">Decision Intelligence · Synthetic staging</div><h1>Decision register</h1><p className="muted">Evidence-linked recommendations remain separate from founder-controlled decisions.</p></div>{rows.length?<button className="button primary" type="button" disabled>Create synthetic decision · Phase 4</button>:null}</div>{rows.length?<table className="table"><thead><tr><th>OID</th><th>Type</th><th>Decision</th><th>Status</th><th>Review</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td className="code">{r.oidCode}</td><td>{r.decisionType}</td><td>{r.title}</td><td>{r.decisionStatus}</td><td>{r.reviewDate?.toISOString().slice(0,10)??"—"}</td></tr>)}</tbody></table>:<EmptyState title="No synthetic decisions" description="A later authorized phase will support evidence review and recommendation while reserving final approval to the Founder role." actionLabel="Create synthetic decision · Phase 4" note="Founder-reserved approval cannot be delegated to OID Intelligence or another role."/>}</>;
}
