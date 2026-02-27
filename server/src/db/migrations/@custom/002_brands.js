'use strict'

const fs = require('fs')
const path = require('path')

async function up(db) {
  const sql = fs.readFileSync(
    path.join(__dirname, '../../schemas/@custom/brands.sql'),
    'utf8',
  )
  await db.none(sql)
  console.log('[migrate] applied schema: brands')
}

async function down(db) {
  await db.none('DROP TABLE IF EXISTS brands CASCADE')
  console.log('[migrate] rolled back schema: brands')
}

module.exports = { up, down }
