const express = require('express')
const router = express.Router()

router.use(require('../../api/@custom/errors'))
router.use(require('../../api/@custom/properties'))

module.exports = router
