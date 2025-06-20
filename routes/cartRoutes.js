const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

// Add to cart route
router.post('/add/:id', cartController.addToCart);
// JSON cart for AJAX panel
router.get('/json', cartController.viewCartJson);
router.get('/', cartController.viewCart);
router.post('/update/:id', cartController.updateQuantity);
router.post('/remove/:id', cartController.removeItem);
router.post('/apply-promo', cartController.applyPromo);
router.get('/checkout', cartController.checkoutForm);
router.post('/checkout', cartController.processCheckout);

module.exports = router;