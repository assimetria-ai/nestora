// @system — user management API
// POST /api/users                         — register (sends verification email)
// GET  /api/users/me                      — get current user
// PATCH /api/users/me                     — update profile
// POST /api/users/me/password             — change password (requires current)
// GET  /api/users/me/notifications        — get email notification preferences
// PATCH /api/users/me/notifications       — update email notification preferences
// POST /api/users/password/request        — request a password reset email
// POST /api/users/password/reset          — complete password reset with token
// POST /api/users/email/verify/request    — resend email verification link
// POST /api/users/email/verify            — verify email with token
const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const { validatePassword } = require('../../../lib/@system/Helpers/password-validator')
const UserRepo = require('../../../db/repos/@system/UserRepo')
const db = require('../../../lib/@system/PostgreSQL')
const logger = require('../../../lib/@system/Logger')
const { registerLimiter, passwordResetLimiter } = require('../../../lib/@system/RateLimit')
const emailService = require('../../../lib/@system/Email')
const { validate } = require('../../../lib/@system/Validation')
const {
  RegisterBody,
  UpdateProfileBody,
  ChangePasswordBody,
  PasswordResetRequestBody,
  PasswordResetBody,
  VerifyEmailBody,
} = require('../../../lib/@system/Validation/schemas/@system/user')

// ── Helpers ───────────────────────────────────────────────────────────────

/** Create a fresh email verification token for a user and return the raw token. */
async function createEmailVerificationToken(userId) {
  // Invalidate any pending tokens for this user first
  await db.none(
    'UPDATE email_verification_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL',
    [userId]
  )
  const token = crypto.randomBytes(32).toString('hex')
  await db.none(
    'INSERT INTO email_verification_tokens (user_id, token) VALUES ($1, $2)',
    [userId, token]
  )
  return token
}

// ── Register ──────────────────────────────────────────────────────────────

// POST /api/users — register
router.post('/users', registerLimiter, validate({ body: RegisterBody }), async (req, res, next) => {
  try {
    const { email, password, name } = req.body
    const pwCheck = validatePassword(password)
    if (!pwCheck.valid) return res.status(400).json({ message: pwCheck.message })

    const existing = await UserRepo.findByEmail(email)
    if (existing) return res.status(409).json({ message: 'Email already in use' })

    const password_hash = await bcrypt.hash(password, 12)
    const user = await UserRepo.create({ email, name, password_hash })

    // Send verification email asynchronously — don't block registration response
    setImmediate(async () => {
      try {
        const token = await createEmailVerificationToken(user.id)
        await emailService.sendVerificationEmail({ to: user.email, name: user.name, token })
        logger.info({ userId: user.id }, 'verification email sent on registration')
      } catch (err) {
        logger.error({ err, userId: user.id }, 'failed to send verification email on registration')
      }
    })

    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name } })
  } catch (err) {
    next(err)
  }
})

// ── Profile ───────────────────────────────────────────────────────────────

// GET /api/users/me — get current user
router.get('/users/me', authenticate, (req, res) => {
  res.json({ user: req.user })
})

// PATCH /api/users/me — update profile (name only; email requires verification)
router.patch('/users/me', authenticate, validate({ body: UpdateProfileBody }), async (req, res, next) => {
  try {
    const { name } = req.body
    const updated = await UserRepo.update(req.user.id, { name: name?.trim() })
    res.json({ user: updated })
  } catch (err) {
    next(err)
  }
})

// POST /api/users/me/password — change password (must supply current password)
router.post('/users/me/password', authenticate, validate({ body: ChangePasswordBody }), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body
    const pwCheck = validatePassword(newPassword)
    if (!pwCheck.valid) return res.status(400).json({ message: pwCheck.message })

    const user = await db.oneOrNone('SELECT * FROM users WHERE id = $1', [req.user.id])
    const valid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect' })

    const password_hash = await bcrypt.hash(newPassword, 12)
    await db.none('UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1', [req.user.id, password_hash])
    res.json({ message: 'Password updated' })
  } catch (err) {
    next(err)
  }
})

// ── Email Verification ────────────────────────────────────────────────────

// POST /api/users/email/verify/request — resend a verification email
router.post('/users/email/verify/request', authenticate, async (req, res, next) => {
  try {
    // Already verified?
    if (req.user.emailVerified) {
      return res.status(400).json({ message: 'Email is already verified' })
    }

    const token = await createEmailVerificationToken(req.user.id)
    await emailService.sendVerificationEmail({ to: req.user.email, name: req.user.name, token })
    logger.info({ userId: req.user.id }, 'verification email resent on request')

    res.json({ message: 'Verification email sent. Please check your inbox.' })
  } catch (err) {
    next(err)
  }
})

// POST /api/users/email/verify — verify email using the token from the email link
router.post('/users/email/verify', validate({ body: VerifyEmailBody }), async (req, res, next) => {
  try {
    const { token } = req.body

    const record = await db.oneOrNone(
      `SELECT * FROM email_verification_tokens
       WHERE token = $1
         AND used_at IS NULL
         AND expires_at > now()`,
      [token]
    )
    if (!record) return res.status(400).json({ message: 'Invalid or expired verification token' })

    // Mark email as verified + invalidate the token
    const [user] = await Promise.all([
      UserRepo.verifyEmail(record.user_id),
      db.none('UPDATE email_verification_tokens SET used_at = now() WHERE id = $1', [record.id]),
    ])

    logger.info({ userId: record.user_id }, 'email verified')
    res.json({ message: 'Email verified successfully.', user: { id: user.id, email: user.email, emailVerified: true } })

    // Send welcome email asynchronously — don't block the verify response
    setImmediate(async () => {
      try {
        await emailService.sendWelcomeEmail({ to: user.email, name: user.name, userId: user.id })
        logger.info({ userId: user.id }, 'welcome email sent after verification')
      } catch (err) {
        logger.error({ err, userId: user.id }, 'failed to send welcome email after verification')
      }
    })
  } catch (err) {
    next(err)
  }
})

// ── Password Reset ────────────────────────────────────────────────────────

// POST /api/users/password/request — generate a reset token and (conceptually) send an email
// @custom — wire up SES / Resend / SendGrid to actually send the email
router.post('/users/password/request', passwordResetLimiter, validate({ body: PasswordResetRequestBody }), async (req, res, next) => {
  try {
    const { email } = req.body

    // Always respond 200 to avoid user enumeration
    res.json({ message: 'If this email exists, a reset link has been sent.' })

    const user = await UserRepo.findByEmail(email)
    if (!user) return // silent — response already sent

    // Invalidate any existing tokens for this user
    await db.none(
      'UPDATE password_reset_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL',
      [user.id]
    )

    const token = crypto.randomBytes(32).toString('hex')
    await db.none(
      'INSERT INTO password_reset_tokens (user_id, token) VALUES ($1, $2)',
      [user.id, token]
    )

    logger.info({ userId: user.id }, 'password reset token generated')

    await emailService.sendPasswordResetEmail({ to: user.email, name: user.name, token, userId: user.id })
  } catch (err) {
    logger.error({ err }, 'password reset request failed silently')
  }
})

// POST /api/users/password/reset — complete reset using token
router.post('/users/password/reset', passwordResetLimiter, validate({ body: PasswordResetBody }), async (req, res, next) => {
  try {
    const { token, password } = req.body
    const pwCheck = validatePassword(password)
    if (!pwCheck.valid) return res.status(400).json({ message: pwCheck.message })

    const record = await db.oneOrNone(
      `SELECT * FROM password_reset_tokens
       WHERE token = $1
         AND used_at IS NULL
         AND expires_at > now()`,
      [token]
    )
    if (!record) return res.status(400).json({ message: 'Invalid or expired reset token' })

    const password_hash = await bcrypt.hash(password, 12)
    await Promise.all([
      db.none('UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1', [record.user_id, password_hash]),
      db.none('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1', [record.id]),
    ])

    res.json({ message: 'Password reset successfully. You can now log in.' })
  } catch (err) {
    next(err)
  }
})

// ── Email Notification Preferences ───────────────────────────────────────────

const NOTIFICATION_KEYS = ['security', 'billing', 'activity', 'marketing', 'inApp', 'weeklyDigest', 'mentions']
const DEFAULT_NOTIFICATIONS = { security: true, billing: true, activity: false, marketing: false, inApp: true, weeklyDigest: false, mentions: true }

// GET /api/users/me/notifications — get current notification preferences
router.get('/users/me/notifications', authenticate, async (req, res, next) => {
  try {
    const row = await db.oneOrNone(
      'SELECT email_notifications FROM users WHERE id = $1',
      [req.user.id]
    )
    const prefs = row?.email_notifications ?? DEFAULT_NOTIFICATIONS
    res.json({ notifications: prefs })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/users/me/notifications — update notification preferences
router.patch('/users/me/notifications', authenticate, async (req, res, next) => {
  try {
    const incoming = req.body ?? {}

    // Only allow known keys; merge with existing prefs
    const row = await db.oneOrNone(
      'SELECT email_notifications FROM users WHERE id = $1',
      [req.user.id]
    )
    const current = row?.email_notifications ?? DEFAULT_NOTIFICATIONS
    const updated = { ...current }

    for (const key of NOTIFICATION_KEYS) {
      if (typeof incoming[key] === 'boolean') {
        updated[key] = incoming[key]
      }
    }

    await db.none(
      'UPDATE users SET email_notifications = $2, updated_at = now() WHERE id = $1',
      [req.user.id, JSON.stringify(updated)]
    )

    res.json({ notifications: updated })
  } catch (err) {
    next(err)
  }
})

module.exports = router
