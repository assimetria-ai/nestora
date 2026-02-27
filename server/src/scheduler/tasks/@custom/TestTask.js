'use strict'

// @custom — TestTask
// Example scheduled task. Runs daily at midnight.
// Rename / copy this file to create your own tasks.

const { BaseTask } = require('../@system')
const logger = require('../../../lib/@system/Logger')

class TestTask extends BaseTask {
  constructor() {
    super('test_task')
  }

  getSchedule() {
    return '0 0 * * *' // Daily at midnight
  }

  async execute() {
    logger.info('[TestTask] running')
    // TODO: replace with real logic
    logger.info('[TestTask] completed')
  }
}

module.exports = TestTask
