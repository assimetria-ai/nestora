'use strict'

const fs = require('fs')
const path = require('path')

async function up(db) {
  const sql = fs.readFileSync(
    path.join(__dirname, '../../schemas/@custom/experiences.sql'),
    'utf8',
  )
  await db.none(sql)
  console.log('[migrate] applied schema: experiences + experience_bookings')
}

async function down(db) {
  await db.none('DROP TABLE IF EXISTS experience_bookings CASCADE')
  await db.none('DROP TABLE IF EXISTS experiences CASCADE')
  console.log('[migrate] rolled back schema: experiences')
}

module.exports = { up, down }
