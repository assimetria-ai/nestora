// @custom — Blog posts API
// Public: GET /api/blog, GET /api/blog/:slug
// Admin:  POST, PATCH, DELETE, publish, unpublish
const express = require('express')
const router = express.Router()
const { authenticate, requireAdmin } = require('../../../lib/@system/Helpers/auth')
const BlogPostRepo = require('../../../db/repos/@custom/BlogPostRepo')

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function estimateReadingTime(content) {
  const words = (content ?? '').trim().split(/\s+/).length
  return Math.max(1, Math.round(words / 200))
}

// ── GET /api/blog — list published posts (public) ────────────────────────────
router.get('/blog', async (req, res, next) => {
  try {
    const { category, limit = 50, offset = 0 } = req.query
    const posts = await BlogPostRepo.findAll({
      status: 'published',
      category: category || undefined,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    })
    const total = await BlogPostRepo.count({ status: 'published', category: category || undefined })
    res.json({ posts, total })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/blog/admin — list all posts (admin) ─────────────────────────────
router.get('/blog/admin', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status, category, limit = 100, offset = 0 } = req.query
    const posts = await BlogPostRepo.findAll({
      status: status || undefined,
      category: category || undefined,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    })
    const total = await BlogPostRepo.count({
      status: status || undefined,
      category: category || undefined,
    })
    res.json({ posts, total })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/blog/:slug — single published post (public) ─────────────────────
router.get('/blog/:slug', async (req, res, next) => {
  try {
    const post = await BlogPostRepo.findBySlug(req.params.slug)
    if (!post || post.status !== 'published') {
      return res.status(404).json({ message: 'Post not found' })
    }
    res.json({ post })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/blog — create post (admin) ─────────────────────────────────────
router.post('/blog', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { title, excerpt, content, category, author, tags, cover_image, status } = req.body

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ message: 'title is required' })
    }

    const baseSlug = slugify(title.trim())
    const existing = await BlogPostRepo.findBySlug(baseSlug)
    const slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug

    const reading_time = estimateReadingTime(content)
    const postStatus = status === 'published' ? 'published' : 'draft'
    const published_at = postStatus === 'published' ? new Date().toISOString() : null

    const post = await BlogPostRepo.create({
      slug,
      title: title.trim(),
      excerpt: excerpt ?? null,
      content: content ?? '',
      category: category ?? 'Company',
      author: author ?? req.user.name ?? 'The Team',
      tags: Array.isArray(tags) ? tags : (tags ? [tags] : null),
      cover_image: cover_image ?? null,
      reading_time,
      status: postStatus,
      published_at,
      user_id: req.user.id,
    })

    res.status(201).json({ post })
  } catch (err) {
    next(err)
  }
})

// ── PATCH /api/blog/:id — update post (admin) ────────────────────────────────
router.patch('/blog/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const post = await BlogPostRepo.findById(req.params.id)
    if (!post) return res.status(404).json({ message: 'Post not found' })

    const { title, excerpt, content, category, author, tags, cover_image, status } = req.body

    const reading_time = content ? estimateReadingTime(content) : null
    let published_at = null
    if (status === 'published' && post.status !== 'published') {
      published_at = new Date().toISOString()
    }

    const updated = await BlogPostRepo.update(post.id, {
      title: title ?? null,
      excerpt: excerpt ?? null,
      content: content ?? null,
      category: category ?? null,
      author: author ?? null,
      tags: Array.isArray(tags) ? tags : (tags !== undefined ? (tags ? [tags] : null) : null),
      cover_image: cover_image ?? null,
      reading_time,
      status: status ?? null,
      published_at,
    })

    res.json({ post: updated })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/blog/:id/publish — publish post (admin) ────────────────────────
router.post('/blog/:id/publish', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const post = await BlogPostRepo.findById(req.params.id)
    if (!post) return res.status(404).json({ message: 'Post not found' })
    const updated = await BlogPostRepo.publish(post.id)
    res.json({ post: updated })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/blog/:id/unpublish — revert to draft (admin) ───────────────────
router.post('/blog/:id/unpublish', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const post = await BlogPostRepo.findById(req.params.id)
    if (!post) return res.status(404).json({ message: 'Post not found' })
    const updated = await BlogPostRepo.unpublish(post.id)
    res.json({ post: updated })
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/blog/:id — permanently delete post (admin) ───────────────────
router.delete('/blog/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const post = await BlogPostRepo.findById(req.params.id)
    if (!post) return res.status(404).json({ message: 'Post not found' })
    await BlogPostRepo.delete(post.id)
    res.json({ message: 'Post deleted' })
  } catch (err) {
    next(err)
  }
})

module.exports = router
