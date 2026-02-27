// @system — scheduler entry point
// Exports BaseTask and the singleton Scheduler instance.
// Use scheduler.registerTask(new MyTask()) in @custom/init.js.

const BaseTask = require('./base/BaseTask')
const scheduler = require('./scheduler')

module.exports = { BaseTask, scheduler }
