const db = require('../../lib/@system/PostgreSQL')

const BrandRepo = {
  async findAll({ status, user_id, limit = 50, offset = 0 } = {}) {
    const conditions = []
    const values = []
    let idx = 1

    if (status) { conditions.push(`status = $${idx++}`); values.push(status) }
    if (user_id) { conditions.push(`user_id = $${idx++}`); values.push(user_id) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    values.push(limit, offset)

    return db.any(
      `SELECT id, name, slug, description, logo_url, website_url,
              primary_color, secondary_color, status, settings, user_id, created_at, updated_at
       FROM brands
       ${where}
       ORDER BY created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      values,
    )
  },

  async count({ status, user_id } = {}) {
    const conditions = []
    const values = []
    let idx = 1

    if (status) { conditions.push(`status = $${idx++}`); values.push(status) }
    if (user_id) { conditions.push(`user_id = $${idx++}`); values.push(user_id) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const row = await db.one(`SELECT COUNT(*) FROM brands ${where}`, values)
    return parseInt(row.count, 10)
  },

  async findById(id) {
    return db.oneOrNone('SELECT * FROM brands WHERE id = $1', [id])
  },

  async findBySlug(slug) {
    return db.oneOrNone('SELECT * FROM brands WHERE slug = $1', [slug])
  },

  async create({ name, slug, description, logo_url, website_url, primary_color, secondary_color, status = 'active', settings, user_id }) {
    return db.one(
      `INSERT INTO brands (name, slug, description, logo_url, website_url, primary_color, secondary_color, status, settings, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [name, slug, description ?? null, logo_url ?? null, website_url ?? null,
       primary_color ?? null, secondary_color ?? null, status,
       settings ? JSON.stringify(settings) : null, user_id ?? null],
    )
  },

  async update(id, { name, slug, description, logo_url, website_url, primary_color, secondary_color, status, settings }) {
    return db.oneOrNone(
      `UPDATE brands
       SET name            = COALESCE($2, name),
           slug            = COALESCE($3, slug),
           description     = COALESCE($4, description),
           logo_url        = COALESCE($5, logo_url),
           website_url     = COALESCE($6, website_url),
           primary_color   = COALESCE($7, primary_color),
           secondary_color = COALESCE($8, secondary_color),
           status          = COALESCE($9, status),
           settings        = COALESCE($10::jsonb, settings),
           updated_at      = now()
       WHERE id = $1
       RETURNING *`,
      [id, name ?? null, slug ?? null, description ?? null, logo_url ?? null,
       website_url ?? null, primary_color ?? null, secondary_color ?? null,
       status ?? null, settings ? JSON.stringify(settings) : null],
    )
  },

  async updateStatus(id, status) {
    return db.oneOrNone(
      `UPDATE brands SET status = $2, updated_at = now() WHERE id = $1 RETURNING *`,
      [id, status],
    )
  },

  async delete(id) {
    return db.oneOrNone('DELETE FROM brands WHERE id = $1 RETURNING id', [id])
  },

  async search(query, { limit = 20 } = {}) {
    return db.any(
      `SELECT id, name, slug, description, logo_url, status, user_id, created_at,
              ts_rank(
                to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(slug, '') || ' ' || COALESCE(description, '')),
                plainto_tsquery('english', $1)
              ) AS rank
       FROM brands
       WHERE to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(slug, '') || ' ' || COALESCE(description, ''))
             @@ plainto_tsquery('english', $1)
       ORDER BY rank DESC
       LIMIT $2`,
      [query, limit],
    )
  },
}

module.exports = BrandRepo
