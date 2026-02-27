// @system — Unified Storage Adapter
// Abstracts AWS S3, Cloudflare R2, and local filesystem behind a single interface.
// Switch providers by setting STORAGE_PROVIDER=s3|r2|local (default: s3).
//
// Usage:
//   const Storage = require('../StorageAdapter')
//   const { url, key } = await Storage.createUploadUrl({ filename, contentType })
//   await Storage.delete(key)

'use strict'

const S3StorageAdapter    = require('./S3StorageAdapter')
const R2StorageAdapter    = require('./R2StorageAdapter')
const LocalStorageAdapter = require('./LocalStorageAdapter')

const ADAPTERS = { s3: S3StorageAdapter, r2: R2StorageAdapter, local: LocalStorageAdapter }

/**
 * @typedef {Object} UploadUrlOptions
 * @property {string}  filename     Original filename (used to derive extension)
 * @property {string}  contentType  MIME type
 * @property {string}  [folder]     Storage path prefix (default: 'uploads')
 * @property {number}  [expiresIn]  Seconds until URL expires (default: 300)
 *
 * @typedef {Object} UploadUrlResult
 * @property {string} url        Presigned upload URL (PUT to this URL)
 * @property {string} key        Storage key for later retrieval/deletion
 * @property {string} publicUrl  Public read URL for the object
 * @property {Date}   expiresAt  When the upload URL expires
 *
 * @typedef {Object} DownloadUrlResult
 * @property {string} url       Presigned download URL
 * @property {Date}   expiresAt When the download URL expires
 */

/** @returns {'s3'|'r2'|'local'} */
function resolveProvider() {
  const p = (process.env.STORAGE_PROVIDER ?? 's3').toLowerCase()
  if (!ADAPTERS[p]) {
    throw new Error(`[StorageAdapter] Unknown STORAGE_PROVIDER="${p}". Use "s3", "r2", or "local".`)
  }
  return p
}

function getAdapter() {
  return ADAPTERS[resolveProvider()]
}

const StorageAdapter = {
  /** Which provider is currently active */
  get provider() { return resolveProvider() },

  /**
   * Generate a presigned upload URL for direct browser-to-storage upload.
   * @param {UploadUrlOptions} opts
   * @returns {Promise<UploadUrlResult>}
   */
  createUploadUrl(opts) {
    return getAdapter().createUploadUrl(opts)
  },

  /**
   * Generate a presigned download URL for private object access.
   * For local storage, returns a direct public link.
   * @param {{ key: string, expiresIn?: number }} opts
   * @returns {Promise<DownloadUrlResult>}
   */
  createDownloadUrl(opts) {
    return getAdapter().createDownloadUrl(opts)
  },

  /**
   * Build the public URL for a stored object.
   * @param {string} key
   * @returns {string}
   */
  getPublicUrl(key) {
    return getAdapter().getPublicUrl(key)
  },

  /**
   * Delete a stored object.
   * @param {string} key
   * @returns {Promise<void>}
   */
  delete(key) {
    return getAdapter().delete(key)
  },

  /**
   * Check if an object exists and get metadata.
   * @param {string} key
   * @returns {Promise<{ exists: boolean, size?: number, contentType?: string }>}
   */
  exists(key) {
    return getAdapter().exists(key)
  },

  /**
   * Return health and configuration info for the active adapter.
   * Safe to expose in admin APIs.
   */
  health() {
    return getAdapter().health()
  },

  /**
   * Return health info for ALL configured adapters.
   * Useful for admin integration status pages.
   */
  healthAll() {
    return Object.fromEntries(
      Object.entries(ADAPTERS).map(([name, adapter]) => [name, adapter.health()])
    )
  },
}

module.exports = StorageAdapter
