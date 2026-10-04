import { actorForServerRequest, requireHumanActor } from "../../../../../../lib/auth";
import { PERMISSIONS, requirePermission } from "../../../../../../lib/permissions";
import { PRODUCT_CSV_HEADERS } from "../../../../../../lib/migration/product-csv";
import { safeApiError } from "../../../../../../lib/security/request";
export async function GET(request: Request) {
  try {
    const actor = await actorForServerRequest(request); requireHumanActor(actor);
    requirePermission(actor.permissions, PERMISSIONS.MIGRATION_READ);
    return new Response(`${PRODUCT_CSV_HEADERS.join(",")}\n`, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="oid-products-template.csv"', "cache-control": "no-store" } });
  } catch (error) { return safeApiError(error); }
}
