/**
 * @custom UserRepo — product-specific user queries.
 * Extends the @system UserRepo with custom fields (avatar_url, bio,
 * preferences, last_login_at, is_active).
 */

const db = require('../../lib/@system/PostgreSQL')
const SystemUserRepo = require('../@system/UserRepo')

const UserRepo = {
  // ── Inherit system methods ──────────────────────────────────────────────────
  ...SystemUserRepo,

  // ── Create with custom fields ───────────────────────────────────────────────
  async create({ email, name, password_hash, role = 'user', avatar_url, bio, preferences = {} }) {
    return db.one(
      `INSERT INTO users (email, name, password_hash, role, avatar_url, bio, preferences)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [email.toLowerCase(), name, password_hash, role, avatar_url ?? null, bio ?? null, JSON.stringify(preferences)],
    )
  },

  // ── Update with custom fields ───────────────────────────────────────────────
  async update(id, fields) {
    const allowed = ['name', 'role', 'avatar_url', 'bio', 'preferences', 'is_active', 'stripe_customer_id']
    const entries = Object.entries(fields)
      .filter(([k, v]) => allowed.includes(k) && v !== undefined)
    if (!entries.length) return this.findById(id)

    const sets = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ')
    const values = entries.map(([, v]) => (typeof v === 'object' && v !== null ? JSON.stringify(v) : v))

    return db.oneOrNone(
      `UPDATE users SET ${sets}, updated_at = now() WHERE id = $1 RETURNING *`,
      [id, ...values],
    )
  },

  // ── Record last login ───────────────────────────────────────────────────────
  async touchLastLogin(id) {
    return db.oneOrNone(
      `UPDATE users SET last_login_at = now(), updated_at = now() WHERE id = $1 RETURNING id, email, last_login_at`,
      [id],
    )
  },

  // ── Soft-delete (deactivate) ────────────────────────────────────────────────
  async deactivate(id) {
    return db.oneOrNone(
      `UPDATE users SET is_active = false, updated_at = now() WHERE id = $1 RETURNING id, email, is_active`,
      [id],
    )
  },

  async activate(id) {
    return db.oneOrNone(
      `UPDATE users SET is_active = true, updated_at = now() WHERE id = $1 RETURNING id, email, is_active`,
      [id],
    )
  },

  // ── List active users only ──────────────────────────────────────────────────
  async findAllActive({ limit = 50, offset = 0 } = {}) {
    return db.any(
      `SELECT id, email, name, role, avatar_url, bio, preferences, last_login_at, created_at
       FROM users
       WHERE is_active = true
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    )
  },

  // ── Update preferences (merge) ──────────────────────────────────────────────
  async updatePreferences(id, patch) {
    return db.oneOrNone(
      `UPDATE users
       SET preferences = preferences || $2::jsonb, updated_at = now()
       WHERE id = $1
       RETURNING id, email, preferences`,
      [id, JSON.stringify(patch)],
    )
  },

  // ── Stats ───────────────────────────────────────────────────────────────────
  async getStats() {
    return db.one(
      `SELECT
         COUNT(*)                                                AS total,
         COUNT(*) FILTER (WHERE is_active = true)               AS active,
         COUNT(*) FILTER (WHERE is_active = false)              AS inactive,
         COUNT(*) FILTER (WHERE last_login_at >= now() - interval '7 days') AS active_last_7d,
         COUNT(*) FILTER (WHERE created_at  >= now() - interval '30 days') AS new_last_30d
       FROM users`,
    )
  },
}

module.exports = UserRepo
