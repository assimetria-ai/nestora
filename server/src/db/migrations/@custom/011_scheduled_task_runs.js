'use strict'

/**
 * Migration 011 – Scheduled task runs
 * Creates the scheduled_task_runs table for tracking node-cron job execution history.
 */

exports.up = async (db) => {
  await db.none(`
    CREATE TABLE IF NOT EXISTS scheduled_task_runs (
      id          SERIAL PRIMARY KEY,
      task_name   VARCHAR(255) NOT NULL,
      status      VARCHAR(50)  NOT NULL DEFAULT 'processing'
                    CHECK (status IN ('processing', 'completed', 'failed')),
      scheduled_for TIMESTAMPTZ NOT NULL,
      started_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ,
      error       TEXT,
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `)
  await db.none(`
    CREATE INDEX IF NOT EXISTS idx_scheduled_task_runs_task_name
      ON scheduled_task_runs (task_name)
  `)
  await db.none(`
    CREATE INDEX IF NOT EXISTS idx_scheduled_task_runs_status
      ON scheduled_task_runs (status)
  `)
  await db.none(`
    CREATE INDEX IF NOT EXISTS idx_scheduled_task_runs_scheduled_for
      ON scheduled_task_runs (scheduled_for)
  `)
  console.log('[011_scheduled_task_runs] created scheduled_task_runs table')
}

exports.down = async (db) => {
  await db.none('DROP TABLE IF EXISTS scheduled_task_runs CASCADE')
  console.log('[011_scheduled_task_runs] dropped scheduled_task_runs table')
}
