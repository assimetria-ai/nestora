-- @custom experiences table (Nestora local experiences & tours)
CREATE TABLE IF NOT EXISTS experiences (
  id              SERIAL PRIMARY KEY,
  host_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL DEFAULT 'tour', -- 'tour'|'food'|'outdoor'|'art'|'wellness'|'other'
  city            TEXT,
  address         TEXT,
  duration_hours  NUMERIC(4,1) NOT NULL DEFAULT 2,
  max_participants INTEGER NOT NULL DEFAULT 10,
  price_per_person NUMERIC(10,2) NOT NULL DEFAULT 0,
  images          JSONB DEFAULT '[]',
  included        JSONB DEFAULT '[]',
  requirements    TEXT,
  languages       JSONB DEFAULT '["English"]',
  rating_avg      NUMERIC(3,2) DEFAULT NULL,
  review_count    INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experiences_host_id ON experiences(host_id);
CREATE INDEX IF NOT EXISTS idx_experiences_city ON experiences(city);
CREATE INDEX IF NOT EXISTS idx_experiences_category ON experiences(category);
CREATE INDEX IF NOT EXISTS idx_experiences_is_active ON experiences(is_active);

CREATE TABLE IF NOT EXISTS experience_bookings (
  id              SERIAL PRIMARY KEY,
  experience_id   INTEGER REFERENCES experiences(id) ON DELETE CASCADE,
  guest_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  guest_email     TEXT NOT NULL,
  guest_name      TEXT NOT NULL,
  date            DATE NOT NULL,
  participants    INTEGER NOT NULL DEFAULT 1,
  total_cents     INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending', -- 'pending'|'confirmed'|'cancelled'|'completed'
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exp_bookings_experience_id ON experience_bookings(experience_id);
CREATE INDEX IF NOT EXISTS idx_exp_bookings_guest_id ON experience_bookings(guest_id);
