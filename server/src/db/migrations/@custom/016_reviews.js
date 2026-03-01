'use strict'

const fs = require('fs')
const path = require('path')

async function up(db) {
  const sql = fs.readFileSync(
    path.join(__dirname, '../../schemas/@custom/reviews.sql'),
    'utf8',
  )
  await db.none(sql)
  console.log('[migrate] applied schema: reviews')
}

async function down(db) {
  await db.none('DROP TABLE IF EXISTS reviews CASCADE')
  console.log('[migrate] rolled back schema: reviews')
}

module.exports = { up, down }
