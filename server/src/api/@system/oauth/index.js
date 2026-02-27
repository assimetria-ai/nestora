/**
 * @system — OAuth2 provider routes
 *
 * GET /api/auth/google           → redirect to Google consent page
 * GET /api/auth/google/callback  → exchange code, issue JWT, redirect to /app
 * GET /api/auth/github           → redirect to GitHub authorize page
 * GET /api/auth/github/callback  → exchange code, issue JWT, redirect to /app
 *
 * On success → redirect to APP_URL/app
 * On failure → redirect to APP_URL/auth?error=oauth_failed
 */

const express = require('express')
const router = express.Router()
const google = require('../../../lib/@system/OAuth/google')
const github = require('../../../lib/@system/OAuth/github')
const UserRepo = require('../../../db/repos/@system/UserRepo')
const OAuthRepo = require('../../../db/repos/@system/OAuthRepo')
const { signTokenAsync } = require('../../../lib/@system/Helpers/jwt')
const logger = require('../../../lib/@system/Logger')

const SESSION_TTL = 7 * 24 * 60 * 60 // 7 days in seconds

function appUrl() {
  return process.env.APP_URL ?? 'http://localhost:5173'
}

function serverUrl() {
  const port = process.env.PORT ?? 4000
  return process.env.SERVER_URL ?? `http://localhost:${port}`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * After a successful OAuth profile fetch, find or create the linked user,
 * issue a JWT cookie, and redirect to the app.
 */
async function handleOAuthSuccess({ res, provider, providerId, email, name }) {
  let user = await OAuthRepo.findUserByProvider(provider, providerId)

  if (!user) {
    // Check if a local account with the same email already exists
    if (email) {
      user = await UserRepo.findByEmail(email)
    }

    if (!user) {
      // Create a new user — password_hash is NULL for OAuth users
      user = await UserRepo.createOAuth({ email, name })
    }

    // Link this OAuth identity to the user
    await OAuthRepo.linkProvider({ userId: user.id, provider, providerId, email })
  }

  const token = await signTokenAsync({ userId: user.id })
  res.cookie('access_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: SESSION_TTL * 1000 })
  res.redirect(`${appUrl()}/app`)
}

function handleOAuthError(res, err, provider) {
  logger.error({ err, provider }, `OAuth ${provider} error`)
  res.redirect(`${appUrl()}/auth?error=oauth_failed`)
}

// ─── Google ───────────────────────────────────────────────────────────────────

router.get('/auth/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) return res.status(501).json({ message: 'Google OAuth is not configured' })

  const redirectUri = `${serverUrl()}/api/auth/google/callback`
  const url = google.getAuthUrl({ clientId, redirectUri })
  res.redirect(url)
})

router.get('/auth/google/callback', async (req, res) => {
  const { code, error } = req.query
  if (error || !code) return handleOAuthError(res, new Error(error ?? 'missing_code'), 'google')

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = `${serverUrl()}/api/auth/google/callback`

    const tokens = await google.exchangeCode({ code, clientId, clientSecret, redirectUri })
    const profile = await google.getUserInfo(tokens.access_token)

    await handleOAuthSuccess({
      res,
      provider: 'google',
      providerId: profile.sub,
      email: profile.email,
      name: profile.name,
    })
  } catch (err) {
    handleOAuthError(res, err, 'google')
  }
})

// ─── GitHub ───────────────────────────────────────────────────────────────────

router.get('/auth/github', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID
  if (!clientId) return res.status(501).json({ message: 'GitHub OAuth is not configured' })

  const redirectUri = `${serverUrl()}/api/auth/github/callback`
  const url = github.getAuthUrl({ clientId, redirectUri })
  res.redirect(url)
})

router.get('/auth/github/callback', async (req, res) => {
  const { code, error } = req.query
  if (error || !code) return handleOAuthError(res, new Error(error ?? 'missing_code'), 'github')

  try {
    const clientId = process.env.GITHUB_CLIENT_ID
    const clientSecret = process.env.GITHUB_CLIENT_SECRET
    const redirectUri = `${serverUrl()}/api/auth/github/callback`

    const tokens = await github.exchangeCode({ code, clientId, clientSecret, redirectUri })
    const profile = await github.getUserInfo(tokens.access_token)

    await handleOAuthSuccess({
      res,
      provider: 'github',
      providerId: profile.id,
      email: profile.email,
      name: profile.name,
    })
  } catch (err) {
    handleOAuthError(res, err, 'github')
  }
})

module.exports = router
