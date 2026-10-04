import { notFound } from "next/navigation";
import { requirePagePermission } from "../../../lib/auth/page-actor";
import { db } from "../../../lib/database";
import { hasPermission, PERMISSIONS } from "../../../lib/permissions";
import { SupplierProductCreateForm } from "../SupplierProductCreateForm";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePagePermission(PERMISSIONS.PRODUCT_READ);
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id }, include: { skus: { orderBy: { internalSku: "asc" } }, gates: { orderBy: { gateType: "asc" } }, supplierProducts: { include: { supplier: true, sku: true }, orderBy: { supplier: { legalName: "asc" } } }, _count: { select: { lots: true } } } });
  if (!product) notFound();
  const suppliers = hasPermission(actor.permissions, PERMISSIONS.SUPPLIER_READ) ? await db.supplier.findMany({ select: { id: true, legalName: true, oidCode: true }, orderBy: { legalName: "asc" }, take: 250 }) : [];
  const canLink = hasPermission(actor.permissions, PERMISSIONS.PRODUCT_WRITE) && hasPermission(actor.permissions, PERMISSIONS.SUPPLIER_WRITE);
  return <>
    <div className="eyebrow">Product Master</div><h1>{product.name}</h1><p className="code">{product.oidCode}</p>
    <div className="split"><section className="card"><h2>Control state</h2><p><span className={`badge ${product.status === "HOLD" || product.status === "BLOCKED" ? "danger" : "warn"}`}>{product.status}</span></p><p>Evidence: {product.evidenceState}</p><p>Family: {product.productFamily ?? "Not recorded"}</p><p>Classification: {product.researchClassification ?? "Not recorded"}</p></section><section className="card"><h2>Traceability</h2><p>{product.skus.length} SKU{product.skus.length === 1 ? "" : "s"}</p><p>{product.supplierProducts.length} supplier offering{product.supplierProducts.length === 1 ? "" : "s"}</p><p>{product._count.lots} lot{product._count.lots === 1 ? "" : "s"}</p></section></div>
    <h2>SKUs</h2><table className="table"><thead><tr><th>OID</th><th>Internal SKU</th><th>Display name</th><th>Strength</th><th>Package</th><th>Status</th></tr></thead><tbody>{product.skus.map((sku) => <tr key={sku.id}><td className="code">{sku.oidCode}</td><td className="code">{sku.internalSku}</td><td>{sku.displayName}</td><td>{sku.strengthValue ? `${sku.strengthValue} ${sku.strengthUnit ?? ""}` : "—"}</td><td>{sku.packageQuantity ? `${sku.packageQuantity} ${sku.packageUnit ?? ""}` : "—"}</td><td>{sku.status}</td></tr>)}</tbody></table>
    <div className="section-gap">{canLink ? <SupplierProductCreateForm productId={product.id} suppliers={suppliers.map((supplier) => ({ id: supplier.id, label: `${supplier.legalName} · ${supplier.oidCode}` }))} skus={product.skus.map((sku) => ({ id: sku.id, label: sku.internalSku }))}/> : <div className="control-notice">Your role cannot create supplier-product links.</div>}</div>
    <h2>Supplier offerings</h2>{product.supplierProducts.length ? <table className="table"><thead><tr><th>Supplier</th><th>SKU</th><th>Catalog ref.</th><th>MOQ</th><th>Lead time</th><th>Last price</th><th>Documents</th><th>Qualification</th></tr></thead><tbody>{product.supplierProducts.map((row) => <tr key={row.id}><td><a href={`/suppliers/${row.supplierId}`}>{row.supplier.legalName}</a></td><td className="code">{row.sku?.internalSku ?? "All SKUs"}</td><td>{row.supplierCatalogReference ?? "—"}</td><td>{row.minimumOrderQuantity?.toString() ?? "—"}</td><td>{row.leadTimeDays ? `${row.leadTimeDays} days` : "—"}</td><td>{row.lastPrice ? `${row.currency ?? "USD"} ${row.lastPrice}` : "—"}</td><td>{row.documentationStatus ?? "NOT_REVIEWED"}</td><td><span className="badge">{row.qualificationStatus}</span></td></tr>)}</tbody></table> : <div className="card empty-state"><strong>No supplier offerings linked.</strong><p className="muted">Link the suppliers that quote or manufacture this product. Each link remains unqualified until evidence review.</p></div>}
    <h2>Quality gates</h2>{product.gates.length ? <table className="table"><thead><tr><th>Gate</th><th>Status</th><th>Reviewed</th><th>Blocked reason</th></tr></thead><tbody>{product.gates.map((gate) => <tr key={gate.id}><td>{gate.gateType}</td><td>{gate.status}</td><td>{gate.reviewedAt?.toISOString().slice(0, 10) ?? "—"}</td><td>{gate.blockedReason ?? "—"}</td></tr>)}</tbody></table> : <div className="control-notice">No quality gates have been opened. Product creation does not grant approval or release status.</div>}
  </>;
}

