import { NextResponse } from "next/server";
import { z } from "zod";
import { actorForServerRequest } from "../../../../lib/auth";
import { db } from "../../../../lib/database";
import { hasPermission, PERMISSIONS } from "../../../../lib/permissions";
import { safeApiError } from "../../../../lib/security/request";

const Query = z.string().trim().min(2).max(120);
export async function GET(request: Request) {
  try {
    const actor = await actorForServerRequest(request);
    const value = new URL(request.url).searchParams.get("q");
    if (!value) return NextResponse.json({ results: [] });
    const q = Query.parse(value);
    const [products, suppliers, lots, exceptions] = await Promise.all([
      hasPermission(actor.permissions, PERMISSIONS.PRODUCT_READ) ? db.product.findMany({ where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { oidCode: { contains: q, mode: "insensitive" } }] }, select: { id: true, oidCode: true, name: true, status: true }, take: 10 }) : [],
      hasPermission(actor.permissions, PERMISSIONS.SUPPLIER_READ) ? db.supplier.findMany({ where: { OR: [{ legalName: { contains: q, mode: "insensitive" } }, { oidCode: { contains: q, mode: "insensitive" } }] }, select: { id: true, oidCode: true, legalName: true, qualificationStatus: true }, take: 10 }) : [],
      hasPermission(actor.permissions, PERMISSIONS.LOT_READ) ? db.lot.findMany({ where: { OR: [{ oidCode: { contains: q, mode: "insensitive" } }, { supplierLot: { contains: q, mode: "insensitive" } }] }, select: { id: true, oidCode: true, status: true, releaseGateStatus: true }, take: 10 }) : [],
      hasPermission(actor.permissions, PERMISSIONS.EXCEPTION_READ) ? db.exception.findMany({ where: { OR: [{ oidCode: { contains: q, mode: "insensitive" } }, { title: { contains: q, mode: "insensitive" } }] }, select: { id: true, oidCode: true, title: true, severity: true, status: true }, take: 10 }) : [],
    ]);
    return NextResponse.json({ products, suppliers, lots, exceptions });
  } catch (error) { return safeApiError(error); }
}
