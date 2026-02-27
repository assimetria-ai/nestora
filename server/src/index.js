require('dotenv').config()
require('./lib/@system/Env') // validate env vars — exits with a clear error if required vars are missing
const app = require('./app')
const logger = require('./lib/@system/Logger')
const { connect: connectRedis } = require('./lib/@system/Redis')
const { connectPool: connectPostgres, disconnectPool: disconnectPostgres } = require('./lib/@system/PostgreSQL')
const { scheduler } = require('./scheduler/tasks/@system')

const PORT = process.env.PORT ?? 4000

async function start() {
  await connectPostgres()
  await connectRedis()

  // ── Scheduler ──────────────────────────────────────────────────────────
  await scheduler.init()

  const server = app.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV ?? 'development' }, 'server started')
  })

  // ── Graceful shutdown ──────────────────────────────────────────────────
  async function shutdown(signal) {
    logger.info({ signal }, 'shutdown signal received')
    server.close(async () => {
      await disconnectPostgres()
      logger.info('shutdown complete')
      process.exit(0)
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

start()
