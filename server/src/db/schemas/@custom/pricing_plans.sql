-- @custom pricing_plans table
-- Stores product pricing plans (DB-driven, not hardcoded)
CREATE TABLE IF NOT EXISTS pricing_plans (
  id                      SERIAL PRIMARY KEY,
  name                    VARCHAR(100) NOT NULL,
  slug                    VARCHAR(100) NOT NULL UNIQUE,
  description             TEXT,
  price_monthly           NUMERIC(10, 2) NOT NULL DEFAULT 0,
  price_yearly            NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency                VARCHAR(3) NOT NULL DEFAULT 'usd',
  features                JSONB NOT NULL DEFAULT '[]',   -- array of feature strings
  limits                  JSONB NOT NULL DEFAULT '{}',   -- e.g. {"pages": 5, "users": 10}
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly  TEXT,
  is_active               BOOLEAN NOT NULL DEFAULT true,
  is_popular              BOOLEAN NOT NULL DEFAULT false,
  sort_order              INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pricing_plans_slug     ON pricing_plans(slug);
CREATE INDEX IF NOT EXISTS idx_pricing_plans_active   ON pricing_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_pricing_plans_sort     ON pricing_plans(sort_order);
