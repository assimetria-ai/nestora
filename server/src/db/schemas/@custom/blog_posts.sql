-- @custom blog_posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id            SERIAL PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  excerpt       TEXT,
  content       TEXT NOT NULL DEFAULT '',
  category      TEXT NOT NULL DEFAULT 'Company',
  author        TEXT NOT NULL DEFAULT 'The Team',
  tags          TEXT[],
  cover_image   TEXT,
  reading_time  INTEGER NOT NULL DEFAULT 1,
  status        TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'published'
  published_at  TIMESTAMPTZ,
  user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug       ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status     ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category   ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published  ON blog_posts(published_at DESC) WHERE status = 'published';
