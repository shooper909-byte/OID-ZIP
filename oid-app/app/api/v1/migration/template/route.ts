import { NextResponse } from "next/server";
import { actorForServerRequest } from "../../../../../lib/auth";
import { PERMISSIONS, requirePermission } from "../../../../../lib/permissions";
import { safeApiError } from "../../../../../lib/security/request";
import { supplierCsvTemplate } from "../../../../../lib/migration/supplier-csv";

export async function GET(request: Request) {
  try {
    const actor = await actorForServerRequest(request);
    requirePermission(actor.permissions, PERMISSIONS.MIGRATION_READ);
    return new NextResponse(supplierCsvTemplate(), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="oid-supplier-import-template.csv"', "cache-control": "no-store" } });
  } catch (error) { return safeApiError(error, 403); }
}
