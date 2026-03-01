'use strict'

const fs = require('fs')
const path = require('path')

async function up(db) {
  const sql = fs.readFileSync(
    path.join(__dirname, '../../schemas/@custom/properties.sql'),
    'utf8',
  )
  await db.none(sql)
  console.log('[migrate] applied schema: properties + tenants + maintenance_requests')
}

async function down(db) {
  await db.none('DROP TABLE IF EXISTS maintenance_requests CASCADE')
  await db.none('DROP TABLE IF EXISTS tenants CASCADE')
  await db.none('DROP TABLE IF EXISTS properties CASCADE')
  console.log('[migrate] rolled back schema: properties')
}

module.exports = { up, down }
