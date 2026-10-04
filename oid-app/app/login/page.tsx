import { redirect } from "next/navigation";
import { identityMode } from "../../lib/config/env";

export const dynamic = "force-dynamic";

export default function Login(){
  // In Entra (trusted-proxy) mode, Easy Auth has already signed the user in before this page is reachable;
  // the internal-token form cannot create a session in this mode, so never show it.
  if (process.env.NODE_ENV === "production" && identityMode() === "trusted-proxy") redirect("/command-center");
  return <main style={{maxWidth:440,margin:'12vh auto',fontFamily:'system-ui'}}><div className="eyebrow">OligoPoly Intelligence Database</div><h1>Internal access</h1><p className="muted">Enter the internal OID access token configured by the system owner.</p><form action="/api/v1/session" method="post" className="stack"><input name="token" type="password" required style={{padding:12,border:'1px solid #d4d4d8',borderRadius:8}}/><button className="button primary" type="submit">Sign in</button></form></main>}
