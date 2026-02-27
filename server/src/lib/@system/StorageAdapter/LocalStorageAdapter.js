// @system — Local filesystem storage adapter implementation
// For development / self-hosted deployments without cloud storage.
// Files are stored under LOCAL_STORAGE_DIR (default: ./uploads).
// Served statically via /uploads express.static middleware.
//
// Required env vars:
//   LOCAL_STORAGE_DIR   — Absolute path to store files (default: <cwd>/uploads)
//   APP_URL             — Base URL for building public URLs
'use strict'

const fs = require('fs')
const path = require('path')
const { v4: uuidv4 } = require('uuid')
const logger = require('../Logger')

function getStorageDir() {
  return process.env.LOCAL_STORAGE_DIR ?? path.join(process.cwd(), 'uploads')
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

/**
 * SECURITY: Sanitize filename to prevent path traversal attacks.
 * Removes any path separators, parent directory references, and null bytes.
 * @param {string} input - User-provided filename or folder name
 * @returns {string} - Sanitized safe string
 */
function sanitizePathComponent(input) {
  if (!input || typeof input !== 'string') return ''
  
  // Remove null bytes (can bypass some security checks)
  let safe = input.replace(/\0/g, '')
  
  // Remove path traversal sequences
  safe = safe.replace(/\.\./g, '')  // Remove ..
  safe = safe.replace(/[\/\\]/g, '') // Remove / and \
  
  // Remove leading/trailing dots and spaces
  safe = safe.replace(/^[\s.]+|[\s.]+$/g, '')
  
  // If empty after sanitization, return a safe default
  if (!safe) return 'file'
  
  return safe
}

/**
 * SECURITY: Extract file extension safely from filename.
 * Only returns alphanumeric extensions up to 10 chars.
 * @param {string} filename - User-provided filename
 * @returns {string} - Safe extension (without dot) or empty string
 */
function safeExtension(filename) {
  if (!filename || typeof filename !== 'string') return ''
  
  // SECURITY: Remove null bytes first - everything after \0 is ignored
  // This prevents attacks like "safe.txt\0.php"
  const nullByteIndex = filename.indexOf('\0')
  if (nullByteIndex !== -1) {
    filename = filename.substring(0, nullByteIndex)
  }
  
  const parts = filename.split('.')
  if (parts.length < 2) return ''
  
  const ext = parts.pop().toLowerCase()
  
  // Only allow alphanumeric extensions up to 10 characters
  if (/^[a-z0-9]{1,10}$/i.test(ext)) {
    return ext
  }
  
  return ''
}

const LocalStorageAdapter = {
  provider: 'local',

  /**
   * For local storage, returns a token-based upload endpoint URL.
   * The server must expose POST /api/storage/upload to accept the file.
   * @param {{ filename: string, contentType: string, folder?: string, expiresIn?: number }} opts
   * @returns {Promise<{ url: string, key: string, publicUrl: string, expiresAt: Date }>}
   */
  async createUploadUrl({ filename, contentType, folder = 'uploads', expiresIn = 300 }) {
    // SECURITY: Sanitize filename and folder to prevent path traversal
    // Extract extension from ORIGINAL filename (before sanitization) to handle null bytes correctly
    const ext = safeExtension(filename)
    const safeName = sanitizePathComponent(filename)
    const safeFolder = sanitizePathComponent(folder)
    
    const key = `${safeFolder}/${uuidv4()}${ext ? '.' + ext : ''}`
    const appUrl = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
    const uploadToken = Buffer.from(JSON.stringify({ key, contentType, exp: Date.now() + expiresIn * 1000 })).toString('base64url')

    logger.info({ key, originalFilename: filename, sanitized: safeName }, '[StorageAdapter:local] upload URL created')
    return {
      url: `${appUrl}/api/storage/local-upload?token=${uploadToken}`,
      key,
      publicUrl: this.getPublicUrl(key),
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    }
  },

  /**
   * Get a download URL (direct link for local storage).
   * @param {{ key: string }} opts
   * @returns {Promise<{ url: string, expiresAt: Date }>}
   */
  async createDownloadUrl({ key }) {
    return {
      url: this.getPublicUrl(key),
      expiresAt: new Date(Date.now() + 86400 * 1000),
    }
  },

  /**
   * Build the public URL for a local file.
   * @param {string} key
   * @returns {string}
   */
  getPublicUrl(key) {
    const appUrl = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
    return `${appUrl}/uploads/${key}`
  },

  /**
   * Delete a local file.
   * @param {string} key
   */
  async delete(key) {
    const storageDir = getStorageDir()
    const filePath = path.join(storageDir, key)
    // Prevent path traversal
    if (!filePath.startsWith(storageDir)) {
      throw Object.assign(new Error('Invalid key: path traversal detected'), { status: 400 })
    }
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      logger.info({ key }, '[StorageAdapter:local] file deleted')
    }
  },

  /**
   * Check if a local file exists.
   * @param {string} key
   * @returns {Promise<{ exists: boolean, size?: number }>}
   */
  async exists(key) {
    const storageDir = getStorageDir()
    const filePath = path.join(storageDir, key)
    if (!filePath.startsWith(storageDir)) return { exists: false }
    try {
      const stat = fs.statSync(filePath)
      return { exists: true, size: stat.size }
    } catch {
      return { exists: false }
    }
  },

  /**
   * Write a file directly (used internally by the local upload endpoint).
   * @param {string} key
   * @param {Buffer} buffer
   */
  async write(key, buffer) {
    const storageDir = getStorageDir()
    const filePath = path.join(storageDir, key)
    if (!filePath.startsWith(storageDir)) {
      throw Object.assign(new Error('Invalid key: path traversal detected'), { status: 400 })
    }
    ensureDir(path.dirname(filePath))
    fs.writeFileSync(filePath, buffer)
    logger.info({ key, size: buffer.length }, '[StorageAdapter:local] file written')
  },

  /**
   * Return health/config info for this adapter.
   */
  health() {
    const dir = getStorageDir()
    return {
      provider: 'local',
      configured: true,
      directory: dir,
      exists: fs.existsSync(dir),
    }
  },
}

module.exports = LocalStorageAdapter
