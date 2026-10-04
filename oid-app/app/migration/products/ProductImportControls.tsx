"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
export function ProductImportControls({ batchId, canCommit, blocked, createCount }: { batchId?: string; canCommit: boolean; blocked: boolean; createCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const form = new FormData(event.currentTarget);
      const file = form.get("file");
      if (file instanceof File && file.size > 1_000_000) throw new Error("File exceeds the 1 MB limit");
      const response = await fetch("/api/v1/migration/products/preview", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Preview failed");
      setMessage(body.idempotent ? "This file and mapping were already processed. Showing the saved batch." : "Preview created. Review the products and warnings below.");
      router.push(`/migration/products?batch=${body.batch.id}`); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Preview failed"); }
    finally { setBusy(false); }
  }
  async function commit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!batchId) return;
    setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/v1/migration/products/${batchId}/commit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirmation: form.get("confirmation"), reason: form.get("reason") }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Import failed");
      setMessage(`${body.createdCount} products and SKUs saved under review.${body.idempotent ? " This batch was already imported; no duplicates were created." : ""}`); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Import failed"); }
    finally { setBusy(false); }
  }
  return <div className="stack">
    <section className="card"><h2>1. Upload and preview</h2>
      <p>Upload an OID product CSV or a WooCommerce CSV export (up to 1 MB and 1,000 rows). Save Excel files as CSV first.</p>
      <p className="muted">WooCommerce columns are mapped automatically. Nutraceutical and archived categories are excluded. Stock, pricing and configurable bundle contents are not loaded by this product import.</p>
      <p><a className="button" href="/api/v1/migration/products/template">Download product CSV template</a></p>
      <form className="form-grid" onSubmit={upload}>
        <label>Batch name<input name="name" required maxLength={240} defaultValue="Research product import" /></label>
        <label>Source identifier<input name="source_system" required maxLength={200} defaultValue="woocommerce:oligopolypeptides.com" /><span className="muted">Keep this identifier unchanged on later uploads to prevent duplicates.</span></label>
        <label className="form-wide">Product CSV<input name="file" type="file" accept=".csv,text/csv" required /></label>
        <label className="form-wide"><span><input type="checkbox" name="neutral_skus" /> Use OP-R- plus the website ID as the OID SKU</span><span className="muted">Leave unchecked to use the internal_sku column, or the original WooCommerce SKU. Original SKUs and website IDs are retained. Uploading does not change WooCommerce.</span></label>
        <div className="form-wide"><button className="button primary" disabled={busy}>{busy ? "Processing…" : "Validate and preview"}</button></div>
      </form>
    </section>
    {batchId && canCommit ? <section className="card"><h2>2. Review and import</h2><p>Review the selected batch below, including every warning. {createCount} products will be created with their initial SKUs under review. Missing specifications remain unknown.</p>
      <form className="form-grid" onSubmit={commit}>
        <label className="form-wide">Review notes<textarea name="reason" required minLength={12} maxLength={1000} /></label>
        <label className="form-wide">Type COMMIT PRODUCT IMPORT<input name="confirmation" required pattern="COMMIT PRODUCT IMPORT" autoComplete="off" /></label>
        <label className="form-wide"><span><input type="checkbox" required /> I reviewed this batch, including missing specifications and duplicate-name warnings.</span></label>
        <div className="form-wide"><button className="button primary" disabled={busy || blocked || !createCount}>{blocked ? "Resolve validation errors first" : !createCount ? "No new products to import" : busy ? "Importing…" : `Import ${createCount} products`}</button></div>
      </form>
    </section> : null}
    <p role="status">{message}</p>
  </div>;
}
