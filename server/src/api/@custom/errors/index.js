const express = require('express')
const router = express.Router()
const { authenticate, requireAdmin } = require('../../lib/@system/Helpers/auth')
const ErrorEventRepo = require('../../../db/repos/@custom/ErrorEventRepo')

// GET /api/errors/stats
router.get('/errors/stats', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { environment } = req.query
    const stats = await ErrorEventRepo.getStats(environment || null)
    res.json({ stats })
  } catch (err) {
    next(err)
  }
})

// GET /api/errors
router.get('/errors', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status, level, environment, limit = '50', offset = '0' } = req.query
    const [events, total] = await Promise.all([
      ErrorEventRepo.findAll({ status, level, environment, limit: parseInt(limit), offset: parseInt(offset) }),
      ErrorEventRepo.count({ status, level, environment }),
    ])
    res.json({ events, total })
  } catch (err) {
    next(err)
  }
})

// GET /api/errors/:id
router.get('/errors/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const event = await ErrorEventRepo.findById(req.params.id)
    if (!event) return res.status(404).json({ message: 'Error event not found' })
    res.json({ event })
  } catch (err) {
    next(err)
  }
})

// POST /api/errors  — ingest an error event (SDK/webhook endpoint)
// Uses a shared DSN secret instead of user auth for flexibility
router.post('/errors', async (req, res, next) => {
  try {
    const dsn = req.headers['x-sentry-dsn'] ?? req.headers['x-error-dsn']
    const expectedDsn = process.env.ERROR_TRACKING_DSN
    if (expectedDsn && dsn !== expectedDsn) {
      return res.status(401).json({ message: 'Invalid DSN' })
    }

    const { fingerprint, title, message, level, platform, environment, release, stack_trace, extra } = req.body
    if (!fingerprint || !title) {
      return res.status(400).json({ message: 'fingerprint and title are required' })
    }

    const event = await ErrorEventRepo.upsertByFingerprint({
      fingerprint,
      title,
      message,
      level,
      platform,
      environment,
      release,
      stack_trace,
      extra,
    })

    res.status(201).json({ event })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/errors/:id/status
router.patch('/errors/:id/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body
    const allowed = ['unresolved', 'resolved', 'ignored']
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${allowed.join(', ')}` })
    }
    const event = await ErrorEventRepo.updateStatus(req.params.id, status)
    if (!event) return res.status(404).json({ message: 'Error event not found' })
    res.json({ event })
  } catch (err) {
    next(err)
  }
})

module.exports = router
