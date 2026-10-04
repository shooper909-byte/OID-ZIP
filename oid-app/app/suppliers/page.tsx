import { EmptyState } from "../_components/EmptyState";
import { requirePagePermission } from "../../lib/auth/page-actor";
import { db } from "../../lib/database";
import { hasPermission, PERMISSIONS } from "../../lib/permissions";
import { SupplierCreateForm } from "./SupplierCreateForm";

export const dynamic = "force-dynamic";
export default async function Page(){const actor=await requirePagePermission(PERMISSIONS.SUPPLIER_READ);const rows=await db.supplier.findMany({orderBy:{legalName:"asc"},take:100});return <><div className="page-head"><div><div className="eyebrow">Supplier Intelligence · Controlled staging</div><h1>Suppliers</h1><p className="muted">Real supplier identity records are permitted. New records always begin unqualified.</p></div></div>{hasPermission(actor.permissions,PERMISSIONS.SUPPLIER_WRITE)?<SupplierCreateForm/>:<div className="control-notice">Your role has supplier read access only.</div>}<div className="section-gap">{rows.length?<table className="table"><thead><tr><th>OID</th><th>Supplier</th><th>Type</th><th>Qualification</th><th>Risk</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td className="code"><a href={`/suppliers/${r.id}`}>{r.oidCode}</a></td><td>{r.legalName}</td><td>{r.supplierType}</td><td><span className="badge">{r.qualificationStatus}</span></td><td>{r.riskLevel??"—"}</td></tr>)}</tbody></table>:<EmptyState title="No suppliers yet" description="Create a supplier to begin qualification and product mapping." note="All new suppliers begin UNSCREENED with no risk score."/>}</div></>}
