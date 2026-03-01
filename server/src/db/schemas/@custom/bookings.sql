-- @custom bookings table (Nestora property reservations)
CREATE TABLE IF NOT EXISTS bookings (
  id              SERIAL PRIMARY KEY,
  property_id     INTEGER REFERENCES properties(id) ON DELETE CASCADE,
  guest_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  guest_email     TEXT NOT NULL,
  guest_name      TEXT NOT NULL,
  check_in        DATE NOT NULL,
  check_out       DATE NOT NULL,
  nights          INTEGER NOT NULL,
  guests_count    INTEGER NOT NULL DEFAULT 1,
  total_cents     INTEGER NOT NULL,
  platform_fee_cents INTEGER NOT NULL DEFAULT 0,
  host_payout_cents  INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending', -- 'pending'|'confirmed'|'cancelled'|'completed'
  payment_intent_id TEXT,
  cancellation_reason TEXT,
  guest_notes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_property_id ON bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_bookings_guest_id ON bookings(guest_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_check_in ON bookings(check_in);
CREATE INDEX IF NOT EXISTS idx_bookings_check_out ON bookings(check_out);
