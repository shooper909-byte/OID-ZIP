import { db } from "../../lib/database";
import { requirePermission, PERMISSIONS } from "../../lib/permissions";
import { nextOidCode } from "../../lib/oid-identifiers/counter";

export async function createOrganization(args: { name: string; legalName?: string; organizationType?: string; domain?: string; commerceCustomerId?: string; userId: string; permissions: Iterable<string> }) {
  requirePermission(args.permissions, PERMISSIONS.ORGANIZATION_WRITE);
  return db.organization.create({ data: { oidCode: await nextOidCode(db, "ORG"), name: args.name, legalName: args.legalName, organizationType: args.organizationType, domain: args.domain, commerceCustomerId: args.commerceCustomerId } });
}

export async function verifyOrganization(args: { organizationId: string; status: "VERIFIED"|"ESCALATED"|"REJECTED"; userId: string; permissions: Iterable<string> }) {
  requirePermission(args.permissions, PERMISSIONS.ORGANIZATION_VERIFY);
  return db.organization.update({ where: { id: args.organizationId }, data: { verificationStatus: args.status } });
}
