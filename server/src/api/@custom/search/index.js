const express = require('express')
const router = express.Router()
const db = require('../../../lib/@system/PostgreSQL')

// GET /api/search/properties — public property search with filters
// Query params: q, city, min_price, max_price, bedrooms, guests, check_in, check_out, amenities, limit, offset
router.get('/search/properties', async (req, res, next) => {
  try {
    const {
      q,
      city,
      min_price,
      max_price,
      bedrooms,
      guests,
      check_in,
      check_out,
      amenities,
      limit = 20,
      offset = 0,
    } = req.query

    const where = ["p.status != 'unlisted'"]
    const params = []

    if (q) {
      params.push(`%${q.toLowerCase()}%`)
      where.push(`(LOWER(p.title) LIKE $${params.length} OR LOWER(p.description) LIKE $${params.length} OR LOWER(p.address) LIKE $${params.length})`)
    }
    if (city) {
      params.push(`%${city.toLowerCase()}%`)
      where.push(`LOWER(p.city) LIKE $${params.length}`)
    }
    if (min_price) {
      params.push(parseFloat(min_price))
      where.push(`p.price_per_night >= $${params.length}`)
    }
    if (max_price) {
      params.push(parseFloat(max_price))
      where.push(`p.price_per_night <= $${params.length}`)
    }
    if (bedrooms) {
      params.push(parseInt(bedrooms))
      where.push(`p.bedrooms >= $${params.length}`)
    }
    if (guests) {
      params.push(parseInt(guests))
      where.push(`p.max_guests >= $${params.length}`)
    }
    if (amenities) {
      const amenityList = Array.isArray(amenities) ? amenities : amenities.split(',')
      for (const a of amenityList) {
        params.push(a.trim())
        where.push(`p.amenities @> $${params.length}::jsonb`)
      }
    }

    // Availability check: exclude properties with confirmed/pending bookings that overlap with requested dates
    if (check_in && check_out) {
      params.push(check_out)
      params.push(check_in)
      where.push(`p.id NOT IN (
        SELECT b.property_id FROM bookings b
        WHERE b.status IN ('pending','confirmed')
        AND b.check_in < $${params.length - 1}
        AND b.check_out > $${params.length}
      )`)
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const countRes = await db.one(
      `SELECT COUNT(*) FROM properties p ${whereClause}`,
      params
    )

    params.push(parseInt(limit))
    params.push(parseInt(offset))

    const properties = await db.any(
      `SELECT p.id, p.title, p.address, p.city, p.country,
              p.bedrooms, p.bathrooms, p.max_guests,
              p.price_per_night, p.description,
              p.amenities, p.images, p.rating_avg, p.review_count,
              p.listing_type
       FROM properties p
       ${whereClause}
       ORDER BY p.rating_avg DESC NULLS LAST, p.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    )

    res.json({
      properties,
      total: parseInt(countRes.count),
      limit: parseInt(limit),
      offset: parseInt(offset),
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/search/properties/:id — get single public property detail
router.get('/search/properties/:id', async (req, res, next) => {
  try {
    const property = await db.oneOrNone(
      `SELECT p.*, u.name as host_name
       FROM properties p
       LEFT JOIN users u ON p.landlord_id = u.id
       WHERE p.id = $1 AND p.status != 'unlisted'`,
      [req.params.id]
    )
    if (!property) return res.status(404).json({ message: 'Property not found' })

    // Include reviews
    const reviews = await db.any(
      `SELECT r.reviewer_name, r.rating, r.cleanliness, r.accuracy, r.location, r.value,
              r.comment, r.host_response, r.created_at
       FROM reviews r WHERE r.property_id = $1
       ORDER BY r.created_at DESC LIMIT 10`,
      [property.id]
    )

    res.json({ property, reviews })
  } catch (err) {
    next(err)
  }
})

module.exports = router
