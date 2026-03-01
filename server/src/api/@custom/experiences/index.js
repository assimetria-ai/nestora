const express = require('express')
const router = express.Router()
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const db = require('../../../lib/@system/PostgreSQL')

// GET /api/experiences — public list of active experiences
router.get('/experiences', async (req, res, next) => {
  try {
    const { city, category, limit = 20, offset = 0 } = req.query
    const where = ['e.is_active = true']
    const params = []

    if (city) {
      params.push(`%${city.toLowerCase()}%`)
      where.push(`LOWER(e.city) LIKE $${params.length}`)
    }
    if (category) {
      params.push(category)
      where.push(`e.category = $${params.length}`)
    }

    const whereClause = `WHERE ${where.join(' AND ')}`
    const total = await db.one(`SELECT COUNT(*) FROM experiences e ${whereClause}`, params)

    params.push(parseInt(limit))
    params.push(parseInt(offset))

    const experiences = await db.any(
      `SELECT e.*, u.name as host_name
       FROM experiences e
       LEFT JOIN users u ON e.host_id = u.id
       ${whereClause}
       ORDER BY e.rating_avg DESC NULLS LAST, e.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    )

    res.json({ experiences, total: parseInt(total.count) })
  } catch (err) {
    next(err)
  }
})

// GET /api/experiences/:id — get single experience
router.get('/experiences/:id', async (req, res, next) => {
  try {
    const experience = await db.oneOrNone(
      `SELECT e.*, u.name as host_name
       FROM experiences e
       LEFT JOIN users u ON e.host_id = u.id
       WHERE e.id = $1 AND e.is_active = true`,
      [req.params.id]
    )
    if (!experience) return res.status(404).json({ message: 'Experience not found' })
    res.json({ experience })
  } catch (err) {
    next(err)
  }
})

// POST /api/experiences — host creates an experience
router.post('/experiences', authenticate, async (req, res, next) => {
  try {
    const { title, description, category, city, address, duration_hours, max_participants, price_per_person, images, included, requirements, languages } = req.body
    if (!title) return res.status(400).json({ message: 'title is required' })

    const experience = await db.one(
      `INSERT INTO experiences (host_id, title, description, category, city, address, duration_hours, max_participants, price_per_person, images, included, requirements, languages, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW()) RETURNING *`,
      [
        req.user.id, title, description || null, category || 'tour',
        city || null, address || null,
        parseFloat(duration_hours) || 2,
        parseInt(max_participants) || 10,
        parseFloat(price_per_person) || 0,
        JSON.stringify(images || []),
        JSON.stringify(included || []),
        requirements || null,
        JSON.stringify(languages || ['English']),
      ]
    )
    res.status(201).json({ experience })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/experiences/:id — host updates experience
router.patch('/experiences/:id', authenticate, async (req, res, next) => {
  try {
    const existing = await db.oneOrNone(
      'SELECT id FROM experiences WHERE id = $1 AND host_id = $2',
      [req.params.id, req.user.id]
    )
    if (!existing) return res.status(404).json({ message: 'Experience not found' })

    const { title, description, category, city, address, duration_hours, max_participants, price_per_person, images, included, requirements, languages, is_active } = req.body
    const updates = []
    const params = []

    if (title !== undefined) updates.push(`title = $${params.push(title)}`)
    if (description !== undefined) updates.push(`description = $${params.push(description)}`)
    if (category !== undefined) updates.push(`category = $${params.push(category)}`)
    if (city !== undefined) updates.push(`city = $${params.push(city)}`)
    if (address !== undefined) updates.push(`address = $${params.push(address)}`)
    if (duration_hours !== undefined) updates.push(`duration_hours = $${params.push(parseFloat(duration_hours))}`)
    if (max_participants !== undefined) updates.push(`max_participants = $${params.push(parseInt(max_participants))}`)
    if (price_per_person !== undefined) updates.push(`price_per_person = $${params.push(parseFloat(price_per_person))}`)
    if (images !== undefined) updates.push(`images = $${params.push(JSON.stringify(images))}`)
    if (included !== undefined) updates.push(`included = $${params.push(JSON.stringify(included))}`)
    if (requirements !== undefined) updates.push(`requirements = $${params.push(requirements)}`)
    if (languages !== undefined) updates.push(`languages = $${params.push(JSON.stringify(languages))}`)
    if (is_active !== undefined) updates.push(`is_active = $${params.push(Boolean(is_active))}`)

    if (updates.length === 0) return res.status(400).json({ message: 'No fields to update' })
    updates.push(`updated_at = NOW()`)
    params.push(req.params.id)

    const experience = await db.one(
      `UPDATE experiences SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    )
    res.json({ experience })
  } catch (err) {
    next(err)
  }
})

// POST /api/experiences/:id/book — book an experience
router.post('/experiences/:id/book', authenticate, async (req, res, next) => {
  try {
    const experience = await db.oneOrNone(
      'SELECT * FROM experiences WHERE id = $1 AND is_active = true',
      [req.params.id]
    )
    if (!experience) return res.status(404).json({ message: 'Experience not found' })

    const { date, participants, notes } = req.body
    if (!date) return res.status(400).json({ message: 'date is required' })

    const count = parseInt(participants) || 1
    if (count > experience.max_participants) {
      return res.status(400).json({ message: `Maximum ${experience.max_participants} participants allowed` })
    }

    const total_cents = Math.round(parseFloat(experience.price_per_person) * 100 * count)

    const booking = await db.one(
      `INSERT INTO experience_bookings (experience_id, guest_id, guest_email, guest_name, date, participants, total_cents, notes, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) RETURNING *`,
      [experience.id, req.user.id, req.user.email, req.user.name || req.user.email, date, count, total_cents, notes || null]
    )
    res.status(201).json({ booking })
  } catch (err) {
    next(err)
  }
})

// GET /api/experiences/my — host's own experiences
router.get('/experiences/my/listings', authenticate, async (req, res, next) => {
  try {
    const experiences = await db.any(
      'SELECT * FROM experiences WHERE host_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    )
    res.json({ experiences })
  } catch (err) {
    next(err)
  }
})

module.exports = router
