import { EmptyState } from "../_components/EmptyState";
import { requirePagePermissions } from "../../lib/auth/page-actor";
import { PERMISSIONS } from "../../lib/permissions";
import { getCommandCenterMetrics } from "../../services/lots/command-center";

export const dynamic = "force-dynamic";
export default async function Page() {
  await requirePagePermissions([PERMISSIONS.LOT_READ, PERMISSIONS.TEST_READ, PERMISSIONS.EXCEPTION_READ, PERMISSIONS.PURCHASE_ORDER_READ, PERMISSIONS.RECEIPT_READ, PERMISSIONS.ACTION_READ, PERMISSIONS.DECISION_READ, PERMISSIONS.ORGANIZATION_READ]);
  const m = await getCommandCenterMetrics();
  const cards = [["Critical exceptions",m.openCriticalExceptions,"danger"],["Blocked lots",m.blockedLots,"danger"],["Quarantined lots",m.quarantinedLots,"warn"],["Awaiting testing",m.lotsAwaitingTesting,"warn"],["Failed / investigate",m.failedResults,"danger"],["Overdue tests",m.overdueTests,"warn"],["Open POs",m.openPurchaseOrders,""],["Receipts review",m.receiptsNeedingReview,""],["Open actions",m.openActions,""],["Overdue actions",m.overdueActions,"warn"],["Decisions required",m.decisionsRequired,"warn"],["Verified organizations",m.verifiedOrganizations,"ok"]] as const;
  const total = cards.reduce((sum, [, value]) => sum + value, 0);
  return <><div className="page-head"><div><div className="eyebrow">OID Command Center · Controlled product staging</div><h1>Operational control</h1><p className="muted">Current controlled-staging counts from quality, traceability, action, and decision records.</p></div></div><section className="grid">{cards.map(([label,value,tone])=><article className="card" key={label}><span className={`badge ${tone}`}>{label}</span><div className="metric">{value}</div></article>)}</section>{total===0?<div className="section-gap"><EmptyState title="No purchasing or lot activity yet" description="Supplier and product-master setup does not create purchase orders, receipts, lots, or inventory." note="Those workflows remain disabled until their later controlled phases are authorized."/></div>:null}</>;
}
