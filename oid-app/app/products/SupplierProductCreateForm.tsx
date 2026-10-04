"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Option = { id: string; label: string };

export function SupplierProductCreateForm({ productId, suppliers, skus }: { productId: string; suppliers: Option[]; skus: Option[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const input = Object.fromEntries(["supplierId", "skuId", "supplierProductName", "supplierCatalogReference", "minimumOrderQuantity", "leadTimeDays", "lastPrice", "currency"].map((key) => [key, String(data.get(key) || "")]));
    try {
      const response = await fetch("/api/v1/supplier-products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: { ...input, productId }, reason: "Supplier offering linked from controlled product staging UI" }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Supplier-product link failed");
      setMessage("Supplier offering linked as UNSCREENED / NOT_REVIEWED.");
      form.reset();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Supplier-product link failed");
    } finally {
      setBusy(false);
    }
  }

  return <details className="card form-card">
    <summary>Link supplier offering</summary>
    <form className="form-grid section-gap" onSubmit={submit}>
      <label>Supplier <select name="supplierId" required defaultValue=""><option value="" disabled>Select supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.label}</option>)}</select></label>
      <label>SKU <select name="skuId" defaultValue=""><option value="">Product-level offering</option>{skus.map((sku) => <option key={sku.id} value={sku.id}>{sku.label}</option>)}</select></label>
      <label>Supplier product name <input name="supplierProductName" maxLength={240}/></label>
      <label>Catalog reference <input name="supplierCatalogReference" maxLength={160}/></label>
      <label>Minimum order quantity <input name="minimumOrderQuantity" type="number" min="0.000001" step="any"/></label>
      <label>Lead time (days) <input name="leadTimeDays" type="number" min="1" max="3650" step="1"/></label>
      <label>Last quoted price <input name="lastPrice" type="number" min="0.000001" step="any"/></label>
      <label>Currency <input name="currency" defaultValue="USD" minLength={3} maxLength={3} pattern="[A-Za-z]{3}"/></label>
      <div className="form-wide control-notice"><strong>Controlled default:</strong> this link remains UNSCREENED and its documents remain NOT_REVIEWED. It does not authorize purchasing.</div>
      <div className="form-wide form-actions"><button className="button primary" disabled={busy || !suppliers.length}>{busy ? "Linking…" : "Link unqualified offering"}</button><span role="status" className="muted">{message}</span></div>
    </form>
  </details>;
}

