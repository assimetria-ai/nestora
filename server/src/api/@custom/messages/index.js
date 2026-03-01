const express = require('express')
const router = express.Router()
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const db = require('../../../lib/@system/PostgreSQL')

// GET /api/messages/conversations — list my conversations (as guest or host)
router.get('/messages/conversations', authenticate, async (req, res, next) => {
  try {
    const conversations = await db.any(
      `SELECT c.*,
              p.title as property_title, p.images as property_images,
              guest.name as guest_name, guest.email as guest_email,
              host.name as host_name, host.email as host_email,
              (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
              (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != $1 AND m.read_at IS NULL) as unread_count
       FROM conversations c
       LEFT JOIN properties p ON c.property_id = p.id
       LEFT JOIN users guest ON c.guest_id = guest.id
       LEFT JOIN users host ON c.host_id = host.id
       WHERE c.guest_id = $1 OR c.host_id = $1
       ORDER BY c.last_message_at DESC`,
      [req.user.id]
    )
    res.json({ conversations })
  } catch (err) {
    next(err)
  }
})

// GET /api/messages/conversations/:id — get messages in a conversation
router.get('/messages/conversations/:id', authenticate, async (req, res, next) => {
  try {
    const conv = await db.oneOrNone(
      'SELECT * FROM conversations WHERE id = $1 AND (guest_id = $2 OR host_id = $2)',
      [req.params.id, req.user.id]
    )
    if (!conv) return res.status(404).json({ message: 'Conversation not found' })

    const messages = await db.any(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [conv.id]
    )

    // Mark messages from others as read
    await db.none(
      'UPDATE messages SET read_at = NOW() WHERE conversation_id = $1 AND sender_id != $2 AND read_at IS NULL',
      [conv.id, req.user.id]
    )

    res.json({ conversation: conv, messages })
  } catch (err) {
    next(err)
  }
})

// POST /api/messages/conversations — start a new conversation
router.post('/messages/conversations', authenticate, async (req, res, next) => {
  try {
    const { property_id, initial_message, booking_id } = req.body
    if (!property_id || !initial_message) {
      return res.status(400).json({ message: 'property_id and initial_message are required' })
    }

    const property = await db.oneOrNone(
      'SELECT * FROM properties WHERE id = $1',
      [property_id]
    )
    if (!property) return res.status(404).json({ message: 'Property not found' })

    if (property.landlord_id === req.user.id) {
      return res.status(400).json({ message: 'Cannot message your own property' })
    }

    // Check for existing conversation
    const existing = await db.oneOrNone(
      'SELECT * FROM conversations WHERE property_id = $1 AND guest_id = $2',
      [property_id, req.user.id]
    )

    let conv = existing
    if (!conv) {
      conv = await db.one(
        `INSERT INTO conversations (property_id, guest_id, host_id, booking_id, last_message_at, created_at)
         VALUES ($1,$2,$3,$4,NOW(),NOW()) RETURNING *`,
        [property_id, req.user.id, property.landlord_id, booking_id || null]
      )
    }

    const message = await db.one(
      `INSERT INTO messages (conversation_id, sender_id, sender_name, body, created_at)
       VALUES ($1,$2,$3,$4,NOW()) RETURNING *`,
      [conv.id, req.user.id, req.user.name || req.user.email, initial_message.trim()]
    )

    await db.none(
      'UPDATE conversations SET last_message_at = NOW() WHERE id = $1',
      [conv.id]
    )

    res.status(201).json({ conversation: conv, message })
  } catch (err) {
    next(err)
  }
})

// POST /api/messages/conversations/:id/reply — send a message in a conversation
router.post('/messages/conversations/:id/reply', authenticate, async (req, res, next) => {
  try {
    const conv = await db.oneOrNone(
      'SELECT * FROM conversations WHERE id = $1 AND (guest_id = $2 OR host_id = $2)',
      [req.params.id, req.user.id]
    )
    if (!conv) return res.status(404).json({ message: 'Conversation not found' })

    const { body } = req.body
    if (!body?.trim()) return res.status(400).json({ message: 'Message body is required' })

    const message = await db.one(
      `INSERT INTO messages (conversation_id, sender_id, sender_name, body, created_at)
       VALUES ($1,$2,$3,$4,NOW()) RETURNING *`,
      [conv.id, req.user.id, req.user.name || req.user.email, body.trim()]
    )

    await db.none(
      'UPDATE conversations SET last_message_at = NOW() WHERE id = $1',
      [conv.id]
    )

    res.status(201).json({ message })
  } catch (err) {
    next(err)
  }
})

module.exports = router
