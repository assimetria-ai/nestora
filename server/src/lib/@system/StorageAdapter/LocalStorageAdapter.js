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

const LocalStorageAdapter = {
  provider: 'local',

  /**
   * For local storage, returns a token-based upload endpoint URL.
   * The server must expose POST /api/storage/upload to accept the file.
   * @param {{ filename: string, contentType: string, folder?: string, expiresIn?: number }} opts
   * @returns {Promise<{ url: string, key: string, publicUrl: string, expiresAt: Date }>}
   */
  async createUploadUrl({ filename, contentType, folder = 'uploads', expiresIn = 300 }) {
    const ext = filename.includes('.') ? filename.split('.').pop().toLowerCase() : ''
    const key = `${folder}/${uuidv4()}${ext ? '.' + ext : ''}`
    const appUrl = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
    const uploadToken = Buffer.from(JSON.stringify({ key, contentType, exp: Date.now() + expiresIn * 1000 })).toString('base64url')

    logger.info({ key }, '[StorageAdapter:local] upload URL created')
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
