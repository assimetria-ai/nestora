-- @custom reviews table (Nestora property reviews)
CREATE TABLE IF NOT EXISTS reviews (
  id              SERIAL PRIMARY KEY,
  booking_id      INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  property_id     INTEGER REFERENCES properties(id) ON DELETE CASCADE,
  reviewer_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewer_name   TEXT NOT NULL,
  rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  cleanliness     INTEGER CHECK (cleanliness BETWEEN 1 AND 5),
  accuracy        INTEGER CHECK (accuracy BETWEEN 1 AND 5),
  location        INTEGER CHECK (location BETWEEN 1 AND 5),
  value           INTEGER CHECK (value BETWEEN 1 AND 5),
  comment         TEXT,
  host_response   TEXT,
  host_responded_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_property_id ON reviews(property_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id);
