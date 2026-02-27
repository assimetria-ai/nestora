const express = require('express')
const router = express.Router()
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const db = require('../../../lib/@system/PostgreSQL')

// GET /api/properties — list properties
router.get('/properties', authenticate, async (req, res, next) => {
  try {
    const properties = await db.any(
      'SELECT * FROM properties WHERE landlord_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    )
    res.json({ properties })
  } catch (err) {
    next(err)
  }
})

// POST /api/properties — add a property
router.post('/properties', authenticate, async (req, res, next) => {
  try {
    const { address, unit, rent_amount, bedrooms, bathrooms, description } = req.body
    const property = await db.one(
      `INSERT INTO properties (landlord_id, address, unit, rent_amount, bedrooms, bathrooms, description, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'vacant', NOW()) RETURNING *`,
      [req.user.id, address, unit, rent_amount, bedrooms, bathrooms, description]
    )
    res.status(201).json({ property })
  } catch (err) {
    next(err)
  }
})

// GET /api/properties/tenants — list tenants
router.get('/properties/tenants', authenticate, async (req, res, next) => {
  try {
    const tenants = await db.any(
      `SELECT t.*, p.address, p.unit FROM tenants t
       JOIN properties p ON t.property_id = p.id
       WHERE p.landlord_id = $1 ORDER BY t.created_at DESC`,
      [req.user.id]
    )
    res.json({ tenants })
  } catch (err) {
    next(err)
  }
})

// GET /api/properties/maintenance — list maintenance requests
router.get('/properties/maintenance', authenticate, async (req, res, next) => {
  try {
    const { status } = req.query
    let query = `SELECT m.*, p.address, p.unit FROM maintenance_requests m
                 JOIN properties p ON m.property_id = p.id
                 WHERE p.landlord_id = $1`
    const params = [req.user.id]
    if (status) { query += ` AND m.status = $2`; params.push(status) }
    query += ' ORDER BY m.created_at DESC'
    const requests = await db.any(query, params)
    res.json({ requests })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/properties/maintenance/:id — update maintenance status
router.patch('/properties/maintenance/:id', authenticate, async (req, res, next) => {
  try {
    const { status } = req.body
    const request = await db.one(
      `UPDATE maintenance_requests SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    )
    res.json({ request })
  } catch (err) {
    next(err)
  }
})

// GET /api/properties/stats — dashboard stats
router.get('/properties/stats', authenticate, async (req, res, next) => {
  try {
    const total = await db.one('SELECT COUNT(*) FROM properties WHERE landlord_id = $1', [req.user.id])
    const occupied = await db.one("SELECT COUNT(*) FROM properties WHERE landlord_id = $1 AND status = 'occupied'", [req.user.id])
    const openMaint = await db.one(
      `SELECT COUNT(*) FROM maintenance_requests m JOIN properties p ON m.property_id = p.id
       WHERE p.landlord_id = $1 AND m.status = 'open'`, [req.user.id]
    )
    const revenue = await db.one(
      "SELECT COALESCE(SUM(rent_amount),0) as total FROM properties WHERE landlord_id = $1 AND status = 'occupied'",
      [req.user.id]
    )
    res.json({
      total_properties: parseInt(total.count),
      active_tenants: parseInt(occupied.count),
      monthly_revenue: parseFloat(revenue.total),
      open_maintenance: parseInt(openMaint.count),
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
