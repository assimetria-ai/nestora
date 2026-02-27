'use strict'

/**
 * Migration – extend email_notifications JSONB with in-app notification fields
 *
 * Merges three new keys into the existing email_notifications column:
 *   - inApp       — show the notification bell / real-time alerts in the app
 *   - weeklyDigest — weekly in-app digest notification
 *   - mentions    — notify on mentions & replies
 *
 * Safe to run multiple times (merges rather than overwrites).
 */

exports.up = async (db) => {
  await db.none(`
    UPDATE users
    SET email_notifications = email_notifications || '{
      "inApp": true,
      "weeklyDigest": false,
      "mentions": true
    }'::jsonb
    WHERE NOT (email_notifications ? 'inApp')
  `)
  console.log('[013_notification_prefs_v2] applied')
}

exports.down = async (db) => {
  await db.none(`
    UPDATE users
    SET email_notifications = email_notifications
      - 'inApp'
      - 'weeklyDigest'
      - 'mentions'
  `)
  console.log('[013_notification_prefs_v2] rolled back')
}
