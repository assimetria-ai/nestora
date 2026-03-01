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

// POST /api/properties — create a property listing
router.post('/properties', authenticate, async (req, res, next) => {
  try {
    const {
      title, address, unit, city, country,
      bedrooms, bathrooms, max_guests,
      rent_amount, price_per_night,
      description, amenities, images,
      status, listing_type,
    } = req.body

    if (!title || !address) {
      return res.status(400).json({ message: 'title and address are required' })
    }

    const property = await db.one(
      `INSERT INTO properties
        (landlord_id, title, address, unit, city, country, bedrooms, bathrooms, max_guests,
         rent_amount, price_per_night, description, amenities, images, status, listing_type, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),NOW())
       RETURNING *`,
      [
        req.user.id,
        title, address, unit || null, city || null, country || 'US',
        parseInt(bedrooms) || 1,
        parseFloat(bathrooms) || 1,
        parseInt(max_guests) || 2,
        parseFloat(rent_amount) || 0,
        parseFloat(price_per_night) || 0,
        description || null,
        JSON.stringify(amenities || []),
        JSON.stringify(images || []),
        status || 'vacant',
        listing_type || 'short_term',
      ]
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

// GET /api/properties/:id — get single property
router.get('/properties/:id', authenticate, async (req, res, next) => {
  try {
    const property = await db.oneOrNone(
      'SELECT * FROM properties WHERE id = $1 AND landlord_id = $2',
      [req.params.id, req.user.id]
    )
    if (!property) return res.status(404).json({ message: 'Property not found' })
    res.json({ property })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/properties/:id — update a property listing
router.patch('/properties/:id', authenticate, async (req, res, next) => {
  try {
    const existing = await db.oneOrNone(
      'SELECT id FROM properties WHERE id = $1 AND landlord_id = $2',
      [req.params.id, req.user.id]
    )
    if (!existing) return res.status(404).json({ message: 'Property not found' })

    const {
      title, address, unit, city, country,
      bedrooms, bathrooms, max_guests,
      rent_amount, price_per_night,
      description, amenities, images,
      status, listing_type,
    } = req.body

    const updates = []
    const params = []

    if (title !== undefined) updates.push(`title = $${params.push(title)}`)
    if (address !== undefined) updates.push(`address = $${params.push(address)}`)
    if (unit !== undefined) updates.push(`unit = $${params.push(unit)}`)
    if (city !== undefined) updates.push(`city = $${params.push(city)}`)
    if (country !== undefined) updates.push(`country = $${params.push(country)}`)
    if (bedrooms !== undefined) updates.push(`bedrooms = $${params.push(parseInt(bedrooms))}`)
    if (bathrooms !== undefined) updates.push(`bathrooms = $${params.push(parseFloat(bathrooms))}`)
    if (max_guests !== undefined) updates.push(`max_guests = $${params.push(parseInt(max_guests))}`)
    if (rent_amount !== undefined) updates.push(`rent_amount = $${params.push(parseFloat(rent_amount))}`)
    if (price_per_night !== undefined) updates.push(`price_per_night = $${params.push(parseFloat(price_per_night))}`)
    if (description !== undefined) updates.push(`description = $${params.push(description)}`)
    if (amenities !== undefined) updates.push(`amenities = $${params.push(JSON.stringify(amenities))}`)
    if (images !== undefined) updates.push(`images = $${params.push(JSON.stringify(images))}`)
    if (status !== undefined) updates.push(`status = $${params.push(status)}`)
    if (listing_type !== undefined) updates.push(`listing_type = $${params.push(listing_type)}`)

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' })
    }

    updates.push(`updated_at = NOW()`)
    params.push(req.params.id)

    const property = await db.one(
      `UPDATE properties SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    )
    res.json({ property })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/properties/:id — remove a property listing
router.delete('/properties/:id', authenticate, async (req, res, next) => {
  try {
    const existing = await db.oneOrNone(
      'SELECT id FROM properties WHERE id = $1 AND landlord_id = $2',
      [req.params.id, req.user.id]
    )
    if (!existing) return res.status(404).json({ message: 'Property not found' })
    await db.none('DELETE FROM properties WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

module.exports = router
