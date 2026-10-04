import { formatOidCode } from "../../lib/oid-identifiers";
import { assertCanAllocate, calculateAvailableQuantity } from "../../lib/inventory";
import { getReleaseBlockers } from "../../lib/quality-gates";
import { getTraceabilityGaps } from "../../lib/traceability";
import { assertActionCanComplete, assertCapaCanClose, assertCriticalExceptionCanClose, assertDecisionCanFinalize } from "../../lib/control";
import { buildEvidenceResponse, assertEvidenceRefsExist } from "../../lib/intelligence";
import { assertImportCanCommit, classifyLegacyRow } from "../../lib/migration";

function ok(condition: unknown, message: string): void { if (!condition) throw new Error(`ASSERTION_FAILED:${message}`); }
function throws(fn:()=>void, contains:string):void { try{fn();throw new Error(`EXPECTED_THROW:${contains}`)}catch(e){if(e instanceof Error && e.message.startsWith('EXPECTED_THROW'))throw e;ok(e instanceof Error && e.message.includes(contains),`throw should include ${contains}`)} }

ok(formatOidCode("LOT", 37, 2026)==="OID-LOT-2026-00037","lot code");
ok(formatOidCode("SUP", 4, 2026)==="OID-SUP-000004","supplier code");

const blockers=getReleaseBlockers({lotStatus:"QUALITY_REVIEW",releaseGateStatus:"IN_REVIEW",reviewedPassingIndependentTests:0,blockingExceptions:0,hasReceiptTraceability:true,hasSupplierLot:true});
ok(blockers.includes("INDEPENDENT_TEST_NOT_PASSED_AND_REVIEWED"),"independent test release blocker");
throws(()=>assertCanAllocate({lotStatus:"QUARANTINE",releaseGateStatus:"BLOCKED",availableQuantity:10,requestedQuantity:1}),"LOT_NOT_RELEASED");
ok(calculateAvailableQuantity([{quantityIn:10,quantityOut:0},{quantityIn:0,quantityOut:3}])===7,"movement-derived inventory");

const gaps=getTraceabilityGaps({purchaseOrderId:"po",receiptId:"r",receiptItemId:"ri",supplierLot:"A",sampleCount:1,reviewedPassingIndependentTests:1,blockingExceptions:0});
ok(gaps.length===0,"complete traceability");

throws(()=>assertActionCanComplete({status:"OPEN",resolution:"done",evidenceCount:0}),"ACTION_EVIDENCE_REQUIRED");
assertActionCanComplete({status:"OPEN",resolution:"Corrected document received and reviewed",evidenceCount:1});
throws(()=>assertCriticalExceptionCanClose({severity:"CRITICAL",resolution:"resolved",evidenceCount:1,reviewerAuthorized:false}),"CRITICAL_EXCEPTION_AUTHORIZATION_REQUIRED");
assertCriticalExceptionCanClose({severity:"CRITICAL",resolution:"resolved",evidenceCount:2,reviewerAuthorized:true});
throws(()=>assertCapaCanClose({rootCause:"cause",correctiveAction:"fix",effectivenessStatus:"PENDING"}),"CAPA_EFFECTIVENESS_NOT_CONFIRMED");
assertCapaCanClose({rootCause:"cause",correctiveAction:"fix",effectivenessStatus:"EFFECTIVE"});
throws(()=>assertDecisionCanFinalize({status:"READY_FOR_REVIEW",evidenceCount:0,finalDecision:"approve",authorized:true}),"DECISION_EVIDENCE_REQUIRED");
assertDecisionCanFinalize({status:"READY_FOR_REVIEW",evidenceCount:2,finalDecision:"approve",authorized:true});

const intel=buildEvidenceResponse({answer:"Lot is on hold",evidence:[{oidCode:"OID-RES-2026-00001",entityType:"TEST_RESULT",summary:"PASS reviewed"},{oidCode:"OID-REC-2026-00001",entityType:"RECEIPT",summary:"Receipt linked"}],conflictingEvidence:[],unknowns:[],requiredActions:[]});
ok(intel.confidence==="HIGH","high confidence with complete evidence");
assertEvidenceRefsExist(intel.evidence,new Set(["OID-RES-2026-00001","OID-REC-2026-00001"]));
throws(()=>assertEvidenceRefsExist([{oidCode:"OID-FAKE-1",entityType:"LOT",summary:"bad"}],new Set()),"UNKNOWN_EVIDENCE_REFERENCE");

const status=classifyLegacyRow({row:{source:"legacy.xlsx",sheet:"Lots",row:"7",legacyIdentifier:"L7",values:{supplierLot:"A"}},requiredFields:["supplierLot"],duplicate:false,conflicts:[]});
ok(status==="IMPORTED_UNREVIEWED","legacy rows do not auto-verify");
throws(()=>assertImportCanCommit({conflictsOpen:1,dryRunCompleted:true,approvedByAuthorizedUser:true}),"IMPORT_CONFLICTS_OPEN");
assertImportCanCommit({conflictsOpen:0,dryRunCompleted:true,approvedByAuthorizedUser:true});

console.log("OID core domain validation: PASS");
