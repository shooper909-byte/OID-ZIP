import { db } from "../../lib/database";
import { nextOidCode } from "../../lib/oid-identifiers/counter";
import { allocateLot } from "./allocate";

export async function allocateLotWithPrisma(args:{lotId:string;customerOrderRef:string;customerOrderItemId?:string;quantity:number;unit:string;userId:string;permissions:Iterable<string>}){
  return allocateLot({...args,deps:{
    getLotForUpdate: async lotId => {
      const lot=await db.lot.findUniqueOrThrow({where:{id:lotId},include:{inventoryMovements:true}});
      const available=lot.inventoryMovements.reduce((n,m)=>n+Number(m.quantityIn)-Number(m.quantityOut),0);
      return {status:lot.status,releaseGateStatus:lot.releaseGateStatus,availableQuantity:available};
    },
    createAllocationTransaction: async input => db.$transaction(async tx=>{
      const lot=await tx.lot.findUniqueOrThrow({where:{id:input.lotId}});
      if(lot.status!=="RELEASED"||lot.releaseGateStatus!=="PASS") throw new Error("LOT_NOT_RELEASED");
      const sums=await tx.inventoryMovement.aggregate({where:{lotId:input.lotId},_sum:{quantityIn:true,quantityOut:true}});
      const available=Number(sums._sum.quantityIn??0)-Number(sums._sum.quantityOut??0);
      if(available<input.quantity) throw new Error("INSUFFICIENT_INVENTORY");
      const allocation=await tx.allocation.create({data:{oidCode:await nextOidCode(tx,"ALLOC"),lotId:input.lotId,customerOrderRef:input.customerOrderRef,customerOrderItemId:args.customerOrderItemId,quantity:input.quantity,unit:input.unit,allocatedBy:input.userId}});
      await tx.inventoryMovement.create({data:{oidCode:await nextOidCode(tx,"MOV"),lotId:input.lotId,movementType:"ALLOCATION",quantityOut:input.quantity,unit:input.unit,referenceType:"ALLOCATION",referenceId:allocation.id,performedBy:input.userId,reason:`Allocated to ${input.customerOrderRef}`}});
      await tx.auditLog.create({data:{oidCode:await nextOidCode(tx,"AUD"),eventType:"UPDATE",userId:input.userId,entityType:"LOT",entityId:input.lotId,newValues:{allocationId:allocation.id,quantity:input.quantity,customerOrderRef:input.customerOrderRef},reason:"Customer order allocation"}});
      return allocation;
    })
  }})
}
