// @custom — transactional email tracking API

'use strict'

const crypto = require('crypto')
const express = require('express')
const router = express.Router()
const { authenticate, requireAdmin } = require('../../../lib/@system/Helpers/auth')
const EmailLogRepo = require('../../../db/repos/@custom/EmailLogRepo')
const emailTemplates = require('../../../lib/@system/Email/templates')

// Timing-safe string comparison to prevent secret leakage via response-time analysis
function timingSafeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA) // consume time to avoid length-based timing leak
    return false
  }
  return crypto.timingSafeEqual(bufA, bufB)
}

// ── Template preview (admin-only) ──────────────────────────────────────────

const PREVIEW_FIXTURES = {
  verification: () => emailTemplates.verification({
    name: 'Alex',
    verifyUrl: `${process.env.APP_URL ?? 'http://localhost:5173'}/verify-email?token=PREVIEW_TOKEN_abc123`,
  }),
  welcome: () => emailTemplates.welcome({
    name: 'Alex',
    appUrl: process.env.APP_URL ?? 'http://localhost:5173',
    appName: process.env.APP_NAME ?? 'App',
  }),
  password_reset: () => emailTemplates.passwordReset({
    name: 'Alex',
    resetUrl: `${process.env.APP_URL ?? 'http://localhost:5173'}/reset-password?token=PREVIEW_TOKEN_xyz789`,
  }),
  invitation: () => emailTemplates.invitation({
    inviterName: 'Jordan Smith',
    orgName: 'Acme Corp',
    inviteUrl: `${process.env.APP_URL ?? 'http://localhost:5173'}/accept-invite?token=PREVIEW_TOKEN_inv456`,
  }),
  magic_link: () => emailTemplates.magicLink({
    name: 'Alex',
    magicUrl: `${process.env.APP_URL ?? 'http://localhost:5173'}/magic-link?token=PREVIEW_TOKEN_ml789`,
  }),
  notification: () => emailTemplates.notification({
    title: 'Your report is ready',
    body: '<p>Your weekly usage report has been generated and is ready to view.</p><p>Here\'s a quick summary: 42 active users, 1,234 events tracked, and 3 new integrations connected this week.</p>',
    ctaLabel: 'View Report',
    ctaUrl: `${process.env.APP_URL ?? 'http://localhost:5173'}/app`,
  }),
}

// GET /api/email-logs/preview — list available template names
router.get('/email-logs/preview', authenticate, requireAdmin, (req, res) => {
  res.json({ templates: Object.keys(PREVIEW_FIXTURES) })
})

// GET /api/email-logs/preview/:template — render a template as HTML (for iframe preview)
router.get('/email-logs/preview/:template', authenticate, requireAdmin, (req, res) => {
  const { template } = req.params
  const builder = PREVIEW_FIXTURES[template]
  if (!builder) {
    return res.status(404).json({
      message: `Unknown template "${template}". Available: ${Object.keys(PREVIEW_FIXTURES).join(', ')}`,
    })
  }
  const html = builder()
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.send(html)
})

// GET /api/email-logs/stats
router.get('/email-logs/stats', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const stats = await EmailLogRepo.getStats()
    res.json({ stats })
  } catch (err) {
    next(err)
  }
})

// GET /api/email-logs/volume
router.get('/email-logs/volume', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const days = Math.min(parseInt(req.query.days ?? '30', 10), 365)
    const volume = await EmailLogRepo.getVolumeByDay({ days })
    res.json({ volume })
  } catch (err) {
    next(err)
  }
})

// GET /api/email-logs/templates
router.get('/email-logs/templates', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const templates = await EmailLogRepo.getTemplateBreakdown()
    res.json({ templates })
  } catch (err) {
    next(err)
  }
})

// GET /api/email-logs
router.get('/email-logs', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status, template, search, limit = '50', offset = '0' } = req.query
    const [logs, total] = await Promise.all([
      EmailLogRepo.findAll({
        status,
        template,
        search,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      }),
      EmailLogRepo.count({ status, template, search }),
    ])
    res.json({ logs, total })
  } catch (err) {
    next(err)
  }
})

// GET /api/email-logs/:id
router.get('/email-logs/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const log = await EmailLogRepo.findById(req.params.id)
    if (!log) return res.status(404).json({ message: 'Email log not found' })
    res.json({ log })
  } catch (err) {
    next(err)
  }
})

// POST /api/email-logs  — ingest an email send event
// Requires EMAIL_TRACKING_SECRET env var. Rejects all ingestion if it is not configured.
router.post('/email-logs', async (req, res, next) => {
  try {
    const expectedSecret = process.env.EMAIL_TRACKING_SECRET
    if (!expectedSecret) {
      return res.status(503).json({ message: 'Email tracking not configured' })
    }
    const secret = req.headers['x-email-tracking-secret']
    if (!secret || !timingSafeCompare(secret, expectedSecret)) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const { to_address, subject, template, status, message_id, provider, error, metadata, user_id } = req.body

    if (!to_address || !subject) {
      return res.status(400).json({ message: 'to_address and subject are required' })
    }

    const log = await EmailLogRepo.create({
      to_address,
      subject,
      template,
      status: status ?? 'sent',
      message_id,
      provider,
      error,
      metadata,
      user_id: user_id ?? null,
    })

    res.status(201).json({ log })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/email-logs/:id/status
router.patch('/email-logs/:id/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const allowed = ['sent', 'delivered', 'bounced', 'failed']
    const { status, error } = req.body

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${allowed.join(', ')}` })
    }

    const log = await EmailLogRepo.updateStatus(req.params.id, status, error ?? null)
    if (!log) return res.status(404).json({ message: 'Email log not found' })
    res.json({ log })
  } catch (err) {
    next(err)
  }
})

module.exports = router
