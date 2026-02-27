'use strict'

const db = require('../../lib/@system/PostgreSQL')

const ApiKeyRepo = {
  async findByUserId(user_id) {
    return db.any(
      `SELECT id, name, key_prefix, scopes, last_used_at, expires_at, is_active, created_at, updated_at
       FROM api_keys
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [user_id],
    )
  },

  async findById(id) {
    return db.oneOrNone('SELECT * FROM api_keys WHERE id = $1', [id])
  },

  async findByKeyHash(key_hash) {
    return db.oneOrNone(
      `SELECT * FROM api_keys WHERE key_hash = $1 AND is_active = TRUE`,
      [key_hash],
    )
  },

  async create({ user_id, name, key_prefix, key_hash, scopes = [], expires_at = null }) {
    return db.one(
      `INSERT INTO api_keys (user_id, name, key_prefix, key_hash, scopes, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, key_prefix, scopes, expires_at, is_active, created_at`,
      [user_id, name, key_prefix, key_hash, scopes, expires_at ?? null],
    )
  },

  async touchLastUsed(id) {
    return db.none(
      `UPDATE api_keys SET last_used_at = now() WHERE id = $1`,
      [id],
    )
  },

  async revoke(id, user_id) {
    return db.oneOrNone(
      `UPDATE api_keys SET is_active = FALSE, updated_at = now()
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, user_id],
    )
  },

  async delete(id, user_id) {
    return db.oneOrNone(
      `DELETE FROM api_keys WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, user_id],
    )
  },
}

module.exports = ApiKeyRepo
