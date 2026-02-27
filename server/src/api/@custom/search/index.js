const express = require('express')
const router = express.Router()
const { authenticate, requireAdmin } = require('../../lib/@system/Helpers/auth')
const BrandRepo = require('../../../db/repos/@custom/BrandRepo')
const CollaboratorRepo = require('../../../db/repos/@custom/CollaboratorRepo')
const ErrorEventRepo = require('../../../db/repos/@custom/ErrorEventRepo')
const UserRepo = require('../../../db/repos/@system/UserRepo')

/**
 * GET /api/search?q=term[&types=users,brands,collaborators,errors][&limit=20]
 *
 * Full-text search across key entities.
 * Returns grouped results per entity type.
 * Requires authenticated admin.
 */
router.get('/search', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { q, types, limit = '20' } = req.query

    if (!q || !q.trim()) {
      return res.status(400).json({ message: 'Query parameter "q" is required' })
    }

    const query = q.trim()
    const maxLimit = Math.min(parseInt(limit, 10) || 20, 100)
    const allowedTypes = ['users', 'brands', 'collaborators', 'errors']
    const requestedTypes = types
      ? types.split(',').map((t) => t.trim()).filter((t) => allowedTypes.includes(t))
      : allowedTypes

    const searches = {}

    if (requestedTypes.includes('users')) {
      searches.users = UserRepo.search(query, { limit: maxLimit })
    }
    if (requestedTypes.includes('brands')) {
      searches.brands = BrandRepo.search(query, { limit: maxLimit })
    }
    if (requestedTypes.includes('collaborators')) {
      searches.collaborators = CollaboratorRepo.search(query, { limit: maxLimit })
    }
    if (requestedTypes.includes('errors')) {
      searches.errors = ErrorEventRepo.search(query, { limit: maxLimit })
    }

    const keys = Object.keys(searches)
    const results = await Promise.all(keys.map((k) => searches[k]))

    const data = {}
    keys.forEach((k, i) => { data[k] = results[i] })

    const total = keys.reduce((sum, k) => sum + data[k].length, 0)

    res.json({ query, total, results: data })
  } catch (err) {
    next(err)
  }
})

module.exports = router
