const express = require('express');
const router = express.Router();
const orderCtrl = require('../controllers/orderController');
const auth = require('../middleware/auth');

router.get('/', auth, orderCtrl.viewOrders);
router.get('/:id', auth, orderCtrl.viewOrderDetail);

module.exports = router;