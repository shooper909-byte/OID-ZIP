ALTER TABLE "import_batches"
  ADD COLUMN IF NOT EXISTS "row_count" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "valid_count" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "warning_count" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "error_count" integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS "import_batches_source_sha256_key"
  ON "import_batches" ("source_sha256");

CREATE TABLE IF NOT EXISTS "import_rows" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "import_batch_id" uuid NOT NULL,
  "row_number" integer NOT NULL,
  "raw_data" jsonb NOT NULL,
  "normalized_data" jsonb,
  "validation_status" text NOT NULL,
  "messages" jsonb NOT NULL,
  "proposed_action" text NOT NULL DEFAULT 'CREATE',
  "committed_entity_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "import_rows_import_batch_id_fkey" FOREIGN KEY ("import_batch_id")
    REFERENCES "import_batches" ("id") ON DELETE CASCADE,
  CONSTRAINT "import_rows_import_batch_id_row_number_key" UNIQUE ("import_batch_id", "row_number")
);

CREATE INDEX IF NOT EXISTS "import_rows_import_batch_id_validation_status_idx"
  ON "import_rows" ("import_batch_id", "validation_status");
