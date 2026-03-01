-- @custom properties table (Nestora property listings)
CREATE TABLE IF NOT EXISTS properties (
  id              SERIAL PRIMARY KEY,
  landlord_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  address         TEXT NOT NULL,
  unit            TEXT,
  city            TEXT,
  country         TEXT DEFAULT 'US',
  bedrooms        INTEGER NOT NULL DEFAULT 1,
  bathrooms       NUMERIC(3,1) NOT NULL DEFAULT 1,
  max_guests      INTEGER NOT NULL DEFAULT 2,
  rent_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_per_night NUMERIC(10,2) NOT NULL DEFAULT 0,
  description     TEXT,
  amenities       JSONB DEFAULT '[]',
  images          JSONB DEFAULT '[]',
  status          TEXT NOT NULL DEFAULT 'vacant', -- 'occupied'|'vacant'|'unlisted'
  listing_type    TEXT DEFAULT 'short_term', -- 'short_term'|'long_term'
  next_payment_date DATE,
  rating_avg      NUMERIC(3,2) DEFAULT NULL,
  review_count    INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_properties_landlord_id ON properties(landlord_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);

-- Tenants table (for long-term rentals)
CREATE TABLE IF NOT EXISTS tenants (
  id              SERIAL PRIMARY KEY,
  property_id     INTEGER REFERENCES properties(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  lease_start     DATE,
  lease_end       DATE,
  monthly_rent    NUMERIC(10,2),
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenants_property_id ON tenants(property_id);

-- Maintenance requests table
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id              SERIAL PRIMARY KEY,
  property_id     INTEGER REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id       INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
  description     TEXT NOT NULL,
  priority        TEXT NOT NULL DEFAULT 'medium', -- 'low'|'medium'|'high'
  status          TEXT NOT NULL DEFAULT 'open', -- 'open'|'in-progress'|'resolved'
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_property_id ON maintenance_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_requests(status);
