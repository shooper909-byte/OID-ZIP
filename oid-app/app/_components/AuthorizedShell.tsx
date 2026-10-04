import type { ReactNode } from "react";
import type { Actor } from "../../lib/auth";
import { actorCanReadAll } from "../../lib/auth/page-actor";
import { PERMISSIONS, type PermissionKey } from "../../lib/permissions";

export const commandCenterPermissions = [PERMISSIONS.LOT_READ, PERMISSIONS.TEST_READ, PERMISSIONS.EXCEPTION_READ, PERMISSIONS.PURCHASE_ORDER_READ, PERMISSIONS.RECEIPT_READ, PERMISSIONS.ACTION_READ, PERMISSIONS.DECISION_READ, PERMISSIONS.ORGANIZATION_READ] as const;
const nav: [string, string, readonly PermissionKey[]][] = [
  ["/command-center", "Command Center", commandCenterPermissions],
  ["/suppliers", "Suppliers", [PERMISSIONS.SUPPLIER_READ]],
  ["/products", "Products", [PERMISSIONS.PRODUCT_READ]],
  ["/lots", "Lots & Traceability", [PERMISSIONS.LOT_READ]],
  ["/exceptions", "Exceptions", [PERMISSIONS.EXCEPTION_READ]],
  ["/actions", "Actions", [PERMISSIONS.ACTION_READ]],
  ["/decisions", "Decisions", [PERMISSIONS.DECISION_READ]],
  ["/intelligence", "Ask OID", [PERMISSIONS.INTELLIGENCE_QUERY]],
  ["/migration", "Migration", [PERMISSIONS.MIGRATION_READ]],
];

export function AuthorizedShell({ actor, children }: { actor: Actor; children: ReactNode }) {
  const visibleNav = nav.filter(([, , permissions]) => actorCanReadAll(actor, permissions));
  return <div className="shell"><aside className="sidebar"><div className="brand">OLIGOPOLY LABORATORIES<strong>OID</strong><span>Controlled product staging</span></div><nav className="nav" aria-label="OID sections">{visibleNav.map(([href, label]) => <a key={href} href={href}>{label}</a>)}</nav></aside><main className="content">{children}</main></div>;
}
