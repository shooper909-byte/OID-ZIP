-- OID M1 Traceability expansion. Apply after 0001_oid_core.sql.

CREATE TYPE purchase_order_status AS ENUM ('DRAFT','AWAITING_DOCUMENTS','PENDING_APPROVAL','AUTHORIZED','PLACED','PARTIALLY_SHIPPED','SHIPPED','PARTIALLY_RECEIVED','RECEIVED','CANCELLED','HOLD','CLOSED');
CREATE TYPE payment_status AS ENUM ('NOT_DUE','PENDING','PARTIALLY_PAID','PAID','DISPUTED','REFUNDED','VOID');
CREATE TYPE laboratory_status AS ENUM ('PROSPECTIVE','UNDER_REVIEW','ACTIVE','PREFERRED','HOLD','INACTIVE');
CREATE TYPE sample_status AS ENUM ('PLANNED','COLLECTED','SEALED','SHIPPED','RECEIVED_BY_LAB','TESTING','COMPLETE','VOID');
CREATE TYPE test_order_status AS ENUM ('PLANNED','QUOTE_REQUESTED','QUOTE_RECEIVED','AUTHORIZED','SAMPLE_SENT','RECEIVED_BY_LAB','TESTING','RESULT_RECEIVED','RESULT_REVIEW','COMPLETE','INVESTIGATION','VOID');
CREATE TYPE document_verification AS ENUM ('UNREVIEWED','MATCHED','PARTIAL_MATCH','MISMATCH','INVALID','SUPERSEDED');
CREATE TYPE entity_link_type AS ENUM ('RELATED_TO','SUPPORTS','CONTRADICTS','DERIVED_FROM','SUPERSEDES','REQUIRES','BLOCKS','RESOLVES','ALLOCATED_TO','TESTED_BY','SUPPLIED_BY','DOCUMENTS','REFERENCES');


CREATE TABLE oid_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity text NOT NULL,
  year integer NOT NULL,
  current_value bigint NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entity, year)
);

CREATE TABLE purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oid_code varchar(40) UNIQUE NOT NULL,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  supplier_reference text,
  order_date timestamptz,
  currency text NOT NULL DEFAULT 'USD',
  subtotal numeric(18,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  shipping_cost numeric(18,2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
  fees numeric(18,2) NOT NULL DEFAULT 0 CHECK (fees >= 0),
  total_cost numeric(18,2) NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  payment_status payment_status NOT NULL DEFAULT 'NOT_DUE',
  order_status purchase_order_status NOT NULL DEFAULT 'DRAFT',
  tracking_number text,
  carrier text,
  expected_delivery_date timestamptz,
  actual_delivery_date timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  sku_ref text,
  supplier_product_name text,
  quantity numeric(18,6) NOT NULL CHECK (quantity > 0),
  unit text NOT NULL,
  unit_cost numeric(18,6) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  total_cost numeric(18,2) NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  expected_supplier_lot text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oid_code varchar(40) UNIQUE NOT NULL,
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id),
  received_at timestamptz NOT NULL,
  received_by uuid,
  carrier text,
  tracking_number text,
  package_condition text,
  temperature_condition text,
  photographs_complete boolean NOT NULL DEFAULT false,
  packing_slip_present boolean NOT NULL DEFAULT false,
  invoice_present boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  purchase_order_item_id uuid NOT NULL REFERENCES purchase_order_items(id),
  product_id uuid NOT NULL REFERENCES products(id),
  sku_ref text,
  supplier_lot text,
  quantity_received numeric(18,6) NOT NULL CHECK (quantity_received > 0),
  unit text NOT NULL,
  label_present boolean NOT NULL DEFAULT false,
  lot_marking_present boolean NOT NULL DEFAULT false,
  coa_received boolean NOT NULL DEFAULT false,
  condition_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lots ADD COLUMN purchase_order_id uuid REFERENCES purchase_orders(id);
ALTER TABLE lots ADD COLUMN receipt_id uuid REFERENCES receipts(id);
ALTER TABLE lots ADD COLUMN receipt_item_id uuid REFERENCES receipt_items(id);

CREATE TABLE laboratories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oid_code varchar(40) UNIQUE NOT NULL,
  name text NOT NULL,
  legal_name text,
  website text,
  address text,
  country text,
  status laboratory_status NOT NULL DEFAULT 'PROSPECTIVE',
  accreditation_status text,
  accreditation_number text,
  accreditation_expiry timestamptz,
  primary_contact text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE samples ADD COLUMN laboratory_id uuid REFERENCES laboratories(id);
ALTER TABLE samples ADD COLUMN sample_type text;
ALTER TABLE samples ADD COLUMN collected_at timestamptz;
ALTER TABLE samples ADD COLUMN collected_by uuid;
ALTER TABLE samples ADD COLUMN sealed boolean NOT NULL DEFAULT false;
ALTER TABLE samples ADD COLUMN shipment_tracking text;
ALTER TABLE samples ADD COLUMN received_by_lab_at timestamptz;
ALTER TABLE samples ADD COLUMN status sample_status NOT NULL DEFAULT 'PLANNED';
ALTER TABLE samples ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX samples_accession_idx ON samples(lab_accession_number);

CREATE TABLE test_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oid_code varchar(40) UNIQUE NOT NULL,
  sample_id uuid NOT NULL REFERENCES samples(id),
  lot_id uuid NOT NULL REFERENCES lots(id),
  laboratory_id uuid NOT NULL REFERENCES laboratories(id),
  test_type text NOT NULL,
  method_requested text,
  quote_reference text,
  ordered_at timestamptz,
  expected_result_date timestamptz,
  result_received_at timestamptz,
  status test_order_status NOT NULL DEFAULT 'PLANNED',
  cost numeric(18,2) CHECK (cost IS NULL OR cost >= 0),
  currency text NOT NULL DEFAULT 'USD',
  invoice_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE test_results ADD COLUMN test_order_id uuid REFERENCES test_orders(id);
ALTER TABLE test_results ADD COLUMN test_date timestamptz;
ALTER TABLE test_results ADD COLUMN raw_result_json jsonb;

CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oid_code varchar(40) UNIQUE NOT NULL,
  document_type text NOT NULL,
  title text NOT NULL,
  original_filename text NOT NULL,
  storage_key text NOT NULL,
  mime_type text NOT NULL,
  file_size bigint CHECK (file_size IS NULL OR file_size >= 0),
  sha256_hash char(64) NOT NULL,
  issue_date timestamptz,
  received_date timestamptz,
  source_type text,
  source_name text,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  status text NOT NULL DEFAULT 'ACTIVE',
  verification_status document_verification NOT NULL DEFAULT 'UNREVIEWED',
  supersedes_document_id uuid REFERENCES documents(id),
  uploaded_by uuid,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  verified_by uuid,
  verified_at timestamptz
);
CREATE INDEX documents_hash_idx ON documents(sha256_hash);

CREATE TABLE document_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  relationship_type entity_link_type NOT NULL DEFAULT 'DOCUMENTS',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX document_links_entity_idx ON document_links(entity_type, entity_id);

CREATE TABLE entity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_entity_type text NOT NULL,
  source_entity_id text NOT NULL,
  relationship_type entity_link_type NOT NULL,
  target_entity_type text NOT NULL,
  target_entity_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE(source_entity_type, source_entity_id, relationship_type, target_entity_type, target_entity_id)
);
CREATE INDEX entity_links_source_idx ON entity_links(source_entity_type, source_entity_id);
CREATE INDEX entity_links_target_idx ON entity_links(target_entity_type, target_entity_id);

-- Release evidence view: independent PASS + human review, no active release blocker, exact receipt traceability.
CREATE VIEW lot_release_evidence AS
SELECT
  l.id AS lot_id,
  (l.purchase_order_id IS NOT NULL AND l.receipt_id IS NOT NULL AND l.receipt_item_id IS NOT NULL AND NULLIF(trim(l.supplier_lot), '') IS NOT NULL) AS has_receipt_traceability,
  COUNT(DISTINCT tr.id) FILTER (WHERE tr.result_status = 'PASS' AND tr.review_status IN ('REVIEWED','APPROVED')) AS reviewed_passing_tests,
  COUNT(DISTINCT e.id) FILTER (
    WHERE e.status NOT IN ('CLOSED','MITIGATED')
      AND e.blocks_process IN ('RELEASE','ALL')
  ) AS release_blockers
FROM lots l
LEFT JOIN test_results tr ON tr.lot_id = l.id
LEFT JOIN exceptions e ON e.lot_id = l.id
GROUP BY l.id;

CREATE OR REPLACE FUNCTION oid_assert_release_allowed(target_lot uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  current_status lot_status;
  evidence lot_release_evidence%ROWTYPE;
BEGIN
  SELECT status INTO current_status FROM lots WHERE id = target_lot FOR UPDATE;
  IF current_status IS NULL THEN RAISE EXCEPTION 'LOT_NOT_FOUND'; END IF;
  IF current_status <> 'QUALITY_REVIEW' THEN RAISE EXCEPTION 'LOT_RELEASE_BLOCKED:INVALID_STATUS'; END IF;

  SELECT * INTO evidence FROM lot_release_evidence WHERE lot_id = target_lot;
  IF evidence.has_receipt_traceability IS NOT TRUE THEN RAISE EXCEPTION 'LOT_RELEASE_BLOCKED:TRACEABILITY_INCOMPLETE'; END IF;
  IF evidence.reviewed_passing_tests < 1 THEN RAISE EXCEPTION 'LOT_RELEASE_BLOCKED:INDEPENDENT_TEST_NOT_PASSED_AND_REVIEWED'; END IF;
  IF evidence.release_blockers > 0 THEN RAISE EXCEPTION 'LOT_RELEASE_BLOCKED:OPEN_EXCEPTION'; END IF;
END $$;

CREATE OR REPLACE FUNCTION oid_release_lot(target_lot uuid, actor uuid, release_reason text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NULLIF(trim(release_reason), '') IS NULL THEN RAISE EXCEPTION 'RELEASE_REASON_REQUIRED'; END IF;
  PERFORM oid_assert_release_allowed(target_lot);
  UPDATE lots
  SET status = 'RELEASED', release_gate_status = 'PASS', released_at = now(), released_by = actor, updated_at = now()
  WHERE id = target_lot;
END $$;
