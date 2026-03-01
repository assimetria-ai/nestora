const express = require('express')
const router = express.Router()
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const db = require('../../../lib/@system/PostgreSQL')

let stripe = null
if (process.env.STRIPE_SECRET_KEY) {
  try {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
  } catch {
    // stripe not installed — run in simulation mode
  }
}

// POST /api/payments/checkout — create a payment intent for a booking
// Body: { property_id, check_in, check_out, guests_count, guest_notes }
router.post('/payments/checkout', authenticate, async (req, res, next) => {
  try {
    const { property_id, check_in, check_out, guests_count, guest_notes } = req.body
    if (!property_id || !check_in || !check_out) {
      return res.status(400).json({ message: 'property_id, check_in, and check_out are required' })
    }

    const property = await db.oneOrNone(
      "SELECT * FROM properties WHERE id = $1 AND status != 'unlisted'",
      [property_id]
    )
    if (!property) return res.status(404).json({ message: 'Property not found' })

    const checkIn = new Date(check_in)
    const checkOut = new Date(check_out)
    if (checkIn >= checkOut) {
      return res.status(400).json({ message: 'check_out must be after check_in' })
    }

    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24))
    const total_cents = Math.round(parseFloat(property.price_per_night) * 100 * nights)
    const platform_fee_cents = Math.round(total_cents * 0.12)
    const host_payout_cents = total_cents - platform_fee_cents

    // Check availability
    const conflict = await db.oneOrNone(
      `SELECT id FROM bookings WHERE property_id = $1
       AND status IN ('pending','confirmed')
       AND check_in < $2 AND check_out > $3`,
      [property_id, check_out, check_in]
    )
    if (conflict) {
      return res.status(409).json({ message: 'Property is not available for those dates' })
    }

    // Stripe mode
    if (stripe) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: total_cents,
        currency: 'usd',
        metadata: {
          property_id: String(property_id),
          property_title: property.title,
          guest_id: String(req.user.id),
          check_in,
          check_out,
          nights: String(nights),
        },
      })

      return res.json({
        mode: 'stripe',
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        amount_cents: total_cents,
        platform_fee_cents,
        host_payout_cents,
        nights,
        property_title: property.title,
        price_per_night: property.price_per_night,
      })
    }

    // Simulation mode (no Stripe key configured)
    // Create booking directly as confirmed (for demo/testing)
    const booking = await db.one(
      `INSERT INTO bookings (property_id, guest_id, guest_email, guest_name, check_in, check_out,
        nights, guests_count, total_cents, platform_fee_cents, host_payout_cents,
        guest_notes, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'confirmed',NOW(),NOW()) RETURNING *`,
      [
        property_id, req.user.id, req.user.email, req.user.name || req.user.email,
        check_in, check_out, nights, guests_count || 1,
        total_cents, platform_fee_cents, host_payout_cents,
        guest_notes || null,
      ]
    )

    res.json({
      mode: 'simulation',
      booking,
      amount_cents: total_cents,
      platform_fee_cents,
      host_payout_cents,
      nights,
      property_title: property.title,
      price_per_night: property.price_per_night,
      message: 'Booking confirmed (payment simulation — Stripe not configured)',
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/payments/confirm — confirm booking after Stripe payment succeeds
// Body: { payment_intent_id, property_id, check_in, check_out, guests_count, guest_notes }
router.post('/payments/confirm', authenticate, async (req, res, next) => {
  try {
    const { payment_intent_id, property_id, check_in, check_out, guests_count, guest_notes } = req.body
    if (!payment_intent_id) {
      return res.status(400).json({ message: 'payment_intent_id is required' })
    }

    // Verify payment intent succeeded
    if (stripe) {
      const pi = await stripe.paymentIntents.retrieve(payment_intent_id)
      if (pi.status !== 'succeeded') {
        return res.status(400).json({ message: `Payment not completed. Status: ${pi.status}` })
      }
    }

    const property = await db.oneOrNone(
      "SELECT * FROM properties WHERE id = $1",
      [property_id]
    )
    if (!property) return res.status(404).json({ message: 'Property not found' })

    const checkIn = new Date(check_in)
    const checkOut = new Date(check_out)
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24))
    const total_cents = Math.round(parseFloat(property.price_per_night) * 100 * nights)
    const platform_fee_cents = Math.round(total_cents * 0.12)
    const host_payout_cents = total_cents - platform_fee_cents

    const booking = await db.one(
      `INSERT INTO bookings (property_id, guest_id, guest_email, guest_name, check_in, check_out,
        nights, guests_count, total_cents, platform_fee_cents, host_payout_cents,
        guest_notes, payment_intent_id, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'confirmed',NOW(),NOW()) RETURNING *`,
      [
        property_id, req.user.id, req.user.email, req.user.name || req.user.email,
        check_in, check_out, nights, guests_count || 1,
        total_cents, platform_fee_cents, host_payout_cents,
        guest_notes || null, payment_intent_id,
      ]
    )

    res.status(201).json({ booking })
  } catch (err) {
    next(err)
  }
})

module.exports = router
