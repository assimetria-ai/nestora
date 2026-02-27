// @system — Storage API routes
// Exposes unified file storage operations backed by StorageAdapter (S3 / R2 / local).
//
// GET    /api/storage/health             — Health & config info for active adapter (admin only)
// GET    /api/storage/health/all         — Health info for ALL adapters (admin only)
// POST   /api/storage/upload-url         — Generate a presigned upload URL (authenticated)
// POST   /api/storage/download-url       — Generate a presigned download URL (authenticated)
// DELETE /api/storage/object             — Delete a stored object (authenticated)
// POST   /api/storage/local-upload       — Receive a file for local filesystem storage (token-based)

'use strict'

const express = require('express')
const router = express.Router()

const { authenticate, requireAdmin } = require('../../../lib/@system/Helpers/auth')
const Storage = require('../../../lib/@system/StorageAdapter')
const LocalAdapter = require('../../../lib/@system/StorageAdapter/LocalStorageAdapter')
const { ValidationError } = require('../../../lib/@system/Errors')
const logger = require('../../../lib/@system/Logger')

// ── GET /api/storage/health ───────────────────────────────────────────────────
// Returns health and configuration of the currently active adapter.
// Admin-only — contains bucket names, regions, credentials status.

router.get('/storage/health', authenticate, requireAdmin, (req, res, next) => {
  try {
    res.json({ ok: true, ...Storage.health() })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/storage/health/all ───────────────────────────────────────────────
// Returns health info for every registered adapter (s3, r2, local).

router.get('/storage/health/all', authenticate, requireAdmin, (req, res, next) => {
  try {
    res.json({ ok: true, adapters: Storage.healthAll() })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/storage/upload-url ─────────────────────────────────────────────
// Body: { filename, contentType, folder?, expiresIn? }
// Returns: { url, key, publicUrl, expiresAt }
//
// For S3/R2: url is a presigned PUT URL — the client uploads directly to the storage provider.
// For local: url points to POST /api/storage/local-upload with a short-lived token.

router.post('/storage/upload-url', authenticate, async (req, res, next) => {
  try {
    const { filename, contentType, folder, expiresIn } = req.body

    if (!filename || typeof filename !== 'string') {
      throw new ValidationError('filename is required')
    }
    if (!contentType || typeof contentType !== 'string') {
      throw new ValidationError('contentType is required')
    }

    const result = await Storage.createUploadUrl({
      filename: filename.trim(),
      contentType: contentType.trim(),
      folder: folder ?? 'uploads',
      expiresIn: expiresIn ?? 300,
    })

    logger.info({ key: result.key, provider: Storage.provider, userId: req.user?.id }, '[storage] upload URL issued')
    res.status(201).json({ ok: true, ...result })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/storage/download-url ───────────────────────────────────────────
// Body: { key, expiresIn? }
// Returns: { url, expiresAt }
//
// For S3/R2: returns a presigned GET URL.
// For local: returns the public file URL (no expiry enforced by the adapter).

router.post('/storage/download-url', authenticate, async (req, res, next) => {
  try {
    const { key, expiresIn } = req.body

    if (!key || typeof key !== 'string') {
      throw new ValidationError('key is required')
    }

    const result = await Storage.createDownloadUrl({
      key: key.trim(),
      expiresIn: expiresIn ?? 3600,
    })

    res.json({ ok: true, ...result })
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/storage/object ────────────────────────────────────────────────
// Body: { key }
// Deletes the object from the active storage backend.

router.delete('/storage/object', authenticate, async (req, res, next) => {
  try {
    const { key } = req.body

    if (!key || typeof key !== 'string') {
      throw new ValidationError('key is required')
    }

    await Storage.delete(key.trim())

    logger.info({ key, provider: Storage.provider, userId: req.user?.id }, '[storage] object deleted')
    res.json({ ok: true, deleted: true })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/storage/local-upload ───────────────────────────────────────────
// Handles file upload for the local filesystem adapter.
// Expects multipart/form-data with a `file` field, OR raw body (application/octet-stream).
// Also accepts an upload token issued by LocalStorageAdapter.createUploadUrl().
//
// Query params:
//   token — base64url token containing { key, contentType, exp }
//
// This endpoint is intentionally unauthenticated via JWT — it uses the short-lived
// upload token for authorisation instead (same pattern as presigned S3 URLs).

router.post('/storage/local-upload', express.raw({ type: '*/*', limit: '50mb' }), async (req, res, next) => {
  try {
    const { token } = req.query

    if (!token) {
      return res.status(400).json({ ok: false, message: 'Missing upload token' })
    }

    // Decode and validate token
    let tokenData
    try {
      tokenData = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'))
    } catch {
      return res.status(400).json({ ok: false, message: 'Invalid upload token' })
    }

    const { key, exp } = tokenData
    if (!key) {
      return res.status(400).json({ ok: false, message: 'Malformed upload token' })
    }
    if (exp && Date.now() > exp) {
      return res.status(400).json({ ok: false, message: 'Upload token has expired' })
    }

    const buffer = req.body
    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ ok: false, message: 'No file data received' })
    }

    await LocalAdapter.write(key, buffer)

    const publicUrl = LocalAdapter.getPublicUrl(key)
    logger.info({ key, size: buffer.length }, '[storage:local] file uploaded via token')

    res.status(201).json({ ok: true, key, publicUrl })
  } catch (err) {
    next(err)
  }
})

module.exports = router
