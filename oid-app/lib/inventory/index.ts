export type AllocationCheck = {
  lotStatus: string;
  releaseGateStatus: string;
  availableQuantity: number;
  requestedQuantity: number;
};

export function assertCanAllocate(input: AllocationCheck): void {
  if (input.lotStatus !== "RELEASED") throw new Error("ALLOCATION_BLOCKED:LOT_NOT_RELEASED");
  if (input.releaseGateStatus !== "PASS") throw new Error("ALLOCATION_BLOCKED:RELEASE_GATE_NOT_PASS");
  if (!(input.requestedQuantity > 0)) throw new Error("ALLOCATION_BLOCKED:INVALID_QUANTITY");
  if (input.availableQuantity < input.requestedQuantity) throw new Error("ALLOCATION_BLOCKED:INSUFFICIENT_INVENTORY");
}

export function calculateAvailableQuantity(movements: Array<{ quantityIn: number; quantityOut: number }>): number {
  return movements.reduce((sum, movement) => sum + movement.quantityIn - movement.quantityOut, 0);
}
