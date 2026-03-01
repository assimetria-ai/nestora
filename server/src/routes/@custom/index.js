const express = require('express')
const router = express.Router()

router.use(require('../../api/@custom/errors'))
router.use(require('../../api/@custom/properties'))
router.use(require('../../api/@custom/bookings'))
router.use(require('../../api/@custom/reviews'))
router.use(require('../../api/@custom/search'))
router.use(require('../../api/@custom/payments'))
router.use(require('../../api/@custom/messages'))
router.use(require('../../api/@custom/experiences'))

module.exports = router
