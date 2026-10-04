BEGIN;

CREATE TABLE IF NOT EXISTS competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  website text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oid_code text UNIQUE NOT NULL,
  product_id uuid REFERENCES "Product"(id) ON DELETE SET NULL,
  competitor_id uuid REFERENCES competitors(id) ON DELETE SET NULL,
  observation_type text NOT NULL,
  title text NOT NULL,
  observation text NOT NULL,
  source_url text,
  source_document_id uuid REFERENCES "Document"(id) ON DELETE SET NULL,
  observed_at timestamptz NOT NULL,
  evidence_state text NOT NULL DEFAULT 'OBSERVED',
  confidence numeric CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  commercial_relevance text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS research_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oid_code text UNIQUE NOT NULL,
  title text NOT NULL,
  source_type text,
  authors text,
  publisher text,
  publication_date date,
  doi text,
  pmid text,
  url text,
  abstract_text text,
  product_id uuid REFERENCES "Product"(id) ON DELETE SET NULL,
  evidence_quality text,
  review_status text NOT NULL DEFAULT 'NOT_REVIEWED',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS intelligence_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  question text NOT NULL,
  normalized_question text,
  answer text,
  confidence text CHECK (confidence IS NULL OR confidence IN ('HIGH','MODERATE','LOW')),
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  conflicting_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  unknowns jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  query text NOT NULL,
  filters jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_observations_product_date ON market_observations(product_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_research_sources_product_date ON research_sources(product_id, publication_date DESC);
CREATE INDEX IF NOT EXISTS idx_intelligence_queries_user_date ON intelligence_queries(user_id, created_at DESC);

COMMIT;
