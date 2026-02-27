'use strict'

/**
 * Migration 004 – Pricing plans table
 * Creates the pricing_plans table for DB-driven plan management.
 */

const path = require('path')
const fs = require('fs')

const SCHEMAS_DIR = path.join(__dirname, '../../schemas/@custom')

exports.up = async (db) => {
  const sql = fs.readFileSync(path.join(SCHEMAS_DIR, 'pricing_plans.sql'), 'utf8')
  await db.none(sql)
  console.log('[004_pricing_plans] applied schema: pricing_plans')
}

exports.down = async (db) => {
  await db.none('DROP TABLE IF EXISTS pricing_plans CASCADE')
  console.log('[004_pricing_plans] rolled back: pricing_plans')
}
