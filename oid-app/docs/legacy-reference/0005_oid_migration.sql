BEGIN;

CREATE TABLE IF NOT EXISTS import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_name text NOT NULL,
  source_sha256 text,
  status text NOT NULL DEFAULT 'STAGED' CHECK (status IN ('STAGED','VALIDATING','READY','IMPORTED','PARTIAL','FAILED','ROLLED_BACK')),
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS migration_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id uuid NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  legacy_identifier text,
  conflict_type text NOT NULL,
  source_value jsonb,
  existing_value jsonb,
  resolution_status text NOT NULL DEFAULT 'OPEN' CHECK (resolution_status IN ('OPEN','RESOLVED','ACCEPT_SOURCE','KEEP_EXISTING','MERGED','IGNORED')),
  resolved_value jsonb,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS legacy_import_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id uuid NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  legacy_source text NOT NULL,
  legacy_sheet text,
  legacy_row text,
  legacy_identifier text,
  oid_entity_id text,
  oid_code text,
  import_review_status text NOT NULL DEFAULT 'IMPORTED_UNREVIEWED' CHECK (import_review_status IN ('IMPORTED_UNREVIEWED','IMPORTED_REVIEW_REQUIRED','IMPORTED_VERIFIED','IMPORT_CONFLICT')),
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(import_batch_id, entity_type, legacy_source, legacy_sheet, legacy_row)
);

CREATE INDEX IF NOT EXISTS idx_migration_conflicts_open ON migration_conflicts(import_batch_id, resolution_status);
CREATE INDEX IF NOT EXISTS idx_legacy_import_map_legacy ON legacy_import_map(entity_type, legacy_identifier);

COMMIT;
