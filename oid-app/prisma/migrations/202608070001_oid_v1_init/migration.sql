CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN CREATE TYPE "EvidenceState" AS ENUM ('UNKNOWN', 'UNVERIFIED', 'OBSERVED', 'DOCUMENTED', 'INFERRED', 'PROVISIONAL', 'VERIFIED', 'CONFLICTING', 'SUPERSEDED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ReviewStatus" AS ENUM ('NOT_REVIEWED', 'NEEDS_REVIEW', 'IN_REVIEW', 'REVIEWED', 'APPROVED', 'REJECTED', 'SUPERSEDED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ProductStatus" AS ENUM ('DISCOVERY', 'RESEARCH', 'UNDER_REVIEW', 'DOCUMENTATION_INCOMPLETE', 'TESTING_REQUIRED', 'GATE_REVIEW', 'PROVISIONALLY_APPROVED', 'RELEASED', 'HOLD', 'BLOCKED', 'RETIRED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SupplierType" AS ENUM ('MANUFACTURER', 'TRADING_COMPANY', 'DISTRIBUTOR', 'BROKER', 'UNKNOWN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SupplierQualificationStatus" AS ENUM ('UNSCREENED', 'SCREENING', 'CONDITIONAL', 'QUALIFIED', 'PRODUCT_SPECIFIC_APPROVAL', 'HOLD', 'BLOCKED', 'RETIRED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LotStatus" AS ENUM ('EXPECTED', 'RECEIVED', 'QUARANTINE', 'DOCUMENT_REVIEW', 'SAMPLING', 'TESTING', 'QUALITY_REVIEW', 'RELEASED', 'HOLD', 'REJECTED', 'RECALLED', 'DESTROYED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "GateStatus" AS ENUM ('NOT_STARTED', 'INCOMPLETE', 'IN_REVIEW', 'PASS', 'FAIL', 'BLOCKED', 'NOT_APPLICABLE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'AWAITING_DOCUMENTS', 'PENDING_APPROVAL', 'AUTHORIZED', 'PLACED', 'PARTIALLY_SHIPPED', 'SHIPPED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED', 'HOLD', 'CLOSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PaymentStatus" AS ENUM ('NOT_DUE', 'PENDING', 'PARTIALLY_PAID', 'PAID', 'DISPUTED', 'REFUNDED', 'VOID'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SampleStatus" AS ENUM ('PLANNED', 'COLLECTED', 'SEALED', 'SHIPPED', 'RECEIVED_BY_LAB', 'TESTING', 'COMPLETE', 'VOID'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LaboratoryStatus" AS ENUM ('PROSPECTIVE', 'UNDER_REVIEW', 'ACTIVE', 'PREFERRED', 'HOLD', 'INACTIVE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TestOrderStatus" AS ENUM ('PLANNED', 'QUOTE_REQUESTED', 'QUOTE_RECEIVED', 'AUTHORIZED', 'SAMPLE_SENT', 'RECEIVED_BY_LAB', 'TESTING', 'RESULT_RECEIVED', 'RESULT_REVIEW', 'COMPLETE', 'INVESTIGATION', 'VOID'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TestResultStatus" AS ENUM ('PASS', 'FAIL', 'INCONCLUSIVE', 'RETEST_REQUIRED', 'NOT_EVALUATED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "DocumentType" AS ENUM ('COA', 'CHROMATOGRAM', 'LAB_REPORT', 'INVOICE', 'PURCHASE_ORDER', 'PACKING_SLIP', 'SPECIFICATION', 'QUALITY_AGREEMENT', 'LAB_QUOTE', 'RECEIPT_PHOTO', 'SHIPPING_RECORD', 'CUSTOMER_DOCUMENT', 'COMPLAINT', 'CAPA', 'PROCEDURE', 'TRAINING_RECORD', 'LEGAL_REVIEW', 'CORRESPONDENCE', 'RESEARCH_SOURCE', 'MARKET_SOURCE', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "DocumentVerification" AS ENUM ('UNREVIEWED', 'MATCHED', 'PARTIAL_MATCH', 'MISMATCH', 'INVALID', 'SUPERSEDED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ExceptionSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ExceptionStatus" AS ENUM ('OPEN', 'ASSIGNED', 'INVESTIGATING', 'WAITING', 'MITIGATED', 'CLOSED', 'ACCEPTED_RISK', 'REOPENED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "BlocksProcess" AS ENUM ('NONE', 'PAYMENT', 'PURCHASE', 'RECEIPT', 'SAMPLING', 'TESTING', 'RELEASE', 'ALLOCATION', 'SHIPMENT', 'PUBLICATION', 'COMMERCIAL_LAUNCH', 'ALL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "InventoryMovementType" AS ENUM ('RECEIPT', 'SAMPLE', 'RELEASE', 'ALLOCATION', 'RETURN', 'DAMAGE', 'ADJUSTMENT', 'DESTRUCTION', 'RECALL', 'TRANSFER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AuditEventType" AS ENUM ('CREATE', 'UPDATE', 'STATUS_CHANGE', 'CORRECTION', 'APPROVE', 'REJECT', 'RELEASE', 'RECALL', 'LOGIN', 'FAILED_LOGIN', 'EXPORT', 'DOWNLOAD', 'SENSITIVE_VIEW', 'PERMISSION_CHANGE', 'ARCHIVE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "EntityLinkType" AS ENUM ('RELATED_TO', 'SUPPORTS', 'CONTRADICTS', 'DERIVED_FROM', 'SUPERSEDES', 'REQUIRES', 'BLOCKS', 'RESOLVES', 'ALLOCATED_TO', 'TESTED_BY', 'SUPPLIED_BY', 'DOCUMENTS', 'REFERENCES'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "OidCounter" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "entity" text NOT NULL,
  "year" integer NOT NULL,
  "currentValue" integer NOT NULL DEFAULT 0,
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("entity", "year")
);

CREATE TABLE IF NOT EXISTS "User" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "email" text NOT NULL UNIQUE,
  "firstName" text,
  "lastName" text,
  "displayName" text,
  "authProviderId" text UNIQUE,
  "status" text NOT NULL DEFAULT 'INVITED',
  "mfaEnabled" boolean NOT NULL DEFAULT false,
  "lastLoginAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Role" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "name" text NOT NULL UNIQUE,
  "description" text
);

CREATE TABLE IF NOT EXISTS "Permission" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "key" text NOT NULL UNIQUE,
  "description" text
);

CREATE TABLE IF NOT EXISTS "UserRole" (
  "userId" uuid NOT NULL,
  "roleId" uuid NOT NULL,
  "assignedAt" timestamptz NOT NULL DEFAULT now(),
  "assignedBy" uuid,
  PRIMARY KEY ("userId", "roleId")
);

CREATE TABLE IF NOT EXISTS "RolePermission" (
  "roleId" uuid NOT NULL,
  "permissionId" uuid NOT NULL,
  PRIMARY KEY ("roleId", "permissionId")
);

CREATE TABLE IF NOT EXISTS "Product" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "oidCode" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "canonicalName" text,
  "shortName" text,
  "casNumber" text,
  "molecularFormula" text,
  "molecularWeight" numeric,
  "sequence" text,
  "productFamily" text,
  "researchClassification" text,
  "descriptionInternal" text,
  "status" "ProductStatus" NOT NULL DEFAULT 'DISCOVERY',
  "evidenceState" "EvidenceState" NOT NULL DEFAULT 'UNKNOWN',
  "strategicPriority" integer,
  "ownerUserId" uuid,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "archivedAt" timestamptz
);

CREATE TABLE IF NOT EXISTS "Sku" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "oidCode" text NOT NULL UNIQUE,
  "productId" uuid NOT NULL,
  "internalSku" text NOT NULL UNIQUE,
  "displayName" text NOT NULL,
  "strengthValue" numeric,
  "strengthUnit" text,
  "form" text,
  "packageQuantity" numeric,
  "packageUnit" text,
  "storageRequirements" text,
  "status" text NOT NULL DEFAULT 'ACTIVE',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ProductGate" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "productId" uuid NOT NULL,
  "gateType" text NOT NULL,
  "status" "GateStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "requirementsJson" jsonb,
  "evidenceSummary" text,
  "reviewedBy" uuid,
  "reviewedAt" timestamptz,
  "approvedBy" uuid,
  "approvedAt" timestamptz,
  "blockedReason" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("productId", "gateType")
);

CREATE TABLE IF NOT EXISTS "Supplier" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "oidCode" text NOT NULL UNIQUE,
  "legalName" text NOT NULL,
  "tradeName" text,
  "supplierType" "SupplierType" NOT NULL DEFAULT 'UNKNOWN',
  "country" text,
  "addressLine1" text,
  "addressLine2" text,
  "city" text,
  "region" text,
  "postalCode" text,
  "website" text,
  "manufacturerStatus" text,
  "legalIdentityStatus" text,
  "ownershipStatus" text,
  "paymentBeneficiaryName" text,
  "qualificationStatus" "SupplierQualificationStatus" NOT NULL DEFAULT 'UNSCREENED',
  "riskLevel" text,
  "lastReviewAt" timestamptz,
  "nextReviewAt" timestamptz,
  "ownerUserId" uuid,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "SupplierProduct" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "supplierId" uuid NOT NULL,
  "productId" uuid NOT NULL,
  "skuId" uuid,
  "supplierProductName" text,
  "supplierCatalogReference" text,
  "status" text NOT NULL DEFAULT 'ACTIVE',
  "minimumOrderQuantity" numeric,
  "leadTimeDays" integer,
  "lastPrice" numeric,
  "currency" text,
  "documentationStatus" text,
  "qualificationStatus" "SupplierQualificationStatus" NOT NULL DEFAULT 'UNSCREENED',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("supplierId", "productId", "skuId")
);

CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "oidCode" text NOT NULL UNIQUE,
  "supplierId" uuid NOT NULL,
  "supplierReference" text,
  "orderDate" timestamptz,
  "currency" text NOT NULL DEFAULT 'USD',
  "subtotal" numeric NOT NULL DEFAULT 0,
  "shippingCost" numeric NOT NULL DEFAULT 0,
  "fees" numeric NOT NULL DEFAULT 0,
  "totalCost" numeric NOT NULL DEFAULT 0,
  "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NOT_DUE',
  "orderStatus" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "trackingNumber" text,
  "carrier" text,
  "expectedDeliveryDate" timestamptz,
  "actualDeliveryDate" timestamptz,
  "createdBy" uuid,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "PurchaseOrderItem" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "purchaseOrderId" uuid NOT NULL,
  "productId" uuid NOT NULL,
  "skuId" uuid,
  "supplierProductName" text,
  "quantity" numeric NOT NULL,
  "unit" text NOT NULL,
  "unitCost" numeric NOT NULL DEFAULT 0,
  "totalCost" numeric NOT NULL DEFAULT 0,
  "expectedSupplierLot" text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Receipt" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "oidCode" text NOT NULL UNIQUE,
  "purchaseOrderId" uuid NOT NULL,
  "receivedAt" timestamptz NOT NULL,
  "receivedBy" uuid,
  "carrier" text,
  "trackingNumber" text,
  "packageCondition" text,
  "temperatureCondition" text,
  "photographsComplete" boolean NOT NULL DEFAULT false,
  "packingSlipPresent" boolean NOT NULL DEFAULT false,
  "invoicePresent" boolean NOT NULL DEFAULT false,
  "notes" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ReceiptItem" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "receiptId" uuid NOT NULL,
  "purchaseOrderItemId" uuid NOT NULL,
  "productId" uuid NOT NULL,
  "skuId" uuid,
  "supplierLot" text,
  "quantityReceived" numeric NOT NULL,
  "unit" text NOT NULL,
  "labelPresent" boolean NOT NULL DEFAULT false,
  "lotMarkingPresent" boolean NOT NULL DEFAULT false,
  "coaReceived" boolean NOT NULL DEFAULT false,
  "conditionStatus" text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Lot" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "oidCode" text NOT NULL UNIQUE,
  "productId" uuid NOT NULL,
  "skuId" uuid,
  "supplierId" uuid NOT NULL,
  "purchaseOrderId" uuid,
  "receiptId" uuid,
  "receiptItemId" uuid,
  "supplierLot" text NOT NULL,
  "receivedQuantity" numeric NOT NULL DEFAULT 0,
  "quantityUnit" text NOT NULL,
  "status" "LotStatus" NOT NULL DEFAULT 'EXPECTED',
  "releaseGateStatus" "GateStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "receivedAt" timestamptz,
  "releasedAt" timestamptz,
  "releasedBy" uuid,
  "rejectedAt" timestamptz,
  "rejectedBy" uuid,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Laboratory" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "oidCode" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "legalName" text,
  "website" text,
  "address" text,
  "country" text,
  "status" "LaboratoryStatus" NOT NULL DEFAULT 'PROSPECTIVE',
  "accreditationStatus" text,
  "accreditationNumber" text,
  "accreditationExpiry" timestamptz,
  "primaryContact" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Sample" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "oidCode" text NOT NULL UNIQUE,
  "lotId" uuid NOT NULL,
  "laboratoryId" uuid,
  "sampleType" text,
  "quantity" numeric NOT NULL,
  "unit" text NOT NULL,
  "collectedAt" timestamptz,
  "collectedBy" uuid,
  "chainOfCustodyStatus" text,
  "sealed" boolean NOT NULL DEFAULT false,
  "shipmentTracking" text,
  "labAccessionNumber" text,
  "receivedByLabAt" timestamptz,
  "status" "SampleStatus" NOT NULL DEFAULT 'PLANNED',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "TestOrder" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "oidCode" text NOT NULL UNIQUE,
  "sampleId" uuid NOT NULL,
  "lotId" uuid NOT NULL,
  "laboratoryId" uuid NOT NULL,
  "testType" text NOT NULL,
  "methodRequested" text,
  "quoteReference" text,
  "orderedAt" timestamptz,
  "expectedResultDate" timestamptz,
  "resultReceivedAt" timestamptz,
  "status" "TestOrderStatus" NOT NULL DEFAULT 'PLANNED',
  "cost" numeric,
  "currency" text NOT NULL DEFAULT 'USD',
  "invoiceReference" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "TestResult" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "oidCode" text NOT NULL UNIQUE,
  "testOrderId" uuid NOT NULL,
  "sampleId" uuid NOT NULL,
  "lotId" uuid NOT NULL,
  "testType" text NOT NULL,
  "method" text,
  "numericResult" numeric,
  "resultUnit" text,
  "textResult" text,
  "acceptanceCriteria" text,
  "resultStatus" "TestResultStatus" NOT NULL DEFAULT 'NOT_EVALUATED',
  "testDate" timestamptz,
  "rawResultJson" jsonb,
  "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'NOT_REVIEWED',
  "reviewedBy" uuid,
  "reviewedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Document" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "oidCode" text NOT NULL UNIQUE,
  "documentType" "DocumentType" NOT NULL,
  "title" text NOT NULL,
  "originalFilename" text NOT NULL,
  "storageKey" text NOT NULL,
  "mimeType" text NOT NULL,
  "fileSize" integer,
  "sha256Hash" text NOT NULL,
  "issueDate" timestamptz,
  "receivedDate" timestamptz,
  "sourceType" text,
  "sourceName" text,
  "version" integer NOT NULL DEFAULT 1,
  "status" text NOT NULL DEFAULT 'ACTIVE',
  "verificationStatus" "DocumentVerification" NOT NULL DEFAULT 'UNREVIEWED',
  "supersedesDocumentId" uuid,
  "uploadedBy" uuid,
  "uploadedAt" timestamptz NOT NULL DEFAULT now(),
  "verifiedBy" uuid,
  "verifiedAt" timestamptz
);

CREATE TABLE IF NOT EXISTS "DocumentLink" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "documentId" uuid NOT NULL,
  "entityType" text NOT NULL,
  "entityId" text NOT NULL,
  "relationshipType" "EntityLinkType" NOT NULL DEFAULT 'DOCUMENTS',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid
);

CREATE TABLE IF NOT EXISTS "EntityLink" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "sourceEntityType" text NOT NULL,
  "sourceEntityId" text NOT NULL,
  "relationshipType" "EntityLinkType" NOT NULL,
  "targetEntityType" text NOT NULL,
  "targetEntityId" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  UNIQUE ("sourceEntityType", "sourceEntityId", "relationshipType", "targetEntityType", "targetEntityId")
);

CREATE TABLE IF NOT EXISTS "InventoryMovement" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "oidCode" text NOT NULL UNIQUE,
  "lotId" uuid NOT NULL,
  "movementType" "InventoryMovementType" NOT NULL,
  "quantityIn" numeric NOT NULL DEFAULT 0,
  "quantityOut" numeric NOT NULL DEFAULT 0,
  "unit" text NOT NULL,
  "referenceType" text,
  "referenceId" text,
  "reason" text,
  "performedBy" uuid,
  "approvedBy" uuid,
  "occurredAt" timestamptz NOT NULL DEFAULT now(),
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Allocation" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "oidCode" text NOT NULL UNIQUE,
  "lotId" uuid NOT NULL,
  "customerOrderRef" text NOT NULL,
  "customerOrderItemId" uuid,
  "quantity" numeric NOT NULL,
  "unit" text NOT NULL,
  "allocationStatus" text NOT NULL DEFAULT 'ALLOCATED',
  "allocatedAt" timestamptz NOT NULL DEFAULT now(),
  "allocatedBy" uuid
);

CREATE TABLE IF NOT EXISTS "Exception" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "oidCode" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "severity" "ExceptionSeverity" NOT NULL,
  "status" "ExceptionStatus" NOT NULL DEFAULT 'OPEN',
  "lotId" uuid,
  "entityType" text,
  "entityId" text,
  "blocksProcess" "BlocksProcess" NOT NULL DEFAULT 'NONE',
  "evidenceSummary" text,
  "ownerUserId" uuid,
  "discoveredAt" timestamptz NOT NULL DEFAULT now(),
  "dueAt" timestamptz,
  "resolution" text,
  "resolvedAt" timestamptz,
  "resolvedBy" uuid,
  "riskAcceptedBy" uuid,
  "riskAcceptedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "oidCode" text NOT NULL UNIQUE,
  "eventType" "AuditEventType" NOT NULL,
  "userId" uuid,
  "sessionId" text,
  "entityType" text NOT NULL,
  "entityId" text NOT NULL,
  "previousValues" jsonb,
  "newValues" jsonb,
  "reason" text,
  "ipAddress" text,
  "userAgent" text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "actions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "oid_code" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "description" text,
  "priority" text NOT NULL DEFAULT 'MEDIUM',
  "entity_type" text,
  "entity_id" text,
  "assigned_to" uuid,
  "status" text NOT NULL DEFAULT 'OPEN',
  "due_at" timestamptz,
  "completed_at" timestamptz,
  "source_reference" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "capas" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "oid_code" text NOT NULL UNIQUE,
  "exception_id" uuid,
  "title" text NOT NULL,
  "containment_action" text,
  "root_cause" text,
  "corrective_action" text,
  "preventive_action" text,
  "owner_id" uuid,
  "status" text NOT NULL DEFAULT 'OPEN',
  "due_at" timestamptz,
  "implementation_date" timestamptz,
  "effectiveness_review" text,
  "effectiveness_status" text,
  "closed_at" timestamptz,
  "closed_by" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "decisions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "oid_code" text NOT NULL UNIQUE,
  "decision_type" text NOT NULL,
  "title" text NOT NULL,
  "question" text,
  "context" text,
  "options_considered" jsonb,
  "recommendation" text,
  "final_decision" text,
  "conditions" text,
  "decision_status" text NOT NULL DEFAULT 'DRAFT',
  "decision_maker" uuid,
  "decision_date" timestamptz,
  "review_date" timestamptz,
  "outcome" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "decision_evidence" (
  "decision_id" uuid NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text NOT NULL,
  "relationship" text NOT NULL,
  PRIMARY KEY ("decision_id", "entity_type", "entity_id", "relationship")
);

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "user_id" uuid,
  "event_type" text NOT NULL,
  "entity_type" text,
  "entity_id" text,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "severity" text NOT NULL DEFAULT 'INFO',
  "read_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "organizations" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "oid_code" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "legal_name" text,
  "organization_type" text,
  "website" text,
  "domain" text,
  "business_address" text,
  "verification_status" text NOT NULL DEFAULT 'NOT_STARTED',
  "account_status" text NOT NULL DEFAULT 'PROSPECT',
  "risk_level" text,
  "commerce_customer_id" text,
  "account_owner" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "customer_orders" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "oid_code" text NOT NULL UNIQUE,
  "organization_id" uuid NOT NULL,
  "commerce_order_id" text UNIQUE,
  "order_date" timestamptz,
  "order_status" text NOT NULL DEFAULT 'OPEN',
  "currency" text NOT NULL DEFAULT 'USD',
  "subtotal" numeric NOT NULL DEFAULT 0,
  "shipping" numeric NOT NULL DEFAULT 0,
  "total" numeric NOT NULL DEFAULT 0,
  "payment_status" text NOT NULL DEFAULT 'PENDING',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "customer_order_items" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "customer_order_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "sku_id" uuid,
  "quantity" numeric NOT NULL,
  "unit" text NOT NULL,
  "unit_price" numeric NOT NULL DEFAULT 0,
  "total_price" numeric NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "competitors" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "name" text NOT NULL UNIQUE,
  "website" text,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "market_observations" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "oid_code" text NOT NULL UNIQUE,
  "product_id" uuid,
  "competitor_id" uuid,
  "observation_type" text NOT NULL,
  "title" text NOT NULL,
  "observation" text NOT NULL,
  "source_url" text,
  "source_document_id" uuid,
  "observed_at" timestamptz NOT NULL,
  "evidence_state" text NOT NULL DEFAULT 'OBSERVED',
  "confidence" numeric,
  "commercial_relevance" text,
  "created_by" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "research_sources" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "oid_code" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "source_type" text,
  "authors" text,
  "publisher" text,
  "publication_date" date,
  "doi" text,
  "pmid" text,
  "url" text,
  "abstract_text" text,
  "product_id" uuid,
  "evidence_quality" text,
  "review_status" text NOT NULL DEFAULT 'NOT_REVIEWED',
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "intelligence_queries" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "user_id" uuid,
  "question" text NOT NULL,
  "normalized_question" text,
  "answer" text,
  "confidence" text,
  "evidence" jsonb NOT NULL,
  "conflicting_evidence" jsonb NOT NULL,
  "unknowns" jsonb NOT NULL,
  "required_actions" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "import_batches" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "name" text NOT NULL,
  "source_name" text NOT NULL,
  "source_sha256" text,
  "status" text NOT NULL DEFAULT 'STAGED',
  "started_at" timestamptz,
  "completed_at" timestamptz,
  "created_by" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "migration_conflicts" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "import_batch_id" uuid NOT NULL,
  "entity_type" text NOT NULL,
  "legacy_identifier" text,
  "conflict_type" text NOT NULL,
  "source_value" jsonb,
  "existing_value" jsonb,
  "resolution_status" text NOT NULL DEFAULT 'OPEN',
  "resolved_value" jsonb,
  "resolved_by" uuid,
  "resolved_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "legacy_import_map" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "import_batch_id" uuid NOT NULL,
  "entity_type" text NOT NULL,
  "legacy_source" text NOT NULL,
  "legacy_sheet" text,
  "legacy_row" text,
  "legacy_identifier" text,
  "oid_entity_id" text,
  "oid_code" text,
  "import_review_status" text NOT NULL DEFAULT 'IMPORTED_UNREVIEWED',
  "imported_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("import_batch_id", "entity_type", "legacy_source", "legacy_sheet", "legacy_row")
);

DO $$ BEGIN ALTER TABLE "UserRole" ADD CONSTRAINT "fk_UserRole_userId" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "UserRole" ADD CONSTRAINT "fk_UserRole_roleId" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "RolePermission" ADD CONSTRAINT "fk_RolePermission_roleId" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "RolePermission" ADD CONSTRAINT "fk_RolePermission_permissionId" FOREIGN KEY ("permissionId") REFERENCES "Permission" ("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Sku" ADD CONSTRAINT "fk_Sku_productId" FOREIGN KEY ("productId") REFERENCES "Product" ("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ProductGate" ADD CONSTRAINT "fk_ProductGate_productId" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "SupplierProduct" ADD CONSTRAINT "fk_SupplierProduct_supplierId" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "SupplierProduct" ADD CONSTRAINT "fk_SupplierProduct_productId" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "SupplierProduct" ADD CONSTRAINT "fk_SupplierProduct_skuId" FOREIGN KEY ("skuId") REFERENCES "Sku" ("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "fk_PurchaseOrder_supplierId" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "fk_PurchaseOrderItem_purchaseOrderId" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "fk_PurchaseOrderItem_productId" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "fk_PurchaseOrderItem_skuId" FOREIGN KEY ("skuId") REFERENCES "Sku" ("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Receipt" ADD CONSTRAINT "fk_Receipt_purchaseOrderId" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReceiptItem" ADD CONSTRAINT "fk_ReceiptItem_receiptId" FOREIGN KEY ("receiptId") REFERENCES "Receipt" ("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReceiptItem" ADD CONSTRAINT "fk_ReceiptItem_purchaseOrderItemId" FOREIGN KEY ("purchaseOrderItemId") REFERENCES "PurchaseOrderItem" ("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReceiptItem" ADD CONSTRAINT "fk_ReceiptItem_productId" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReceiptItem" ADD CONSTRAINT "fk_ReceiptItem_skuId" FOREIGN KEY ("skuId") REFERENCES "Sku" ("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Lot" ADD CONSTRAINT "fk_Lot_productId" FOREIGN KEY ("productId") REFERENCES "Product" ("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Lot" ADD CONSTRAINT "fk_Lot_skuId" FOREIGN KEY ("skuId") REFERENCES "Sku" ("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Lot" ADD CONSTRAINT "fk_Lot_supplierId" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Lot" ADD CONSTRAINT "fk_Lot_purchaseOrderId" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Lot" ADD CONSTRAINT "fk_Lot_receiptId" FOREIGN KEY ("receiptId") REFERENCES "Receipt" ("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Lot" ADD CONSTRAINT "fk_Lot_receiptItemId" FOREIGN KEY ("receiptItemId") REFERENCES "ReceiptItem" ("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Sample" ADD CONSTRAINT "fk_Sample_lotId" FOREIGN KEY ("lotId") REFERENCES "Lot" ("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Sample" ADD CONSTRAINT "fk_Sample_laboratoryId" FOREIGN KEY ("laboratoryId") REFERENCES "Laboratory" ("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "TestOrder" ADD CONSTRAINT "fk_TestOrder_sampleId" FOREIGN KEY ("sampleId") REFERENCES "Sample" ("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "TestOrder" ADD CONSTRAINT "fk_TestOrder_lotId" FOREIGN KEY ("lotId") REFERENCES "Lot" ("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "TestOrder" ADD CONSTRAINT "fk_TestOrder_laboratoryId" FOREIGN KEY ("laboratoryId") REFERENCES "Laboratory" ("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "TestResult" ADD CONSTRAINT "fk_TestResult_testOrderId" FOREIGN KEY ("testOrderId") REFERENCES "TestOrder" ("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "TestResult" ADD CONSTRAINT "fk_TestResult_sampleId" FOREIGN KEY ("sampleId") REFERENCES "Sample" ("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "TestResult" ADD CONSTRAINT "fk_TestResult_lotId" FOREIGN KEY ("lotId") REFERENCES "Lot" ("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Document" ADD CONSTRAINT "fk_Document_supersedesDocumentId" FOREIGN KEY ("supersedesDocumentId") REFERENCES "Document" ("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "DocumentLink" ADD CONSTRAINT "fk_DocumentLink_documentId" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "InventoryMovement" ADD CONSTRAINT "fk_InventoryMovement_lotId" FOREIGN KEY ("lotId") REFERENCES "Lot" ("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Allocation" ADD CONSTRAINT "fk_Allocation_lotId" FOREIGN KEY ("lotId") REFERENCES "Lot" ("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Exception" ADD CONSTRAINT "fk_Exception_lotId" FOREIGN KEY ("lotId") REFERENCES "Lot" ("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AuditLog" ADD CONSTRAINT "fk_AuditLog_userId" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "idx_Lot_supplierId_supplierLot" ON "Lot" ("supplierId", "supplierLot");
CREATE INDEX IF NOT EXISTS "idx_Sample_labAccessionNumber" ON "Sample" ("labAccessionNumber");
CREATE INDEX IF NOT EXISTS "idx_Document_sha256Hash" ON "Document" ("sha256Hash");
CREATE INDEX IF NOT EXISTS "idx_DocumentLink_entityType_entityId" ON "DocumentLink" ("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "idx_EntityLink_sourceEntityType_sourceEntityId" ON "EntityLink" ("sourceEntityType", "sourceEntityId");
CREATE INDEX IF NOT EXISTS "idx_EntityLink_targetEntityType_targetEntityId" ON "EntityLink" ("targetEntityType", "targetEntityId");
CREATE INDEX IF NOT EXISTS "idx_InventoryMovement_lotId_occurredAt" ON "InventoryMovement" ("lotId", "occurredAt");
CREATE INDEX IF NOT EXISTS "idx_AuditLog_entityType_entityId_createdAt" ON "AuditLog" ("entityType", "entityId", "createdAt");
DO $$ BEGIN ALTER TABLE "capas" ADD CONSTRAINT "fk_capas_exception_id" FOREIGN KEY ("exception_id") REFERENCES "Exception" ("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "customer_orders" ADD CONSTRAINT "fk_customer_orders_organization_id" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "customer_order_items" ADD CONSTRAINT "fk_customer_order_items_customer_order_id" FOREIGN KEY ("customer_order_id") REFERENCES "customer_orders" ("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "customer_order_items" ADD CONSTRAINT "fk_customer_order_items_product_id" FOREIGN KEY ("product_id") REFERENCES "Product" ("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "customer_order_items" ADD CONSTRAINT "fk_customer_order_items_sku_id" FOREIGN KEY ("sku_id") REFERENCES "Sku" ("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "market_observations" ADD CONSTRAINT "fk_market_observations_product_id" FOREIGN KEY ("product_id") REFERENCES "Product" ("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "market_observations" ADD CONSTRAINT "fk_market_observations_competitor_id" FOREIGN KEY ("competitor_id") REFERENCES "competitors" ("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "market_observations" ADD CONSTRAINT "fk_market_observations_source_document_id" FOREIGN KEY ("source_document_id") REFERENCES "Document" ("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "research_sources" ADD CONSTRAINT "fk_research_sources_product_id" FOREIGN KEY ("product_id") REFERENCES "Product" ("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "migration_conflicts" ADD CONSTRAINT "fk_migration_conflicts_import_batch_id" FOREIGN KEY ("import_batch_id") REFERENCES "import_batches" ("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "legacy_import_map" ADD CONSTRAINT "fk_legacy_import_map_import_batch_id" FOREIGN KEY ("import_batch_id") REFERENCES "import_batches" ("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Allocation" ADD CONSTRAINT "fk_Allocation_customerOrderItemId" FOREIGN KEY ("customerOrderItemId") REFERENCES "customer_order_items" ("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- OID critical database-level controls
CREATE OR REPLACE FUNCTION oid_allocation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ls "LotStatus"; gs "GateStatus"; available numeric;
BEGIN
  SELECT "status", "releaseGateStatus" INTO ls, gs FROM "Lot" WHERE "id"=NEW."lotId" FOR UPDATE;
  IF ls IS DISTINCT FROM 'RELEASED' THEN RAISE EXCEPTION 'ALLOCATION_BLOCKED:LOT_NOT_RELEASED'; END IF;
  IF gs IS DISTINCT FROM 'PASS' THEN RAISE EXCEPTION 'ALLOCATION_BLOCKED:RELEASE_GATE_NOT_PASS'; END IF;
  SELECT COALESCE(SUM("quantityIn"-"quantityOut"),0) INTO available FROM "InventoryMovement" WHERE "lotId"=NEW."lotId";
  IF available < NEW."quantity" THEN RAISE EXCEPTION 'ALLOCATION_BLOCKED:INSUFFICIENT_INVENTORY'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS allocation_guard ON "Allocation";
CREATE TRIGGER allocation_guard BEFORE INSERT ON "Allocation" FOR EACH ROW EXECUTE FUNCTION oid_allocation_guard();
CREATE OR REPLACE FUNCTION oid_audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'AUDIT_LOG_IMMUTABLE'; END $$;
DROP TRIGGER IF EXISTS audit_immutable_update ON "AuditLog";
CREATE TRIGGER audit_immutable_update BEFORE UPDATE OR DELETE ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION oid_audit_immutable();
