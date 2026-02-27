'use strict'

// @system — BaseTask
// All scheduled tasks extend this class.
// Subclasses must implement: execute() and getSchedule()

const cronParser = require('cron-parser')
const logger = require('../../../../lib/@system/Logger')

class BaseTask {
  /**
   * @param {string}  name          Unique task identifier (used for DB tracking)
   * @param {boolean} runInParallel If true, the task fires without blocking the sequential queue
   */
  constructor(name, runInParallel = false) {
    if (!name) throw new Error('BaseTask requires a name')
    this.name = name
    this.runInParallel = runInParallel
  }

  /**
   * Override in subclass. Contains the task's business logic.
   * Must return a Promise (or be async).
   */
  async execute() {
    throw new Error(`[${this.name}] execute() must be implemented`)
  }

  /**
   * Override in subclass. Returns a node-cron compatible cron expression.
   * Default: midnight every day.
   */
  getSchedule() {
    logger.warn({ task: this.name }, '[scheduler] getSchedule() not overridden — defaulting to midnight')
    return '0 0 * * *'
  }

  /**
   * Returns the next scheduled run Date based on the task's cron expression.
   */
  getNextRunTime() {
    try {
      const interval = cronParser.parseExpression(this.getSchedule())
      return interval.next().toDate()
    } catch (err) {
      logger.error({ task: this.name, err }, '[scheduler] failed to parse cron expression')
      return null
    }
  }

  /**
   * Logs when this task will run next.
   */
  logNextRun() {
    const next = this.getNextRunTime()
    if (next) {
      logger.info({ task: this.name, nextRun: next.toISOString() }, '[scheduler] next run scheduled')
    }
  }
}

module.exports = BaseTask
