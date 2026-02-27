// @system — session management API
// POST   /api/sessions          — login
// POST   /api/sessions/refresh  — rotate refresh token / re-issue access token
// GET    /api/sessions/me       — current user
// GET    /api/sessions          — list all active sessions for the current user
// DELETE /api/sessions/:id      — revoke a specific session by ID
// DELETE /api/sessions          — logout (revoke current session)
const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const { authenticate, extractAccessToken } = require('../../../lib/@system/Helpers/auth')
const UserRepo = require('../../../db/repos/@system/UserRepo')
const RefreshTokenRepo = require('../../../db/repos/@system/RefreshTokenRepo')
const SessionRepo = require('../../../db/repos/@system/SessionRepo')
const { signAccessTokenAsync, verifyTokenAsync } = require('../../../lib/@system/Helpers/jwt')
const bcrypt = require('bcryptjs')
const { client: redis, isReady: redisReady } = require('../../../lib/@system/Redis')
const { loginLimiter } = require('../../../lib/@system/RateLimit')
const { validate } = require('../../../lib/@system/Validation')
const { LoginBody, DeleteSessionParams } = require('../../../lib/@system/Validation/schemas/@system/sessions')
const {
  MAX_ATTEMPTS,
  getLockoutSecondsRemaining,
  incrementFailedAttempts,
  getFailedAttemptCount,
  clearFailedAttempts,
} = require('../../../lib/@system/AccountLockout')

const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000           // 15 minutes
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const BLACKLIST_PREFIX = 'session:blacklist:'

/** SHA-256 hash a raw token string. */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// ── Token blacklist helpers ────────────────────────────────────────────────

/**
 * Add an access token to the Redis blacklist (valid until it expires naturally).
 * Graceful degradation: if Redis is unavailable the token stays valid until expiry.
 */
async function blacklistAccessToken(token) {
  if (!redisReady()) return
  try {
    const payload = await verifyTokenAsync(token)
    const ttl = payload.exp ? payload.exp - Math.floor(Date.now() / 1000) : 0
    if (ttl > 0) {
      await redis.set(`${BLACKLIST_PREFIX}${token}`, '1', 'EX', ttl)
    }
  } catch {
    // token already expired or invalid — nothing to blacklist
  }
}

/**
 * Returns true when the access token has been explicitly invalidated.
 */
async function isBlacklisted(token) {
  if (!redisReady()) return false
  try {
    return (await redis.exists(`${BLACKLIST_PREFIX}${token}`)) === 1
  } catch {
    return false
  }
}

// ── Cookie helpers ─────────────────────────────────────────────────────────

function setAccessCookie(res, token) {
  res.cookie('access_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === \'production\',
    sameSite: 'lax',
    maxAge: ACCESS_TOKEN_TTL_MS,
    path: '/',
  })
}

function setRefreshCookie(res, token) {
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === \'production\',
    sameSite: 'lax',
    maxAge: REFRESH_TOKEN_TTL_MS,
    path: '/api/sessions', // scoped: only sent to token-rotation endpoint
  })
}

function clearAuthCookies(res) {
  res.clearCookie('access_token', { path: '/' })
  res.clearCookie('refresh_token', { path: '/api/sessions' })
  res.clearCookie('token', { path: '/' }) // legacy cookie — backward compat
}

// ── Routes ─────────────────────────────────────────────────────────────────

// POST /api/sessions — login
router.post('/sessions', loginLimiter, validate({ body: LoginBody }), async (req, res, next) => {
  try {
    const { email, password } = req.body

    const normalizedEmail = email.toLowerCase()

    // Check account lockout before doing any DB work
    const lockedFor = await getLockoutSecondsRemaining(normalizedEmail)
    if (lockedFor > 0) {
      const minutes = Math.ceil(lockedFor / 60)
      return res.status(429).json({
        message: `Account temporarily locked due to too many failed login attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
        lockedFor,
      })
    }

    const user = await UserRepo.findByEmail(normalizedEmail)
    if (!user) {
      // Increment attempts even for unknown emails to prevent timing-based enumeration
      await incrementFailedAttempts(normalizedEmail)
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      await incrementFailedAttempts(normalizedEmail)
      // Warn when the user is close to being locked out
      const count = await getFailedAttemptCount(normalizedEmail)
      const remaining = count !== null ? MAX_ATTEMPTS - count : null
      const extra =
        remaining !== null && remaining > 0 && remaining <= 2
          ? ` ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before account lockout.`
          : ''
      return res.status(401).json({ message: `Invalid credentials.${extra}` })
    }

    // Successful login — clear lockout state
    await clearFailedAttempts(normalizedEmail)

    // ── 2FA / TOTP check ────────────────────────────────────────────────────
    if (user.totp_enabled) {
      const { totpCode } = req.body

      if (!totpCode) {
        // Credentials valid but TOTP required — signal the client to prompt for it
        return res.status(200).json({ totp_required: true })
      }

      const OTPAuth = require('otpauth')
      const totp = new OTPAuth.TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(user.totp_secret),
      })
      const delta = totp.validate({ token: String(totpCode).replace(/\s/g, ''), window: 1 })
      if (delta === null) {
        return res.status(401).json({ message: 'Invalid or expired authenticator code.' })
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    // Issue short-lived access token + opaque refresh token (starts a new family)
    const accessToken = await signAccessTokenAsync({ userId: user.id })
    const { token: refreshToken, record: refreshRecord } = await RefreshTokenRepo.create({ userId: user.id })

    // Persist session record for UI listing and revocation
    await SessionRepo.create({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      ipAddress: req.ip ?? req.headers['x-forwarded-for'] ?? null,
      userAgent: req.headers['user-agent'] ?? null,
      expiresAt: refreshRecord.expires_at,
    }).catch(() => {}) // fire-and-forget — don't block login if session insert fails

    setAccessCookie(res, accessToken)
    setRefreshCookie(res, refreshToken)

    res.json({ user: { id: user.id, email: user.email, name: user.name } })
  } catch (err) {
    next(err)
  }
})

// POST /api/sessions/refresh — rotate refresh token and issue a new access token
router.post('/sessions/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refresh_token
    if (!refreshToken) return res.status(401).json({ message: 'No refresh token' })

    // Look up by hash regardless of revocation state (needed for reuse detection)
    const record = await RefreshTokenRepo.findByHash(refreshToken)

    if (!record) {
      return res.status(401).json({ message: 'Invalid refresh token' })
    }

    if (record.revoked_at) {
      // Token reuse detected — invalidate the entire family (all derived sessions)
      await RefreshTokenRepo.revokeFamilyById(record.family_id)
      clearAuthCookies(res)
      return res.status(401).json({ message: 'Refresh token reuse detected. Please log in again.' })
    }

    if (new Date(record.expires_at) <= new Date()) {
      clearAuthCookies(res)
      return res.status(401).json({ message: 'Refresh token expired' })
    }

    const user = await UserRepo.findById(record.user_id)
    if (!user) {
      clearAuthCookies(res)
      return res.status(401).json({ message: 'User not found' })
    }

    // Rotate: revoke old token, issue new pair in same family
    const { token: newRefreshToken, record: newRefreshRecord } = await RefreshTokenRepo.rotate(record)
    const newAccessToken = await signAccessTokenAsync({ userId: user.id })

    // Keep the session row in sync with the new refresh token hash
    await SessionRepo.updateTokenHash(
      user.id,
      record.token_hash,          // old hash stored in sessions table
      hashToken(newRefreshToken),  // new hash
      newRefreshRecord.expires_at,
    ).catch(() => {}) // fire-and-forget

    setAccessCookie(res, newAccessToken)
    setRefreshCookie(res, newRefreshToken)

    res.json({ user: { id: user.id, email: user.email, name: user.name } })
  } catch (err) {
    next(err)
  }
})

// GET /api/sessions/me — current user (also checks Redis blacklist)
router.get('/sessions/me', authenticate, async (req, res, next) => {
  try {
    const token = extractAccessToken(req)
    if (token && (await isBlacklisted(token))) {
      return res.status(401).json({ message: 'Unauthorized' })
    }
    res.json({ user: req.user })
  } catch (err) {
    next(err)
  }
})

// GET /api/sessions — list all active sessions for the authenticated user
router.get('/sessions', authenticate, async (req, res, next) => {
  try {
    const currentRefreshToken = req.cookies?.refresh_token
    const currentHash = currentRefreshToken ? hashToken(currentRefreshToken) : null

    const rows = await SessionRepo.findActiveByUserId(req.user.id)

    const sessions = rows.map((s) => ({
      id: s.id,
      ipAddress: s.ip_address,
      userAgent: s.user_agent,
      createdAt: s.created_at,
      expiresAt: s.expires_at,
      isCurrent: currentHash ? s.token_hash === currentHash : false,
    }))

    res.json({ sessions })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/sessions/:id — revoke a specific session by ID
router.delete('/sessions/:id', authenticate, validate({ params: DeleteSessionParams }), async (req, res, next) => {
  try {
    const sessionId = req.params.id

    // Revoke in sessions table and get back the token_hash to revoke the refresh token too
    const revoked = await SessionRepo.revoke(sessionId, req.user.id)
    if (!revoked) return res.status(404).json({ message: 'Session not found or already revoked' })

    // Also revoke the underlying refresh token so token rotation can't revive it
    await RefreshTokenRepo.revokeByTokenHashDirect(revoked.token_hash).catch(() => {})

    res.json({ message: 'Session revoked' })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/sessions — logout (blacklist access token + revoke refresh token + revoke session row)
router.delete('/sessions', async (req, res) => {
  const accessToken = extractAccessToken(req)
  const refreshToken = req.cookies?.refresh_token

  if (accessToken) await blacklistAccessToken(accessToken)

  if (refreshToken) {
    const record = await RefreshTokenRepo.findByHash(refreshToken).catch(() => null)
    if (record && !record.revoked_at) {
      await RefreshTokenRepo.revokeById(record.id)
    }
    // Revoke the corresponding session row
    await SessionRepo.revokeByTokenHash(hashToken(refreshToken)).catch(() => {})
  }

  clearAuthCookies(res)
  res.json({ message: 'Logged out' })
})

module.exports = router
