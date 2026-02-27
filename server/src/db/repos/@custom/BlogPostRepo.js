// @custom — Blog post repository
const db = require('../../../lib/@system/PostgreSQL')

const BlogPostRepo = {
  // ── List ──────────────────────────────────────────────────────────────────

  async findAll({ status, category, limit = 50, offset = 0 } = {}) {
    const conditions = []
    const values = []
    let idx = 1

    if (status) { conditions.push(`status = $${idx++}`); values.push(status) }
    if (category) { conditions.push(`category = $${idx++}`); values.push(category) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    values.push(limit, offset)

    return db.any(
      `SELECT id, slug, title, excerpt, category, author, tags, cover_image,
              reading_time, status, published_at, user_id, created_at, updated_at
       FROM blog_posts
       ${where}
       ORDER BY COALESCE(published_at, created_at) DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      values,
    )
  },

  async count({ status, category } = {}) {
    const conditions = []
    const values = []
    let idx = 1

    if (status) { conditions.push(`status = $${idx++}`); values.push(status) }
    if (category) { conditions.push(`category = $${idx++}`); values.push(category) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const row = await db.one(`SELECT COUNT(*) FROM blog_posts ${where}`, values)
    return parseInt(row.count, 10)
  },

  // ── Single ────────────────────────────────────────────────────────────────

  async findById(id) {
    return db.oneOrNone('SELECT * FROM blog_posts WHERE id = $1', [id])
  },

  async findBySlug(slug) {
    return db.oneOrNone('SELECT * FROM blog_posts WHERE slug = $1', [slug])
  },

  // ── Create ────────────────────────────────────────────────────────────────

  async create({ slug, title, excerpt, content, category, author, tags, cover_image, reading_time, status, published_at, user_id }) {
    return db.one(
      `INSERT INTO blog_posts
         (slug, title, excerpt, content, category, author, tags, cover_image, reading_time, status, published_at, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        slug,
        title,
        excerpt ?? null,
        content ?? '',
        category ?? 'Company',
        author ?? 'The Team',
        tags ?? null,
        cover_image ?? null,
        reading_time ?? 1,
        status ?? 'draft',
        published_at ?? null,
        user_id ?? null,
      ],
    )
  },

  // ── Update ────────────────────────────────────────────────────────────────

  async update(id, { slug, title, excerpt, content, category, author, tags, cover_image, reading_time, status, published_at }) {
    return db.oneOrNone(
      `UPDATE blog_posts
       SET slug          = COALESCE($2, slug),
           title         = COALESCE($3, title),
           excerpt       = COALESCE($4, excerpt),
           content       = COALESCE($5, content),
           category      = COALESCE($6, category),
           author        = COALESCE($7, author),
           tags          = COALESCE($8, tags),
           cover_image   = COALESCE($9, cover_image),
           reading_time  = COALESCE($10, reading_time),
           status        = COALESCE($11, status),
           published_at  = COALESCE($12, published_at),
           updated_at    = now()
       WHERE id = $1
       RETURNING *`,
      [id, slug ?? null, title ?? null, excerpt ?? null, content ?? null,
       category ?? null, author ?? null, tags ?? null, cover_image ?? null,
       reading_time ?? null, status ?? null, published_at ?? null],
    )
  },

  // ── Publish / unpublish ───────────────────────────────────────────────────

  async publish(id) {
    return db.oneOrNone(
      `UPDATE blog_posts
       SET status = 'published', published_at = COALESCE(published_at, now()), updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id],
    )
  },

  async unpublish(id) {
    return db.oneOrNone(
      `UPDATE blog_posts
       SET status = 'draft', updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id],
    )
  },

  // ── Delete ────────────────────────────────────────────────────────────────

  async delete(id) {
    return db.oneOrNone('DELETE FROM blog_posts WHERE id = $1 RETURNING id', [id])
  },
}

module.exports = BlogPostRepo
