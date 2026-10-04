import { EmptyState } from "../_components/EmptyState";
import { requirePagePermission } from "../../lib/auth/page-actor";
import { db } from "../../lib/database";
import { hasPermission, PERMISSIONS } from "../../lib/permissions";
import { ProductCreateForm } from "./ProductCreateForm";

export const dynamic = "force-dynamic";

export default async function Page() {
  const actor = await requirePagePermission(PERMISSIONS.PRODUCT_READ);
  const rows = await db.product.findMany({ include: { skus: { orderBy: { internalSku: "asc" } }, _count: { select: { supplierProducts: true, lots: true } } }, orderBy: { name: "asc" }, take: 250 });
  return <>
    <div className="page-head"><div><div className="eyebrow">Product Master · Controlled staging</div><h1>Products &amp; SKUs</h1><p className="muted">Define the catalog foundation first. Quantities become inventory only after a traced receipt, quality review, and lot release.</p></div></div>
    {hasPermission(actor.permissions, PERMISSIONS.PRODUCT_WRITE) ? <ProductCreateForm/> : <div className="control-notice">Your role has product read access only.</div>}
    <div className="section-gap">{rows.length ? <table className="table"><thead><tr><th>OID</th><th>Product</th><th>SKU</th><th>Status</th><th>Evidence</th><th>Suppliers</th><th>Lots</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td className="code"><a href={`/products/${row.id}`}>{row.oidCode}</a></td><td>{row.name}</td><td>{row.skus.map((sku) => sku.internalSku).join(", ") || "—"}</td><td><span className={`badge ${row.status === "HOLD" || row.status === "BLOCKED" ? "danger" : "warn"}`}>{row.status}</span></td><td>{row.evidenceState}</td><td>{row._count.supplierProducts}</td><td>{row._count.lots}</td></tr>)}</tbody></table> : <EmptyState title="No products yet" description="Create the approved product master and its first SKU before linking supplier offerings." note="Product creation never creates inventory."/>}</div>
  </>;
}

