// @system — admin API: user management, subscription stats, platform overview
// All routes require: authenticate + requireAdmin
const express = require('express')
const router = express.Router()
const { authenticate, requireAdmin } = require('../../../lib/@system/Helpers/auth')
const UserRepo = require('../../../db/repos/@system/UserRepo')
const SubscriptionRepo = require('../../../db/repos/@system/SubscriptionRepo')
const db = require('../../../lib/@system/PostgreSQL')
const { validate } = require('../../../lib/@system/Validation')
const { ListUsersQuery, UserIdParams, UpdateUserRoleBody, ListSubscriptionsQuery } = require('../../../lib/@system/Validation/schemas/@system/admin')

const guard = [authenticate, requireAdmin]

// ── Users ─────────────────────────────────────────────────────────────────

// GET /api/admin/users — paginated user list with optional search
router.get('/admin/users', ...guard, validate({ query: ListUsersQuery }), async (req, res, next) => {
  try {
    const { search, page, limit } = req.query
    let users
    if (search && search.length >= 2) {
      users = await UserRepo.search(search, { limit: Number(limit) })
    } else {
      users = await db.any(
        `SELECT id, email, name, role, created_at
         FROM users
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [Number(limit), (Number(page) - 1) * Number(limit)]
      )
    }
    res.json({ users })
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/users/stats — registration counts and totals
router.get('/admin/users/stats', ...guard, async (req, res, next) => {
  try {
    const [total, todayRow, weekRow, monthRow] = await Promise.all([
      db.one('SELECT COUNT(*) AS count FROM users'),
      db.one("SELECT COUNT(*) AS count FROM users WHERE created_at >= now() - interval '1 day'"),
      db.one("SELECT COUNT(*) AS count FROM users WHERE created_at >= now() - interval '7 days'"),
      db.one("SELECT COUNT(*) AS count FROM users WHERE created_at >= now() - interval '30 days'"),
    ])
    res.json({
      total: Number(total.count),
      today: Number(todayRow.count),
      thisWeek: Number(weekRow.count),
      thisMonth: Number(monthRow.count),
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/users/:id — single user details
router.get('/admin/users/:id', ...guard, validate({ params: UserIdParams }), async (req, res, next) => {
  try {
    const user = await UserRepo.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    const subscriptions = await SubscriptionRepo.findByUserId(user.id)
    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, created_at: user.created_at }, subscriptions })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/admin/users/:id/role — change user role
router.patch('/admin/users/:id/role', ...guard, validate({ params: UserIdParams, body: UpdateUserRoleBody }), async (req, res, next) => {
  try {
    const { role } = req.body
    const updated = await db.oneOrNone(
      'UPDATE users SET role = $2, updated_at = now() WHERE id = $1 RETURNING id, email, name, role',
      [req.params.id, role]
    )
    if (!updated) return res.status(404).json({ message: 'User not found' })
    res.json({ user: updated })
  } catch (err) {
    next(err)
  }
})

// ── Subscriptions ─────────────────────────────────────────────────────────

// GET /api/admin/subscriptions — all subscriptions with user info
router.get('/admin/subscriptions', ...guard, validate({ query: ListSubscriptionsQuery }), async (req, res, next) => {
  try {
    const { page, limit, status } = req.query
    const conditions = status ? "WHERE s.status = $3" : ''
    const params = status
      ? [Number(limit), (Number(page) - 1) * Number(limit), status]
      : [Number(limit), (Number(page) - 1) * Number(limit)]

    const subscriptions = await db.any(
      `SELECT s.*, u.email, u.name
       FROM subscriptions s
       JOIN users u ON u.id = s.user_id
       ${conditions}
       ORDER BY s.created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    )
    res.json({ subscriptions })
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/subscriptions/stats — counts by status
router.get('/admin/subscriptions/stats', ...guard, async (req, res, next) => {
  try {
    const rows = await db.any(
      'SELECT status, COUNT(*) AS count FROM subscriptions GROUP BY status'
    )
    const stats = Object.fromEntries(rows.map((r) => [r.status, Number(r.count)]))
    res.json({ stats })
  } catch (err) {
    next(err)
  }
})

module.exports = router
