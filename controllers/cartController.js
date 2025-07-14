const Product = require('../models/Product');

exports.addToCart = async (req, res) => {    
    try {
        const productId = req.params.id;
        const { color, size } = req.body;
        
        console.log('Add to cart request:', { 
            productId, 
            color, 
            size, 
            body: req.body,
            headers: req.headers,
            contentType: req.headers['content-type'],
            accept: req.headers.accept
        });
        
        // Set default values if not provided
        const itemColor = color || 'Black';
        const itemSize = size;

        // Get the product from database
        const product = await Product.findById(productId);
        if (!product) {
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return res.status(404).json({ error: 'Product not found' });
            }
            req.flash('error', 'Product not found');
            return res.redirect('/products');
        }

        // Initialize cart if it doesn't exist in session
        if (!req.session.cart) {
            req.session.cart = {
                items: [],
                subtotal: 0,
                total: 0,
                discount: 0
            };
        }

        // Check if the same product with same color and size exists
        const existingItemIndex = req.session.cart.items.findIndex(item => 
            item.id === product._id.toString() && 
            item.color === itemColor && 
            item.size === itemSize
        );

        if (existingItemIndex > -1) {
            // Update quantity of existing item
            req.session.cart.items[existingItemIndex].qty += 1;
        } else {
            // Add new item to cart
            req.session.cart.items.push({
                id: product._id.toString(),
                name: product.name,
                price: product.price,
                color: itemColor,
                size: itemSize,
                qty: 1,
                image: product.image
            });
        }

        // Recalculate cart totals
        req.session.cart.subtotal = req.session.cart.items.reduce((total, item) => {
            return total + (item.price * item.qty);
        }, 0);
        req.session.cart.total = req.session.cart.subtotal - (req.session.cart.discount || 0);

        // Handle JSON requests (AJAX)
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.json({ 
                success: true, 
                message: 'Product added to cart',
                cartCount: req.session.cart.items.reduce((count, item) => count + item.qty, 0)
            });
        }

        // Handle regular form submissions
        req.flash('success', 'Product added to cart successfully!');
        res.redirect('/cart');
    } catch (error) {
        console.error('Add to cart error:', error);
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(500).json({ error: 'Error adding to cart' });
        }
        req.flash('error', 'Error adding product to cart');
        res.redirect('/products');
    }
};

exports.viewCart = async (req, res) => {
    try {
        console.log('ViewCart called:', {
            sessionID: req.sessionID,
            session: req.session
        });

        // Initialize cart if it doesn't exist
        if (!req.session.cart) {
            req.session.cart = { 
                items: [], 
                subtotal: 0, 
                total: 0, 
                discount: 0 
            };
        }

        return res.render('cart', {
            title: 'Shopping Cart',
            products: req.session.cart.items,
            subtotal: req.session.cart.subtotal,
            total: req.session.cart.total,
            discount: req.session.cart.discount,
            promo: req.session.promo
        });
    } catch (error) {
        console.error('Error in viewCart:', error);
        return res.status(500).render('error', {
            message: 'Error loading cart',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

// Add this route to support AJAX cart panel
exports.viewCartJson = async (req, res) => {
    try {
        if (!req.session.cart) {
            req.session.cart = { items: [], subtotal: 0, total: 0, discount: 0 };
        }
        res.json({
            items: req.session.cart.items,
            subtotal: req.session.cart.subtotal,
            total: req.session.cart.total,
            discount: req.session.cart.discount
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load cart' });
    }
};

exports.updateQuantity = async (req, res) => {
    try {
        const { change } = req.body;
        const productId = req.params.id;

        if (!req.session.cart) {
            return res.status(400).json({ error: 'Cart not found' });
        }

        const itemIndex = req.session.cart.items.findIndex(item => item.id === productId);
        if (itemIndex === -1) {
            return res.status(404).json({ error: 'Item not found in cart' });
        }

        const newQty = req.session.cart.items[itemIndex].qty + parseInt(change);
        if (newQty < 1) {
            return res.status(400).json({ error: 'Quantity cannot be less than 1' });
        }

        // Update quantity
        req.session.cart.items[itemIndex].qty = newQty;

        // Recalculate totals
        req.session.cart.subtotal = req.session.cart.items.reduce((total, item) => {
            return total + (item.price * item.qty);
        }, 0);
        req.session.cart.total = req.session.cart.subtotal - (req.session.cart.discount || 0);

        res.json({ success: true });
    } catch (error) {
        console.error('Update quantity error:', error);
        res.status(500).json({ error: 'Failed to update quantity' });
    }
};

exports.removeItem = async (req, res) => {
    try {
        const productId = req.params.id;

        if (!req.session.cart) {
            return res.status(400).json({ error: 'Cart not found' });
        }

        req.session.cart.items = req.session.cart.items.filter(item => item.id !== productId);

        // Recalculate totals
        req.session.cart.subtotal = req.session.cart.items.reduce((total, item) => {
            return total + (item.price * item.qty);
        }, 0);
        req.session.cart.total = req.session.cart.subtotal - (req.session.cart.discount || 0);

        res.json({ success: true });
    } catch (error) {
        console.error('Remove item error:', error);
        res.status(500).json({ error: 'Failed to remove item' });
    }
};

exports.applyPromo = async (req, res) => {
    try {
        const { promoCode } = req.body;

        // Find the promo code
        const PromoCode = require('../models/PromoCode');
        const promo = await PromoCode.findOne({ code: promoCode });

        if (!promo) {
            req.flash('error', 'Invalid promo code');
            return res.redirect('/cart');
        }

        if (promo.expiryDate && new Date() > promo.expiryDate) {
            req.flash('error', 'This promo code has expired');
            return res.redirect('/cart');
        }

        // Calculate discount
        const cartTotal = req.session.cart.subtotal;
        let discount = 0;
        if (promo.discountType === 'percentage') {
            discount = (cartTotal * promo.discountValue) / 100;
        } else {
            discount = promo.discountValue;
        }

        // Apply discount
        req.session.cart.discount = discount;
        req.session.cart.total = cartTotal - discount;
        req.session.promo = { code: promoCode };

        req.flash('success', 'Promo code applied successfully');
        res.redirect('/cart');
    } catch (error) {
        console.error('Apply promo error:', error);
        req.flash('error', 'Error applying promo code');
        res.redirect('/cart');
    }
};

exports.checkoutForm = async (req, res) => {
    try {
        // Allow guest checkout or require login based on your preference
        // For now, we'll allow guest checkout
        // if (!req.user && !req.session.user) {
        //     return res.redirect('/auth/login');
        // }

        const cart = req.session.cart || { items: [], subtotal: 0, total: 0, discount: 0 };
        if (!cart.items.length) {
            return res.redirect('/cart');
        }

        // Check stock availability before showing checkout page
        const Product = require('../models/Product');
        const stockErrors = [];
        
        for (const item of cart.items) {
            const product = await Product.findById(item.id);
            if (!product || product.quantity < item.qty) {
                stockErrors.push(`Not enough stock for ${item.name}. Available: ${product ? product.quantity : 0}`);
            }
        }

        // Calculate totals
        let subtotal = 0;
        for (const item of cart.items) {
            subtotal += item.price * item.qty;
        }
        const total = subtotal - (cart.discount || 0);

        // If skipping CSRF for /cart/checkout, provide a dummy token for EJS
        let csrfToken = '';
        if (req.csrfToken) {
            try {
                csrfToken = req.csrfToken();
            } catch (err) {
                csrfToken = '';
            }
        }
        res.render('checkout', { 
            cart,
            subtotal,
            total,
            stockErrors,
            csrfToken // always defined, even if empty
        });
    } catch (error) {
        console.error('Checkout form error:', error);
        res.status(500).render('error', { error: 'Error loading checkout page' });
    }
};

exports.processCheckout = async (req, res) => {
    try {
        // For guest checkout, we'll create a simple order without user association
        // if (!req.user && !req.session.user) {
        //     return res.redirect('/auth/login');
        // }

        const cart = req.session.cart;
        if (!cart || !cart.items.length) {
            return res.redirect('/cart');
        }

        const Order = require('../models/Order');
        const Product = require('../models/Product');

        // Map cart items to order items and update product quantities
        const orderItems = await Promise.all(
            cart.items.map(async item => {
                const product = await Product.findById(item.id);
                if (!product || product.quantity < item.qty) {
                    throw new Error(`Not enough stock for ${product ? product.name : 'Unknown product'}`);
                }

                // Update product quantity
                await Product.findByIdAndUpdate(product._id, {
                    $inc: { quantity: -item.qty }
                });

                return {
                    product: product._id,
                    color: item.color,
                    size: item.size,
                    quantity: item.qty,
                    price: product.price
                };
            })
        );

        // Create the order
        const orderData = {
            items: orderItems,
            total: cart.total,
            customerName: req.body.customerName,
            shippingAddress: req.body.address,
            phone: req.body.phone,
            status: 'processing'
        };

        // Add user if authenticated
        if (req.user || req.session.user) {
            orderData.user = (req.user || req.session.user)._id;
        }

        const order = await Order.create(orderData);

        // Create notification for new order
        try {
            console.log('Creating notification for order:', order._id, 'Customer:', order.customerName);
            const notificationCtrl = require('./notificationController');
            await notificationCtrl.createOrderNotification(order);
            console.log('Notification created successfully for order:', order._id);
        } catch (notificationError) {
            console.error('Error creating order notification:', notificationError);
            console.error('Notification error stack:', notificationError.stack);
            // Don't fail the order if notification fails
        }

        // Clear the cart
        req.session.cart = {
            items: [],
            subtotal: 0,
            total: 0,
            discount: 0
        };

        // Clear promo
        delete req.session.promo;

        // Add thank you message
        req.flash('success', 'Thank you for your order! We appreciate your business.');
        
        // Redirect to order confirmation or products page
        if (req.user || req.session.user) {
            res.redirect(`/orders/${order._id}`);
        } else {
            res.redirect('/products?message=order-success');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        req.flash('error', `Failed to process checkout: ${error.message}`);
        res.redirect('/cart');
    }
};