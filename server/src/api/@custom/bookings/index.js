// @custom — Nestora bookings API
const express = require('express')
const router = express.Router()
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const db = require('../../../lib/@system/PostgreSQL')

// GET /api/bookings — list bookings for host's properties
router.get('/bookings', authenticate, async (req, res, next) => {
  try {
    const { status, property_id, limit = 50, offset = 0 } = req.query
    let where = 'WHERE p.landlord_id = $1'
    const params = [req.user.id]
    if (status) { where += ` AND b.status = $${params.push(status)}` }
    if (property_id) { where += ` AND b.property_id = $${params.push(parseInt(property_id))}` }

    const bookings = await db.any(
      `SELECT b.*, p.title as property_title, p.address as property_address
       FROM bookings b JOIN properties p ON b.property_id = p.id
       ${where} ORDER BY b.created_at DESC
       LIMIT $${params.push(parseInt(limit))} OFFSET $${params.push(parseInt(offset))}`,
      params
    )
    const total = await db.one(
      `SELECT COUNT(*) FROM bookings b JOIN properties p ON b.property_id = p.id ${where}`,
      params.slice(0, params.length - 2)
    )
    res.json({ bookings, total: parseInt(total.count) })
  } catch (err) {
    next(err)
  }
})

// GET /api/bookings/:id
router.get('/bookings/:id', authenticate, async (req, res, next) => {
  try {
    const booking = await db.oneOrNone(
      `SELECT b.*, p.title as property_title, p.address as property_address
       FROM bookings b JOIN properties p ON b.property_id = p.id
       WHERE b.id = $1 AND p.landlord_id = $2`,
      [req.params.id, req.user.id]
    )
    if (!booking) return res.status(404).json({ message: 'Booking not found' })
    res.json({ booking })
  } catch (err) {
    next(err)
  }
})

// POST /api/bookings — create booking (guest making reservation)
router.post('/bookings', authenticate, async (req, res, next) => {
  try {
    const { property_id, check_in, check_out, guests_count, guest_notes } = req.body
    if (!property_id || !check_in || !check_out) {
      return res.status(400).json({ message: 'property_id, check_in, and check_out are required' })
    }

    const property = await db.oneOrNone("SELECT * FROM properties WHERE id = $1 AND status != 'unlisted'", [property_id])
    if (!property) return res.status(404).json({ message: 'Property not found' })

    const checkIn = new Date(check_in)
    const checkOut = new Date(check_out)
    if (checkIn >= checkOut) return res.status(400).json({ message: 'check_out must be after check_in' })

    // Check for conflicts
    const conflict = await db.oneOrNone(
      `SELECT id FROM bookings WHERE property_id = $1
       AND status IN ('pending','confirmed')
       AND check_in < $2 AND check_out > $3`,
      [property_id, check_out, check_in]
    )
    if (conflict) return res.status(409).json({ message: 'Property is not available for the selected dates' })

    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24))
    const total_cents = Math.round(parseFloat(property.price_per_night) * 100 * nights)
    const platform_fee_cents = Math.round(total_cents * 0.12) // 12% platform fee
    const host_payout_cents = total_cents - platform_fee_cents

    const booking = await db.one(
      `INSERT INTO bookings (property_id, guest_id, guest_email, guest_name, check_in, check_out,
        nights, guests_count, total_cents, platform_fee_cents, host_payout_cents, guest_notes, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW()) RETURNING *`,
      [property_id, req.user.id, req.user.email, req.user.name || req.user.email,
       check_in, check_out, nights, guests_count || 1,
       total_cents, platform_fee_cents, host_payout_cents, guest_notes || null]
    )
    res.status(201).json({ booking })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/bookings/:id — host confirms/cancels
router.patch('/bookings/:id', authenticate, async (req, res, next) => {
  try {
    const booking = await db.oneOrNone(
      `SELECT b.* FROM bookings b JOIN properties p ON b.property_id = p.id
       WHERE b.id = $1 AND p.landlord_id = $2`,
      [req.params.id, req.user.id]
    )
    if (!booking) return res.status(404).json({ message: 'Booking not found' })

    const { status, cancellation_reason } = req.body
    const VALID = ['confirmed', 'cancelled', 'completed']
    if (!VALID.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${VALID.join(', ')}` })
    }

    const updated = await db.one(
      `UPDATE bookings SET status = $1, cancellation_reason = COALESCE($2, cancellation_reason), updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, cancellation_reason || null, booking.id]
    )
    res.json({ booking: updated })
  } catch (err) {
    next(err)
  }
})

// GET /api/bookings/calendar/:property_id — get booked dates for a property
router.get('/bookings/calendar/:property_id', async (req, res, next) => {
  try {
    const bookings = await db.any(
      `SELECT check_in, check_out, status FROM bookings
       WHERE property_id = $1 AND status IN ('confirmed','pending')
       AND check_out >= NOW()`,
      [req.params.property_id]
    )
    res.json({ blocked_dates: bookings })
  } catch (err) {
    next(err)
  }
})

// GET /api/bookings/stats — host booking stats
router.get('/bookings/stats', authenticate, async (req, res, next) => {
  try {
    const [pending, confirmed, revenue, upcoming] = await Promise.all([
      db.one(`SELECT COUNT(*) FROM bookings b JOIN properties p ON b.property_id = p.id WHERE p.landlord_id = $1 AND b.status = 'pending'`, [req.user.id]),
      db.one(`SELECT COUNT(*) FROM bookings b JOIN properties p ON b.property_id = p.id WHERE p.landlord_id = $1 AND b.status = 'confirmed'`, [req.user.id]),
      db.one(`SELECT COALESCE(SUM(b.host_payout_cents),0) as total FROM bookings b JOIN properties p ON b.property_id = p.id WHERE p.landlord_id = $1 AND b.status IN ('confirmed','completed')`, [req.user.id]),
      db.one(`SELECT COUNT(*) FROM bookings b JOIN properties p ON b.property_id = p.id WHERE p.landlord_id = $1 AND b.status = 'confirmed' AND b.check_in >= NOW()`, [req.user.id]),
    ])
    res.json({
      pending_bookings: parseInt(pending.count),
      active_bookings: parseInt(confirmed.count),
      total_earnings_cents: parseInt(revenue.total),
      upcoming_check_ins: parseInt(upcoming.count),
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
