// @custom — brand settings API
const express = require('express')
const router = express.Router()
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const BrandRepo = require('../../../db/repos/@custom/BrandRepo')
const { validate } = require('../../../lib/@system/Validation')
const { CreateBrandBody, UpdateBrandBody, UploadLogoBody, BrandIdParams, PaginationQuery } = require('../../../lib/@system/Validation/schemas/@custom/brands')

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function isValidHex(color) {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color)
}

// Base64 logo: must be a data URL with image mime type, max ~2MB after decode
function isValidLogoDataUrl(str) {
  if (typeof str !== 'string') return false
  return /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/.test(str)
}

// ─── GET /api/brands ─────────────────────────────────────────────────────────
// Returns brands belonging to the authenticated user
router.get('/brands', authenticate, async (req, res, next) => {
  try {
    const brands = await BrandRepo.findAll({ user_id: req.user.id })
    res.json({ brands })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/brands/:id ─────────────────────────────────────────────────────
router.get('/brands/:id', authenticate, async (req, res, next) => {
  try {
    const brand = await BrandRepo.findById(req.params.id)
    if (!brand) return res.status(404).json({ message: 'Brand not found' })
    if (brand.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' })
    }
    res.json({ brand })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/brands ────────────────────────────────────────────────────────
// Create a new brand
router.post('/brands', authenticate, validate({ body: CreateBrandBody }), async (req, res, next) => {
  try {
    const { name, description, website_url, primary_color, secondary_color } = req.body

    const slug = slugify(name.trim())
    const existing = await BrandRepo.findBySlug(slug)
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug

    const brand = await BrandRepo.create({
      name: name.trim(),
      slug: finalSlug,
      description: description ?? null,
      website_url: website_url ?? null,
      primary_color: primary_color ?? null,
      secondary_color: secondary_color ?? null,
      user_id: req.user.id,
    })
    res.status(201).json({ brand })
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/brands/:id ───────────────────────────────────────────────────
// Update brand settings (name, colors, website)
router.patch('/brands/:id', authenticate, validate({ params: BrandIdParams, body: UpdateBrandBody }), async (req, res, next) => {
  try {
    const brand = await BrandRepo.findById(req.params.id)
    if (!brand) return res.status(404).json({ message: 'Brand not found' })
    if (brand.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const { name, description, website_url, primary_color, secondary_color, status } = req.body

    const updated = await BrandRepo.update(brand.id, {
      name: name ?? null,
      description: description ?? null,
      website_url: website_url ?? null,
      primary_color: primary_color ?? null,
      secondary_color: secondary_color ?? null,
      status: status ?? null,
    })
    res.json({ brand: updated })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/brands/:id/logo ───────────────────────────────────────────────
// Upload logo as base64 data URL (stored in logo_url column)
router.post('/brands/:id/logo', authenticate, validate({ params: BrandIdParams, body: UploadLogoBody }), async (req, res, next) => {
  try {
    const brand = await BrandRepo.findById(req.params.id)
    if (!brand) return res.status(404).json({ message: 'Brand not found' })
    if (brand.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const { logo } = req.body

    const updated = await BrandRepo.update(brand.id, { logo_url: logo })
    res.json({ brand: updated })
  } catch (err) {
    next(err)
  }
})

// ─── DELETE /api/brands/:id/logo ────────────────────────────────────────────
// Remove the brand logo
router.delete('/brands/:id/logo', authenticate, async (req, res, next) => {
  try {
    const brand = await BrandRepo.findById(req.params.id)
    if (!brand) return res.status(404).json({ message: 'Brand not found' })
    if (brand.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    // Set logo_url to empty string via direct query so COALESCE doesn't skip it
    const db = require('../../../lib/@system/PostgreSQL')
    const updated = await db.oneOrNone(
      `UPDATE brands SET logo_url = NULL, updated_at = now() WHERE id = $1 RETURNING *`,
      [brand.id]
    )
    res.json({ brand: updated })
  } catch (err) {
    next(err)
  }
})

// ─── DELETE /api/brands/:id — soft delete ────────────────────────────────────
router.delete('/brands/:id', authenticate, async (req, res, next) => {
  try {
    const brand = await BrandRepo.findById(req.params.id)
    if (!brand) return res.status(404).json({ message: 'Brand not found' })
    if (brand.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' })
    }
    const deleted = await BrandRepo.softDelete(brand.id)
    res.json({ message: 'Brand deleted', brand: deleted })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/brands/deleted — list soft-deleted brands ─────────────────────
router.get('/brands/deleted', authenticate, validate({ query: PaginationQuery }), async (req, res, next) => {
  try {
    const { limit, offset } = req.query
    const brands = await BrandRepo.findDeleted({
      user_id: req.user.role === 'admin' ? undefined : req.user.id,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    })
    res.json({ brands })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/brands/:id/restore — restore soft-deleted brand ───────────────
router.post('/brands/:id/restore', authenticate, async (req, res, next) => {
  try {
    const brand = await BrandRepo.findByIdIncludingDeleted(req.params.id)
    if (!brand) return res.status(404).json({ message: 'Brand not found' })
    if (brand.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' })
    }
    if (!brand.deleted_at) return res.status(400).json({ message: 'Brand is not deleted' })
    const restored = await BrandRepo.restore(brand.id)
    res.json({ brand: restored })
  } catch (err) {
    next(err)
  }
})

module.exports = router
