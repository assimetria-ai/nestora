const jwt = require('jsonwebtoken')
const { promisify } = require('util')

const ALGORITHM = 'RS256'

// Keys are stored as PEM strings in env vars (with literal \n sequences)
// e.g. JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----"
function parsePemKey(raw) {
  if (!raw) return null
  return raw.replace(/\\n/g, '\n')
}

const PRIVATE_KEY = parsePemKey(process.env.JWT_PRIVATE_KEY)
const PUBLIC_KEY = parsePemKey(process.env.JWT_PUBLIC_KEY)

if (!PRIVATE_KEY || !PUBLIC_KEY) {
  console.warn(
    '[jwt] JWT_PRIVATE_KEY or JWT_PUBLIC_KEY env var not set — ' +
    'token operations will fail. Generate keys with: openssl genrsa 2048 > private.pem && openssl rsa -in private.pem -pubout > public.pem'
  )
}

// Promisified versions of the jsonwebtoken callback API
const _signAsync = promisify(jwt.sign)
const _verifyAsync = promisify(jwt.verify)

// Access tokens are short-lived; refresh tokens are opaque (not JWT).
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL ?? '15m'

function signToken(payload, options = {}) {
  return jwt.sign(payload, PRIVATE_KEY, { algorithm: ALGORITHM, expiresIn: ACCESS_TOKEN_TTL, ...options })
}

function verifyToken(token) {
  return jwt.verify(token, PUBLIC_KEY, { algorithms: [ALGORITHM] })
}

async function signTokenAsync(payload, options = {}) {
  return _signAsync(payload, PRIVATE_KEY, { algorithm: ALGORITHM, expiresIn: ACCESS_TOKEN_TTL, ...options })
}

async function verifyTokenAsync(token) {
  return _verifyAsync(token, PUBLIC_KEY, { algorithms: [ALGORITHM] })
}

// Convenience aliases — semantically clearer when used alongside refresh tokens
const signAccessToken = signToken
const signAccessTokenAsync = signTokenAsync
const verifyAccessToken = verifyToken
const verifyAccessTokenAsync = verifyTokenAsync

module.exports = {
  signToken,
  verifyToken,
  signTokenAsync,
  verifyTokenAsync,
  signAccessToken,
  signAccessTokenAsync,
  verifyAccessToken,
  verifyAccessTokenAsync,
  ACCESS_TOKEN_TTL,
}
