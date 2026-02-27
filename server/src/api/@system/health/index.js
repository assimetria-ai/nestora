// @system — health check endpoint
// Returns 200 when the server + DB are healthy; 503 on degraded state.
// Internal component details (db/redis) are NOT exposed publicly to avoid
// leaking infrastructure topology to unauthenticated callers.
const express = require('express')
const router = express.Router()
const db = require('../../../lib/@system/PostgreSQL')

// GET /api/health
router.get('/health', async (_req, res) => {
  let healthy = true

  try {
    await db.one('SELECT 1')
  } catch (_err) {
    healthy = false
  }

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
  })
})

module.exports = router
