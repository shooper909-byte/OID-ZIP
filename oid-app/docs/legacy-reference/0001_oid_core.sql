CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE lot_status AS ENUM ('EXPECTED','RECEIVED','QUARANTINE','DOCUMENT_REVIEW','SAMPLING','TESTING','QUALITY_REVIEW','RELEASED','HOLD','REJECTED','RECALLED','DESTROYED');
CREATE TYPE gate_status AS ENUM ('NOT_STARTED','INCOMPLETE','IN_REVIEW','PASS','FAIL','BLOCKED','NOT_APPLICABLE');
CREATE TYPE exception_severity AS ENUM ('INFO','LOW','MEDIUM','HIGH','CRITICAL');
CREATE TYPE exception_status AS ENUM ('OPEN','ASSIGNED','INVESTIGATING','WAITING','MITIGATED','CLOSED','ACCEPTED_RISK','REOPENED');
CREATE TYPE blocks_process AS ENUM ('NONE','PAYMENT','PURCHASE','RECEIPT','SAMPLING','TESTING','RELEASE','ALLOCATION','SHIPMENT','PUBLICATION','COMMERCIAL_LAUNCH','ALL');
CREATE TYPE result_status AS ENUM ('PASS','FAIL','INCONCLUSIVE','RETEST_REQUIRED','NOT_EVALUATED');
CREATE TYPE review_status AS ENUM ('NOT_REVIEWED','NEEDS_REVIEW','IN_REVIEW','REVIEWED','APPROVED','REJECTED','SUPERSEDED');
CREATE TYPE movement_type AS ENUM ('RECEIPT','SAMPLE','RELEASE','ALLOCATION','RETURN','DAMAGE','ADJUSTMENT','DESTRUCTION','RECALL','TRANSFER');

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oid_code varchar(32) UNIQUE NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'DISCOVERY',
  evidence_state text NOT NULL DEFAULT 'UNKNOWN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oid_code varchar(32) UNIQUE NOT NULL,
  legal_name text NOT NULL,
  trade_name text,
  qualification_status text NOT NULL DEFAULT 'UNSCREENED',
  risk_level text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oid_code varchar(40) UNIQUE NOT NULL,
  product_id uuid NOT NULL REFERENCES products(id),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  supplier_lot text NOT NULL,
  received_quantity numeric(18,6) NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
  quantity_unit text NOT NULL,
  status lot_status NOT NULL DEFAULT 'EXPECTED',
  release_gate_status gate_status NOT NULL DEFAULT 'NOT_STARTED',
  received_at timestamptz,
  released_at timestamptz,
  released_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lots_supplier_lot_idx ON lots(supplier_id, supplier_lot);

CREATE TABLE samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oid_code varchar(40) UNIQUE NOT NULL,
  lot_id uuid NOT NULL REFERENCES lots(id),
  quantity numeric(18,6) NOT NULL CHECK (quantity > 0),
  unit text NOT NULL,
  chain_of_custody_status text,
  lab_accession_number text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oid_code varchar(40) UNIQUE NOT NULL,
  sample_id uuid NOT NULL REFERENCES samples(id),
  lot_id uuid NOT NULL REFERENCES lots(id),
  test_type text NOT NULL,
  method text,
  numeric_result numeric,
  result_unit text,
  text_result text,
  acceptance_criteria text,
  result_status result_status NOT NULL DEFAULT 'NOT_EVALUATED',
  review_status review_status NOT NULL DEFAULT 'NOT_REVIEWED',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oid_code varchar(40) UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  severity exception_severity NOT NULL,
  status exception_status NOT NULL DEFAULT 'OPEN',
  lot_id uuid REFERENCES lots(id),
  blocks_process blocks_process NOT NULL DEFAULT 'NONE',
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oid_code varchar(40) UNIQUE NOT NULL,
  lot_id uuid NOT NULL REFERENCES lots(id),
  movement_type movement_type NOT NULL,
  quantity_in numeric(18,6) NOT NULL DEFAULT 0 CHECK (quantity_in >= 0),
  quantity_out numeric(18,6) NOT NULL DEFAULT 0 CHECK (quantity_out >= 0),
  unit text NOT NULL,
  reason text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CHECK (quantity_in > 0 OR quantity_out > 0),
  CHECK (NOT (quantity_in > 0 AND quantity_out > 0))
);
CREATE INDEX inventory_movements_lot_idx ON inventory_movements(lot_id, occurred_at);

CREATE TABLE allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oid_code varchar(40) UNIQUE NOT NULL,
  lot_id uuid NOT NULL REFERENCES lots(id),
  customer_order_ref text NOT NULL,
  quantity numeric(18,6) NOT NULL CHECK (quantity > 0),
  unit text NOT NULL,
  allocated_at timestamptz NOT NULL DEFAULT now(),
  allocated_by uuid
);

CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oid_code varchar(48) UNIQUE NOT NULL,
  event_type text NOT NULL,
  user_id uuid,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  previous_values jsonb,
  new_values jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE VIEW lot_inventory_balance AS
SELECT l.id AS lot_id,
       COALESCE(SUM(m.quantity_in - m.quantity_out), 0) AS available_quantity
FROM lots l
LEFT JOIN inventory_movements m ON m.lot_id = l.id
GROUP BY l.id;

CREATE OR REPLACE FUNCTION oid_assert_allocation_allowed()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  ls lot_status;
  gs gate_status;
  available numeric;
BEGIN
  SELECT status, release_gate_status INTO ls, gs FROM lots WHERE id = NEW.lot_id FOR UPDATE;
  IF ls IS DISTINCT FROM 'RELEASED' THEN
    RAISE EXCEPTION 'ALLOCATION_BLOCKED:LOT_NOT_RELEASED';
  END IF;
  IF gs IS DISTINCT FROM 'PASS' THEN
    RAISE EXCEPTION 'ALLOCATION_BLOCKED:RELEASE_GATE_NOT_PASS';
  END IF;
  SELECT available_quantity INTO available FROM lot_inventory_balance WHERE lot_id = NEW.lot_id;
  IF available < NEW.quantity THEN
    RAISE EXCEPTION 'ALLOCATION_BLOCKED:INSUFFICIENT_INVENTORY';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER allocation_guard
BEFORE INSERT ON allocations
FOR EACH ROW EXECUTE FUNCTION oid_assert_allocation_allowed();

CREATE OR REPLACE FUNCTION oid_write_allocation_movement()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO inventory_movements (oid_code, lot_id, movement_type, quantity_out, unit, reason)
  VALUES ('SYS-MOV-' || NEW.id::text, NEW.lot_id, 'ALLOCATION', NEW.quantity, NEW.unit, 'Allocation ' || NEW.oid_code);
  RETURN NEW;
END $$;

CREATE TRIGGER allocation_movement
AFTER INSERT ON allocations
FOR EACH ROW EXECUTE FUNCTION oid_write_allocation_movement();
