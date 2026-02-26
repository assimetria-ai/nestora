// @system — subscriptions API
const express = require('express')
const router = express.Router()
const stripe = require('../../../lib/@system/Stripe')
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const SubscriptionRepo = require('../../../db/repos/@system/SubscriptionRepo')

// GET /api/subscriptions/me — current user's active subscription
router.get('/subscriptions/me', authenticate, async (req, res, next) => {
  try {
    const subscription = await SubscriptionRepo.findActiveByUserId(req.user.id)
    res.json({ subscription: subscription ?? null })
  } catch (err) {
    next(err)
  }
})

// GET /api/subscriptions/me/all — all of current user's subscriptions (history)
router.get('/subscriptions/me/all', authenticate, async (req, res, next) => {
  try {
    const subscriptions = await SubscriptionRepo.findByUserId(req.user.id)
    res.json({ subscriptions })
  } catch (err) {
    next(err)
  }
})

// GET /api/subscriptions/plans — fetch active prices from Stripe (public)
// Products/prices are configured in Stripe dashboard; this endpoint fetches them live.
// Products must have metadata.featured = 'true' to be listed, and prices need metadata.order for sorting.
// Returns an empty list when STRIPE_SECRET_KEY is not configured (instead of propagating the auth error).
router.get('/subscriptions/plans', async (req, res, next) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.json({ plans: [] })
  }

  try {
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
      limit: 50,
    })

    const plans = prices.data
      .filter((price) => {
        const product = price.product
        // Skip archived/deleted products and those explicitly hidden
        return (
          price.active &&
          product &&
          typeof product === 'object' &&
          product.active &&
          product.metadata?.hidden !== 'true'
        )
      })
      .map((price) => {
        const product = price.product
        return {
          priceId: price.id,
          productId: product.id,
          name: product.name,
          description: product.description ?? null,
          amount: price.unit_amount,
          currency: price.currency,
          interval: price.recurring?.interval ?? 'one_time',
          intervalCount: price.recurring?.interval_count ?? 1,
          trialDays: price.recurring?.trial_period_days ?? null,
          metadata: { ...product.metadata, ...price.metadata },
        }
      })
      .sort((a, b) => {
        const orderA = Number(a.metadata?.order ?? 99)
        const orderB = Number(b.metadata?.order ?? 99)
        return orderA - orderB
      })

    res.json({ plans })
  } catch (err) {
    next(err)
  }
})

module.exports = router
