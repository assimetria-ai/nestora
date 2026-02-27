'use strict'

/**
 * Migration 012 – Blog posts table
 * Creates the blog_posts table for admin-managed blog content.
 */

const fs = require('fs')
const path = require('path')

const SCHEMAS_DIR = path.join(__dirname, '../../schemas/@custom')

exports.up = async (db) => {
  const sql = fs.readFileSync(path.join(SCHEMAS_DIR, 'blog_posts.sql'), 'utf8')
  await db.none(sql)
  console.log('[012_blog_posts] applied schema: blog_posts')
}

exports.down = async (db) => {
  await db.none('DROP TABLE IF EXISTS blog_posts CASCADE')
  console.log('[012_blog_posts] rolled back: blog_posts')
}
