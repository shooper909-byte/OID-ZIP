CREATE UNIQUE INDEX IF NOT EXISTS "Document_active_sha256_unique"
ON "Document" ("sha256Hash")
WHERE "status" = 'ACTIVE';
