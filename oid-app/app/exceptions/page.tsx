import { EmptyState } from "../_components/EmptyState";
import { requirePagePermission } from "../../lib/auth/page-actor";
import { db } from "../../lib/database";
import { PERMISSIONS } from "../../lib/permissions";

export const dynamic = "force-dynamic";
export default async function Page() {
  await requirePagePermission(PERMISSIONS.EXCEPTION_READ);
  const rows = await db.exception.findMany({where:{status:{notIn:["CLOSED","MITIGATED"]}},orderBy:[{severity:"desc"},{dueAt:"asc"}],take:100});
  return <><div className="page-head"><div><div className="eyebrow">Risk & Exceptions · Synthetic staging</div><h1>Exception queue</h1><p className="muted">Zero unresolved critical exceptions is the target.</p></div>{rows.length?<button className="button primary" type="button" disabled>Report synthetic exception · Phase 3</button>:null}</div>{rows.length?<table className="table"><thead><tr><th>OID</th><th>Severity</th><th>Issue</th><th>Blocks</th><th>Status</th><th>Due</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td className="code">{r.oidCode}</td><td><span className={`badge ${r.severity==="CRITICAL"?"danger":r.severity==="HIGH"?"warn":""}`}>{r.severity}</span></td><td>{r.title}</td><td>{r.blocksProcess}</td><td>{r.status}</td><td>{r.dueAt?.toISOString().slice(0,10)??"—"}</td></tr>)}</tbody></table>:<EmptyState title="No unresolved synthetic exceptions" description="Testing or review findings will appear here with severity, ownership, blocking effect, evidence, and resolution status." actionLabel="Report synthetic exception · Phase 3" note="Exception reporting and closure controls are disabled in this Phase 1 interface."/>}</>;
}
