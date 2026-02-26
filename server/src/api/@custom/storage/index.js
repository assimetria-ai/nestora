// @custom — Storage API (presigned S3 uploads)
//
// POST  /api/storage/presign         — request a presigned PUT URL for S3 upload
// PATCH /api/storage/:fileId/confirm — confirm a file was successfully uploaded
// GET   /api/storage/:fileId         — get file record by ID
// DELETE /api/storage/:fileId        — delete file record (and S3 object)

'use strict'

const express = require('express')
const router = express.Router()
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const S3 = require('../../../lib/@system/AWS/S3')
const FileUploadRepo = require('../../../db/repos/@custom/FileUploadRepo')
const logger = require('../../../lib/@system/Logger')
const { validate } = require('../../../lib/@system/Validation')
const { PresignBody, FileIdParams, ConfirmUploadBody } = require('../../../lib/@system/Validation/schemas/@custom/storage')

// ── Allowed MIME types (restrict to safe set) ─────────────────────────────────

const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Text
  'text/plain', 'text/csv', 'text/markdown',
  // Audio / Video
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
  'video/mp4', 'video/webm', 'video/ogg',
  // Archives
  'application/zip',
])

const MAX_SIZE_BYTES = 100 * 1024 * 1024 // 100 MB

// ── POST /api/storage/presign ─────────────────────────────────────────────────

/**
 * Request a presigned S3 PUT URL.
 *
 * Body:
 *   filename     {string}  — original filename  (required)
 *   content_type {string}  — MIME type          (required)
 *   size         {number}  — file size in bytes (optional, used for validation)
 *   folder       {string}  — S3 key prefix      (optional, default: 'uploads')
 *
 * Response:
 *   { file_id, upload_url, key, bucket, expires_at, public_url }
 */
router.post('/storage/presign', authenticate, validate({ body: PresignBody }), async (req, res, next) => {
  try {
    const { filename, content_type, size, folder } = req.body

    const cleanFilename = filename.trim().replace(/[^a-zA-Z0-9._-]/g, '_')
    const mimeType = content_type

    const { url, key, bucket, expiresAt } = await S3.createPresignedPutUrl({
      filename: cleanFilename,
      contentType: mimeType,
      folder: folder ?? 'uploads',
    })

    const record = await FileUploadRepo.create({
      user_id: req.user.id,
      key,
      filename: cleanFilename,
      content_type: mimeType,
      bucket,
    })

    const publicUrl = S3.getPublicUrl(key, bucket)

    logger.info({ userId: req.user.id, fileId: record.id, key }, 'presigned upload URL generated')

    return res.status(201).json({
      file_id: record.id,
      upload_url: url,
      key,
      bucket,
      expires_at: expiresAt.toISOString(),
      public_url: publicUrl,
    })
  } catch (err) {
    next(err)
  }
})

// ── PATCH /api/storage/:fileId/confirm ───────────────────────────────────────

/**
 * Confirm a file was successfully uploaded.
 * Optionally verifies the object exists in S3 before confirming.
 *
 * Body (optional):
 *   size_bytes {number} — actual file size after upload
 *   verify     {boolean} — check S3 existence before confirming (default: false)
 */
router.patch('/storage/:fileId/confirm', authenticate, validate({ params: FileIdParams, body: ConfirmUploadBody }), async (req, res, next) => {
  try {
    const fileId = req.params.fileId

    const record = await FileUploadRepo.findById(fileId)
    if (!record) return res.status(404).json({ message: 'File not found' })
    if (record.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    if (record.status === 'uploaded') {
      return res.json({ message: 'Already confirmed', file: record })
    }

    const { size_bytes, verify = false } = req.body

    if (verify) {
      const head = await S3.headObject(record.key, record.bucket)
      if (!head.exists) {
        await FileUploadRepo.markFailed(fileId)
        return res.status(422).json({ message: 'File not found in storage — upload may have failed' })
      }
    }

    const updated = await FileUploadRepo.confirm(fileId, { size_bytes })
    logger.info({ userId: req.user.id, fileId }, 'file upload confirmed')

    return res.json({ file: updated })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/storage/:fileId ──────────────────────────────────────────────────

router.get('/storage/:fileId', authenticate, validate({ params: FileIdParams }), async (req, res, next) => {
  try {
    const fileId = req.params.fileId

    const record = await FileUploadRepo.findById(fileId)
    if (!record) return res.status(404).json({ message: 'File not found' })
    if (record.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    return res.json({
      file: {
        ...record,
        public_url: S3.getPublicUrl(record.key, record.bucket),
      },
    })
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/storage/:fileId — soft delete ─────────────────────────────────

router.delete('/storage/:fileId', authenticate, validate({ params: FileIdParams }), async (req, res, next) => {
  try {
    const fileId = req.params.fileId

    const record = await FileUploadRepo.findById(fileId)
    if (!record) return res.status(404).json({ message: 'File not found' })
    if (record.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const deleted = await FileUploadRepo.softDelete(fileId)
    logger.info({ userId: req.user.id, fileId, key: record.key }, 'file soft-deleted')

    return res.json({ message: 'File deleted', file: deleted })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/storage/:fileId/restore — restore soft-deleted file ─────────────

router.post('/storage/:fileId/restore', authenticate, validate({ params: FileIdParams }), async (req, res, next) => {
  try {
    const fileId = req.params.fileId

    const record = await FileUploadRepo.findByIdIncludingDeleted(fileId)
    if (!record) return res.status(404).json({ message: 'File not found' })
    if (record.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    if (!record.deleted_at) return res.status(400).json({ message: 'File is not deleted' })

    const restored = await FileUploadRepo.restore(fileId)
    logger.info({ userId: req.user.id, fileId }, 'file restored')

    return res.json({ file: restored })
  } catch (err) {
    next(err)
  }
})

module.exports = router
