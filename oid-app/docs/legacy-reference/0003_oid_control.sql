BEGIN;

CREATE TABLE IF NOT EXISTS actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oid_code text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  entity_type text,
  entity_id text,
  assigned_to uuid,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('PLANNED','OPEN','IN_PROGRESS','WAITING_INTERNAL','WAITING_VENDOR','WAITING_LAB','COMPLETE','CANCELLED')),
  due_at timestamptz,
  completed_at timestamptz,
  source_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS capas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oid_code text UNIQUE NOT NULL,
  exception_id uuid REFERENCES "Exception"(id) ON DELETE RESTRICT,
  title text NOT NULL,
  containment_action text,
  root_cause text,
  corrective_action text,
  preventive_action text,
  owner_id uuid,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','INVESTIGATING','IMPLEMENTING','EFFECTIVENESS_REVIEW','CLOSED','CANCELLED')),
  due_at timestamptz,
  implementation_date timestamptz,
  effectiveness_review text,
  effectiveness_status text,
  closed_at timestamptz,
  closed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oid_code text UNIQUE NOT NULL,
  decision_type text NOT NULL,
  title text NOT NULL,
  question text,
  context text,
  options_considered jsonb,
  recommendation text,
  final_decision text,
  conditions text,
  decision_status text NOT NULL DEFAULT 'DRAFT' CHECK (decision_status IN ('DRAFT','READY_FOR_REVIEW','DECIDED','DEFERRED','SUPERSEDED')),
  decision_maker uuid,
  decision_date timestamptz,
  review_date timestamptz,
  outcome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS decision_evidence (
  decision_id uuid NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  relationship text NOT NULL CHECK (relationship IN ('SUPPORTS','CONTRADICTS','BACKGROUND','REQUIRED','SUPERSEDES')),
  PRIMARY KEY (decision_id, entity_type, entity_id, relationship)
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text NOT NULL,
  entity_type text,
  entity_id text,
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO','LOW','MEDIUM','HIGH','CRITICAL')),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oid_code text UNIQUE NOT NULL,
  name text NOT NULL,
  legal_name text,
  organization_type text,
  website text,
  domain text,
  business_address text,
  verification_status text NOT NULL DEFAULT 'NOT_STARTED' CHECK (verification_status IN ('NOT_STARTED','IN_REVIEW','VERIFIED','ESCALATED','REJECTED','EXPIRED')),
  account_status text NOT NULL DEFAULT 'PROSPECT',
  risk_level text,
  commerce_customer_id text,
  account_owner uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oid_code text UNIQUE NOT NULL,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  commerce_order_id text UNIQUE,
  order_date timestamptz,
  order_status text NOT NULL DEFAULT 'OPEN',
  currency text NOT NULL DEFAULT 'USD',
  subtotal numeric NOT NULL DEFAULT 0,
  shipping numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_order_id uuid NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES "Product"(id) ON DELETE RESTRICT,
  sku_id uuid REFERENCES "Sku"(id) ON DELETE RESTRICT,
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit text NOT NULL,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0
);

ALTER TABLE "Allocation" ADD COLUMN IF NOT EXISTS customer_order_item_id uuid REFERENCES customer_order_items(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_actions_status_due ON actions(status, due_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decisions_status_review ON decisions(decision_status, review_date);
CREATE INDEX IF NOT EXISTS idx_organizations_verification ON organizations(verification_status);

COMMIT;
