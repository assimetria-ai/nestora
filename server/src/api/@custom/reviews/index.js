// @custom — Nestora reviews API
const express = require('express')
const router = express.Router()
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const db = require('../../../lib/@system/PostgreSQL')

// GET /api/reviews?property_id=X — list reviews for a property
router.get('/reviews', async (req, res, next) => {
  try {
    const { property_id, limit = 20, offset = 0 } = req.query
    if (!property_id) return res.status(400).json({ message: 'property_id is required' })
    const reviews = await db.any(
      `SELECT r.*, b.check_in, b.check_out, b.nights
       FROM reviews r LEFT JOIN bookings b ON r.booking_id = b.id
       WHERE r.property_id = $1 ORDER BY r.created_at DESC LIMIT $2 OFFSET $3`,
      [property_id, parseInt(limit), parseInt(offset)]
    )
    const agg = await db.oneOrNone(
      `SELECT AVG(rating)::numeric(3,2) as avg_rating, COUNT(*) as count FROM reviews WHERE property_id = $1`,
      [property_id]
    )
    res.json({ reviews, avg_rating: agg?.avg_rating || null, total: parseInt(agg?.count || 0) })
  } catch (err) {
    next(err)
  }
})

// POST /api/reviews — guest leaves a review after completed stay
router.post('/reviews', authenticate, async (req, res, next) => {
  try {
    const { booking_id, rating, cleanliness, accuracy, location, value, comment } = req.body
    if (!booking_id || !rating) return res.status(400).json({ message: 'booking_id and rating are required' })
    if (rating < 1 || rating > 5) return res.status(400).json({ message: 'rating must be 1-5' })

    const booking = await db.oneOrNone(
      "SELECT * FROM bookings WHERE id = $1 AND guest_id = $2 AND status = 'completed'",
      [booking_id, req.user.id]
    )
    if (!booking) return res.status(404).json({ message: 'No completed booking found' })

    const existing = await db.oneOrNone('SELECT id FROM reviews WHERE booking_id = $1', [booking_id])
    if (existing) return res.status(409).json({ message: 'Review already submitted for this booking' })

    const review = await db.one(
      `INSERT INTO reviews (booking_id, property_id, reviewer_id, reviewer_name, rating, cleanliness,
        accuracy, location, value, comment, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW()) RETURNING *`,
      [booking_id, booking.property_id, req.user.id,
       req.user.name || req.user.email, rating,
       cleanliness || null, accuracy || null, location || null, value || null, comment || null]
    )

    // Update property rating avg + count
    await db.none(
      `UPDATE properties SET
        rating_avg = (SELECT AVG(rating)::numeric(3,2) FROM reviews WHERE property_id = $1),
        review_count = (SELECT COUNT(*) FROM reviews WHERE property_id = $1),
        updated_at = NOW()
       WHERE id = $1`,
      [booking.property_id]
    )

    res.status(201).json({ review })
  } catch (err) {
    next(err)
  }
})

// POST /api/reviews/:id/response — host responds to a review
router.post('/reviews/:id/response', authenticate, async (req, res, next) => {
  try {
    const review = await db.oneOrNone(
      `SELECT r.* FROM reviews r JOIN properties p ON r.property_id = p.id
       WHERE r.id = $1 AND p.landlord_id = $2`,
      [req.params.id, req.user.id]
    )
    if (!review) return res.status(404).json({ message: 'Review not found' })
    if (review.host_response) return res.status(409).json({ message: 'Already responded to this review' })

    const { response } = req.body
    if (!response?.trim()) return res.status(400).json({ message: 'response text is required' })

    const updated = await db.one(
      `UPDATE reviews SET host_response = $1, host_responded_at = NOW() WHERE id = $2 RETURNING *`,
      [response.trim(), review.id]
    )
    res.json({ review: updated })
  } catch (err) {
    next(err)
  }
})

module.exports = router
