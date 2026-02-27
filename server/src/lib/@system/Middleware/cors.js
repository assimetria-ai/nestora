const cors = require('cors')

const ALLOWED_ORIGINS = [
  process.env.APP_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean)

function isOriginAllowed(origin) {
  // In production, deny requests with no Origin header (blocks server-to-server CORS bypass).
  // In development, allow no-origin for curl, Postman, and local tooling convenience.
  if (!origin) {
    return process.env.NODE_ENV !== 'production'
  }

  // Exact match
  if (ALLOWED_ORIGINS.includes(origin)) return true

  // Allow any subdomain of the APP_URL host in production
  if (process.env.APP_URL) {
    try {
      const appHost = new URL(process.env.APP_URL).hostname
      const originHost = new URL(origin).hostname
      if (originHost === appHost || originHost.endsWith(`.${appHost}`)) return true
    } catch {
      // malformed URL — deny
    }
  }

  return false
}

const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['X-Total-Count', 'X-Request-Id'],
  maxAge: 600, // preflight cache 10 min
}

module.exports = cors(corsOptions)
