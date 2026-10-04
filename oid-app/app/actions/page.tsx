import { EmptyState } from "../_components/EmptyState";
import { requirePagePermission } from "../../lib/auth/page-actor";
import { db } from "../../lib/database";
import { PERMISSIONS } from "../../lib/permissions";

export const dynamic = "force-dynamic";
export default async function Page() {
  await requirePagePermission(PERMISSIONS.ACTION_READ);
  const rows = await db.action.findMany({where:{status:{notIn:["COMPLETE","CANCELLED"]}},orderBy:{dueAt:"asc"},take:100});
  return <><div className="page-head"><div><div className="eyebrow">Control · Synthetic staging</div><h1>Actions</h1><p className="muted">Assigned corrective work will retain evidence and completion history.</p></div>{rows.length?<button className="button primary" type="button" disabled>Create synthetic action · Phase 4</button>:null}</div>{rows.length?<table className="table"><thead><tr><th>OID</th><th>Priority</th><th>Action</th><th>Status</th><th>Due</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td className="code">{r.oidCode}</td><td>{r.priority}</td><td>{r.title}</td><td>{r.status}</td><td>{r.dueAt?.toISOString().slice(0,10)??"—"}</td></tr>)}</tbody></table>:<EmptyState title="No open synthetic actions" description="A later authorized phase will support creation, assignment, evidence-linked completion, and immutable audit history." actionLabel="Create synthetic action · Phase 4" note="Creation and completion controls are unavailable in Phase 1."/>}</>;
}
