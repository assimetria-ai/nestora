const { z } = require('zod')

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv', 'text/markdown',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
  'video/mp4', 'video/webm', 'video/ogg',
  'application/zip',
]

const MAX_SIZE_BYTES = 100 * 1024 * 1024 // 100 MB

const PresignBody = z.object({
  filename: z.string({ required_error: 'filename is required' }).trim().min(1, 'filename is required'),
  content_type: z
    .string({ required_error: 'content_type is required' })
    .toLowerCase()
    .trim()
    .refine((v) => ALLOWED_MIME_TYPES.includes(v), (v) => ({ message: `Unsupported content type: ${v}` })),
  size: z.number().int().positive().max(MAX_SIZE_BYTES, `File size exceeds maximum of ${MAX_SIZE_BYTES / (1024 * 1024)} MB`).optional(),
  folder: z.string().optional(),
})

const FileIdParams = z.object({
  fileId: z.coerce.number({ invalid_type_error: 'fileId must be a number' }).int().positive('fileId must be a positive integer'),
})

const ConfirmUploadBody = z.object({
  size_bytes: z.number().int().positive().optional(),
  verify: z.boolean().optional().default(false),
})

module.exports = { PresignBody, FileIdParams, ConfirmUploadBody }
