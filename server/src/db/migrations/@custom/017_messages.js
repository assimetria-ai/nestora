'use strict'

const fs = require('fs')
const path = require('path')

async function up(db) {
  const sql = fs.readFileSync(
    path.join(__dirname, '../../schemas/@custom/messages.sql'),
    'utf8',
  )
  await db.none(sql)
  console.log('[migrate] applied schema: messages + conversations')
}

async function down(db) {
  await db.none('DROP TABLE IF EXISTS messages CASCADE')
  await db.none('DROP TABLE IF EXISTS conversations CASCADE')
  console.log('[migrate] rolled back schema: messages')
}

module.exports = { up, down }
