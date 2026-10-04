import { requirePagePermission } from "../../../lib/auth/page-actor";
import { db } from "../../../lib/database";
import { hasPermission, PERMISSIONS } from "../../../lib/permissions";
import { ProductImportControls } from "./ProductImportControls";

export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ batch?: string }> }) {
  const actor = await requirePagePermission(PERMISSIONS.MIGRATION_READ);
  const { batch: selectedId } = await searchParams;
  const batches = await db.importBatch.findMany({ where: { status: { startsWith: "PRODUCT_" } }, orderBy: { createdAt: "desc" }, take: 50 });
  const requestedId = selectedId && /^[0-9a-f-]{36}$/i.test(selectedId) ? selectedId : undefined;
  const latest = await db.importBatch.findFirst({ where: { status: { startsWith: "PRODUCT_" }, ...(requestedId ? { id: requestedId } : {}) }, orderBy: { createdAt: "desc" }, include: { rows: { orderBy: { rowNumber: "asc" } } } });
  const createCount = latest?.rows.filter(r => r.proposedAction === "CREATE_PRODUCT").length ?? 0;
  const canWrite = hasPermission(actor.permissions, PERMISSIONS.PRODUCT_WRITE);
  return <><div className="eyebrow">Migration</div><h1>Import products</h1><p><a href="/migration">Supplier imports</a> · <a href="/products">Products and SKUs</a></p>
    <div className="control-notice"><strong>Preview before import.</strong> Product and SKU records remain under review. Uploads do not create inventory, supplier qualifications, or testing approvals.</div>
    {hasPermission(actor.permissions, PERMISSIONS.MIGRATION_RUN) && canWrite ? <ProductImportControls batchId={latest?.status === "PRODUCT_PREVIEW_READY" ? latest.id : undefined} canCommit={hasPermission(actor.permissions, PERMISSIONS.MIGRATION_RESOLVE)} blocked={(latest?.errorCount ?? 0) > 0} createCount={createCount} /> : <p>You have read-only access to product imports.</p>}
    {selectedId && !latest ? <p role="alert">The requested product batch was not found.</p> : null}
    {latest ? <section className="section-gap"><h2>{latest.name}</h2><p>{latest.sourceName} · {latest.status}</p><div className="grid">
      {[['Rows', latest.rowCount], ['Create', createCount], ['Skip', latest.rowCount - createCount], ['Warnings', latest.warningCount], ['Errors', latest.errorCount]].map(([label, value]) => <div className="card" key={label}><span className="muted">{label}</span><div className="metric">{value}</div></div>)}
    </div><div style={{ overflowX: "auto" }}><table className="table section-gap"><thead><tr><th>Row / website ID</th><th>Product</th><th>Original → OID SKU</th><th>Action</th><th>Review</th></tr></thead><tbody>
      {latest.rows.map(row => {
        const raw = row.rawData as Record<string, string>;
        const normalized = row.normalizedData as { product?: Record<string, unknown>; sku?: Record<string, unknown> & { internalSku?: string }; sourceId?: string; packageKnown?: boolean } | null;
        const messages = Array.isArray(row.messages) ? row.messages : [];
        return <tr key={row.id}><td>{row.rowNumber} / {normalized?.sourceId || raw.website_id || raw.id || "—"}</td><td>{raw.name || "—"}</td><td>{raw.original_sku || raw.sku || "—"} → {normalized?.sku?.internalSku || raw.internal_sku || "—"}</td><td>{row.proposedAction === "SKIP_PRODUCT" ? "Skip" : row.committedEntityId ? "Created" : "Create"}</td><td><span className={`badge ${row.validationStatus === "ERROR" ? "danger" : row.validationStatus === "WARNING" ? "warn" : "ok"}`}>{row.validationStatus}</span><details><summary>Details ({messages.length})</summary>{normalized ? <dl>{Object.entries({ ...normalized.product, ...normalized.sku, packageQuantity: normalized.packageKnown ? normalized.sku?.packageQuantity : "Unknown" }).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value ?? "Unknown")}</dd></div>)}</dl> : null}<ul>{messages.map((m, i) => <li key={i}>{String(m)}</li>)}</ul><p><a href={row.committedEntityId ? `/products/${row.committedEntityId}` : undefined}>{row.committedEntityId ? "Open product" : ""}</a></p></details></td></tr>;
      })}
    </tbody></table></div></section> : <p>No product imports yet.</p>}
    <section className="section-gap"><h2>Product import history</h2><ul>{batches.map(b => <li key={b.id}><a href={`/migration/products?batch=${b.id}`}>{b.name}</a> — {b.status} · {b.createdAt.toISOString().slice(0, 10)}</li>)}</ul></section>
  </>;
}
