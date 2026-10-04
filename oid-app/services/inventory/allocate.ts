import { assertCanAllocate } from "../../lib/inventory";
import { requirePermission, PERMISSIONS } from "../../lib/permissions";

export type AllocationDependencies = {
  getLotForUpdate: (lotId: string) => Promise<{ status: string; releaseGateStatus: string; availableQuantity: number }>;
  createAllocationTransaction: (input: { lotId: string; customerOrderRef: string; quantity: number; unit: string; userId: string }) => Promise<unknown>;
};

export async function allocateLot(args: {
  lotId: string;
  customerOrderRef: string;
  quantity: number;
  unit: string;
  userId: string;
  permissions: Iterable<string>;
  deps: AllocationDependencies;
}) {
  requirePermission(args.permissions, PERMISSIONS.INVENTORY_ALLOCATE);
  const lot = await args.deps.getLotForUpdate(args.lotId);
  assertCanAllocate({ lotStatus: lot.status, releaseGateStatus: lot.releaseGateStatus, availableQuantity: lot.availableQuantity, requestedQuantity: args.quantity });
  return args.deps.createAllocationTransaction({
    lotId: args.lotId,
    customerOrderRef: args.customerOrderRef,
    quantity: args.quantity,
    unit: args.unit,
    userId: args.userId,
  });
}
