"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ProductCreateForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const product = Object.fromEntries(["name", "canonicalName", "productFamily", "researchClassification", "status"].map((key) => [key, String(data.get(key) || "")]));
    const sku = Object.fromEntries(["internalSku", "displayName", "strengthValue", "strengthUnit", "form", "packageQuantity", "packageUnit", "storageRequirements"].map((key) => [key, String(data.get(key) || "")]));
    try {
      const response = await fetch("/api/v1/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: { product, sku }, reason: "Product master creation from controlled staging UI" }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Product creation failed");
      setMessage(`${body.product.oidCode} and ${body.sku.oidCode} created without inventory.`);
      form.reset();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Product creation failed");
    } finally {
      setBusy(false);
    }
  }

  return <details className="card form-card">
    <summary>Create product and initial SKU</summary>
    <form className="form-grid section-gap" onSubmit={submit}>
      <label>Product name <input name="name" required minLength={2} maxLength={240}/></label>
      <label>Canonical name <input name="canonicalName" maxLength={240}/></label>
      <label>Product family <input name="productFamily" maxLength={120} placeholder="Metabolic, recovery, cognitive…"/></label>
      <label>Research classification <input name="researchClassification" maxLength={160} placeholder="Research peptide, research support…"/></label>
      <label>Product status <select name="status" defaultValue="UNDER_REVIEW"><option>UNDER_REVIEW</option><option>DISCOVERY</option><option>RESEARCH</option><option>DOCUMENTATION_INCOMPLETE</option><option>TESTING_REQUIRED</option><option>HOLD</option></select></label>
      <label>Internal SKU <input name="internalSku" required minLength={3} maxLength={120} pattern="[A-Z0-9][A-Z0-9-]*" placeholder="OP-MET-RETA-10MG"/></label>
      <label>SKU display name <input name="displayName" required minLength={2} maxLength={240}/></label>
      <label>Strength <input name="strengthValue" inputMode="decimal" type="number" min="0.000001" step="any"/></label>
      <label>Strength unit <select name="strengthUnit" defaultValue=""><option value="">Not applicable</option><option>mg</option><option>mcg</option><option>mL</option><option>g</option></select></label>
      <label>Form <select name="form" defaultValue="Lyophilized vial"><option>Lyophilized vial</option><option>Research support</option><option>Kit</option><option>Bundle</option><option>Stack</option></select></label>
      <label>Package quantity <input name="packageQuantity" type="number" min="0.000001" step="any" defaultValue="1" required/></label>
      <label>Package unit <select name="packageUnit" defaultValue="vial"><option>vial</option><option>kit</option><option>bundle</option><option>stack</option><option>unit</option></select></label>
      <label className="form-wide">Storage requirements <input name="storageRequirements" maxLength={500}/></label>
      <div className="form-wide control-notice"><strong>Controlled default:</strong> creating a product does not create stock, approve a supplier, release a lot, or publish anything to WooCommerce.</div>
      <div className="form-wide form-actions"><button className="button primary" disabled={busy}>{busy ? "Creating…" : "Create product master"}</button><span role="status" className="muted">{message}</span></div>
    </form>
  </details>;
}

