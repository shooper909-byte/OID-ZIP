import { EmptyState } from "../_components/EmptyState";
import { requirePagePermission } from "../../lib/auth/page-actor";
import { db } from "../../lib/database";
import { PERMISSIONS } from "../../lib/permissions";

export const dynamic = "force-dynamic";
export default async function Page() {
  await requirePagePermission(PERMISSIONS.LOT_READ);
  const rows = await db.lot.findMany({include:{product:true,supplier:true},orderBy:{createdAt:"desc"},take:100});
  return <><div className="page-head"><div><div className="eyebrow">Lot Intelligence · Controlled product staging</div><h1>Lots & traceability</h1><p className="muted">Lots must originate from controlled purchase-order and receipt traceability.</p></div>{rows.length?<button className="button primary" type="button" disabled>Record receipt · Later phase</button>:null}</div>{rows.length?<table className="table"><thead><tr><th>OID</th><th>Product</th><th>Supplier</th><th>Supplier lot</th><th>Status</th><th>Release gate</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><a className="code" href={`/lots/${r.id}`}>{r.oidCode}</a></td><td>{r.product.name}</td><td>{r.supplier.legalName}</td><td>{r.supplierLot}</td><td><span className={`badge ${["HOLD","REJECTED","RECALLED"].includes(r.status)?"danger":r.status==="RELEASED"?"ok":"warn"}`}>{r.status}</span></td><td>{r.releaseGateStatus}</td></tr>)}</tbody></table>:<EmptyState title="No lots" description="A later authorized phase will create quarantined lots only through a traceable purchase order and receipt." actionLabel="Record receipt · Later phase" note="Direct lot creation remains unavailable. Release and migration controls are unchanged."/>}</>;
}
