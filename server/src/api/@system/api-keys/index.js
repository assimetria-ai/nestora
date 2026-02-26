// @system — API key management
// GET    /api/api-keys        — list caller's API keys
// POST   /api/api-keys        — create a new API key (returns raw key once)
// DELETE /api/api-keys/:id    — revoke an API key
const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const ApiKeyRepo = require('../../../db/repos/@system/ApiKeyRepo')
const { validate } = require('../../../lib/@system/Validation')
const { CreateApiKeyBody, DeleteApiKeyParams } = require('../../../lib/@system/Validation/schemas/@system/api-keys')

const KEY_PREFIX = 'sk_'
const KEY_BYTES = 32 // 256 bits → 64 hex chars

function generateApiKey() {
  const raw = crypto.randomBytes(KEY_BYTES).toString('hex')
  return `${KEY_PREFIX}${raw}`
}

function hashKey(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

// GET /api/api-keys — list keys (hashes never returned)
router.get('/api-keys', authenticate, async (req, res, next) => {
  try {
    const keys = await ApiKeyRepo.findAllByUser(req.user.id)
    res.json({ apiKeys: keys })
  } catch (err) {
    next(err)
  }
})

// POST /api/api-keys — create
router.post('/api-keys', authenticate, validate({ body: CreateApiKeyBody }), async (req, res, next) => {
  try {
    const { name, expiresAt } = req.body

    const raw = generateApiKey()
    const keyHash = hashKey(raw)
    const keyPrefix = raw.slice(0, KEY_PREFIX.length + 8) // "sk_" + first 8 hex chars

    const apiKey = await ApiKeyRepo.create({
      userId: req.user.id,
      name: name.trim(),
      keyHash,
      keyPrefix,
      expiresAt: expiresAt ?? null,
    })

    // Return raw key only once — caller must save it
    res.status(201).json({ apiKey: { ...apiKey, key: raw } })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/api-keys/:id — revoke
router.delete('/api-keys/:id', authenticate, validate({ params: DeleteApiKeyParams }), async (req, res, next) => {
  try {
    const id = req.params.id

    const deleted = await ApiKeyRepo.deleteById(id, req.user.id)
    if (!deleted) return res.status(404).json({ message: 'API key not found' })

    res.json({ message: 'API key revoked' })
  } catch (err) {
    next(err)
  }
})

module.exports = router
