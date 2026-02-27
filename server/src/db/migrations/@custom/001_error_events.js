'use strict'

const fs = require('fs')
const path = require('path')

async function up(db) {
  const sql = fs.readFileSync(
    path.join(__dirname, '../../schemas/@custom/error_events.sql'),
    'utf8',
  )
  await db.none(sql)
  console.log('[migrate] applied schema: error_events')
}

async function down(db) {
  await db.none('DROP TABLE IF EXISTS error_events CASCADE')
  console.log('[migrate] rolled back schema: error_events')
}

module.exports = { up, down }
