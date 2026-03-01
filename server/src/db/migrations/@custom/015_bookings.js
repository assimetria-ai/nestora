'use strict'

const fs = require('fs')
const path = require('path')

async function up(db) {
  const sql = fs.readFileSync(
    path.join(__dirname, '../../schemas/@custom/bookings.sql'),
    'utf8',
  )
  await db.none(sql)
  console.log('[migrate] applied schema: bookings')
}

async function down(db) {
  await db.none('DROP TABLE IF EXISTS bookings CASCADE')
  console.log('[migrate] rolled back schema: bookings')
}

module.exports = { up, down }
