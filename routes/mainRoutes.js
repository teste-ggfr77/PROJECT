const express = require('express');
const router = express.Router();
const mainCtrl = require('../controllers/mainController');
const PageContent = require('../models/PageContent');

// Homepage route with dynamic content
router.get('/', async (req, res) => {
    try {
        // Fetch all homepage sections
        const [heroSection, featuredSection, promoSection, featuredProductsSection, communitySection] = await Promise.all([
            PageContent.findOne({ type: 'hero' }),
            PageContent.findOne({ type: 'featured' }),
            PageContent.findOne({ type: 'promotion' }),
            PageContent.findOne({ type: 'product-showcase' }),
            PageContent.findOne({ type: 'community' })
        ]);

        console.log('Homepage sections loaded:', {
            hero: !!heroSection,
            featured: !!featuredSection,
            promo: !!promoSection,
            featuredProducts: !!featuredProductsSection,
            community: !!communitySection
        });

        res.render('index', {
            title: 'Homepage',
            heroSection,
            featuredSection,
            promoSection,
            featuredProductsSection,
            communitySection
        });
    } catch (error) {
        console.error('Error loading homepage content:', error);
        res.render('index', { 
            title: 'Homepage',
            heroSection: null,
            featuredSection: null,
            promoSection: null,
            featuredProductsSection: null,
            communitySection: null
        });
    }
});

// Static pages (must be before dynamic routes)
router.get('/about', (req, res) => res.render('about', { title: 'About SABILS' }));
router.get('/size-guide', (req, res) => res.render('size-guide', { title: 'Size Guide' }));
router.get('/shipping', (req, res) => res.render('shipping', { title: 'Shipping Info' }));
router.get('/returns', (req, res) => res.render('returns', { title: 'Returns & Exchanges' }));
router.get('/fit-guarantee', (req, res) => res.render('fit-guarantee', { title: 'Fit Guarantee' }));
router.get('/faq', (req, res) => res.render('faq', { title: 'FAQ' }));
router.get('/careers', (req, res) => res.render('careers', { title: 'Careers' }));
router.get('/press', (req, res) => res.render('press', { title: 'Press' }));
router.get('/athletes', (req, res) => res.render('athletes', { title: 'Athletes' }));
router.get('/sustainability', (req, res) => res.render('sustainability', { title: 'Sustainability' }));
router.get('/privacy', (req, res) => res.render('privacy', { title: 'Privacy Policy' }));
router.get('/terms', (req, res) => res.render('terms', { title: 'Terms of Service' }));
router.get('/accessibility', (req, res) => res.render('accessibility', { title: 'Accessibility' }));
router.get('/training', (req, res) => res.render('training', { title: 'Training' }));
router.get('/community', (req, res) => res.render('community', { title: 'Community' }));
router.get('/blog', (req, res) => res.render('blog', { title: 'Blog' }));
router.get('/help', (req, res) => res.render('help', { title: 'Help' }));
router.get('/track-order', (req, res) => res.render('track-order', { title: 'Track Order' }));
router.get('/api/track-order/:orderId', async (req, res) => {
    try {
        const Order = require('../models/Order');
        const orderId = req.params.orderId;
        
        // Try to find order by ID or by a custom order number format
        let order = await Order.findById(orderId).populate('user').populate('items.product');
        
        // If not found by ID, try to find by the last 6 characters of the ID
        if (!order) {
            const orders = await Order.find().populate('user').populate('items.product');
            order = orders.find(o => o._id.toString().slice(-6).toUpperCase() === orderId.replace(/\D/g, '').slice(-6));
        }
        
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: req.__('track_order.order_not_found')
            });
        }
        
        // Create timeline based on order status and dates
        const timeline = [];
        const orderDate = new Date(order.createdAt);
        
        // Order Placed
        timeline.push({
            status: 'completed',
            title: req.__('profile.order_placed'),
            description: req.__('profile.order_received_desc'),
            date: orderDate.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            })
        });
        
        // Payment Confirmed (5 minutes after order)
        const paymentDate = new Date(orderDate.getTime() + 5 * 60000);
        timeline.push({
            status: 'completed',
            title: req.__('profile.payment_confirmed'),
            description: req.__('profile.payment_processed_desc'),
            date: paymentDate.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            })
        });
        
        // Processing/Shipped/Delivered based on status
        if (order.status === 'processing') {
            timeline.push({
                status: 'current',
                title: req.__('track_order.status_processing'),
                description: req.__('profile.status_processing_desc'),
                date: req.__('profile.in_progress')
            });
            timeline.push({
                status: 'pending',
                title: req.__('track_order.status_shipped'),
                description: req.__('profile.will_ship_soon_desc'),
                date: req.__('profile.estimated') + ': ' + new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            });
            timeline.push({
                status: 'pending',
                title: req.__('track_order.status_delivered'),
                description: req.__('profile.package_delivered_desc'),
                date: req.__('profile.estimated') + ': ' + new Date(orderDate.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            });
        } else if (order.status === 'shipped') {
            const processedDate = new Date(orderDate.getTime() + 24 * 60 * 60 * 1000);
            timeline.push({
                status: 'completed',
                title: req.__('profile.order_processed'),
                description: req.__('profile.items_picked_packed_desc'),
                date: processedDate.toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                })
            });
            
            const shippedDate = new Date(orderDate.getTime() + 2 * 24 * 60 * 60 * 1000);
            timeline.push({
                status: 'current',
                title: req.__('track_order.status_shipped'),
                description: req.__('profile.status_shipped_desc') + ` ${req.__('profile.tracking')}: 1Z999AA${order._id.toString().slice(-10)}`,
                date: shippedDate.toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                })
            });
            
            timeline.push({
                status: 'pending',
                title: req.__('profile.out_for_delivery'),
                description: req.__('profile.package_out_delivery_desc'),
                date: req.__('profile.expected') + ': ' + new Date(orderDate.getTime() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            });
            
            timeline.push({
                status: 'pending',
                title: req.__('track_order.status_delivered'),
                description: req.__('profile.package_delivered_desc'),
                date: req.__('profile.expected') + ': ' + new Date(orderDate.getTime() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            });
        } else if (order.status === 'delivered') {
            const processedDate = new Date(orderDate.getTime() + 24 * 60 * 60 * 1000);
            const shippedDate = new Date(orderDate.getTime() + 2 * 24 * 60 * 60 * 1000);
            const outForDeliveryDate = new Date(orderDate.getTime() + 4 * 24 * 60 * 60 * 1000);
            const deliveredDate = new Date(orderDate.getTime() + 5 * 24 * 60 * 60 * 1000);
            
            timeline.push({
                status: 'completed',
                title: req.__('profile.order_processed'),
                description: req.__('profile.items_picked_packed_desc'),
                date: processedDate.toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                })
            });
            
            timeline.push({
                status: 'completed',
                title: req.__('track_order.status_shipped'),
                description: req.__('profile.order_shipped_desc') + ` ${req.__('profile.tracking')}: 1Z999AA${order._id.toString().slice(-10)}`,
                date: shippedDate.toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                })
            });
            
            timeline.push({
                status: 'completed',
                title: req.__('profile.out_for_delivery'),
                description: req.__('profile.package_was_out_delivery_desc'),
                date: outForDeliveryDate.toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                })
            });
            
            timeline.push({
                status: 'completed',
                title: req.__('track_order.status_delivered'),
                description: req.__('profile.status_delivered_desc'),
                date: deliveredDate.toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                })
            });
        } else if (order.status === 'cancelled') {
            timeline.push({
                status: 'completed',
                title: req.__('track_order.status_cancelled'),
                description: req.__('profile.status_cancelled_desc'),
                date: new Date().toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                })
            });
        }
        
        // Format order data
        const orderData = {
            id: `ORD-${orderDate.getFullYear()}-${order._id.toString().slice(-6).toUpperCase()}`,
            date: orderDate.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
            }),
            total: `${order.total.toFixed(2)}`,
            status: order.status,
            estimatedDelivery: order.status === 'delivered' ? req.__('track_order.status_delivered') : 
                              new Date(orderDate.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
                                  month: 'long', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                              }),
            timeline: timeline,
            items: order.items.map(item => ({
                name: item.product ? item.product.name : req.__('profile.unknown_product'),
                size: item.size || 'N/A',
                color: item.color || 'N/A',
                quantity: item.quantity,
                price: `${(item.price * item.quantity).toFixed(2)}`
            }))
        };
        
        res.json({ success: true, order: orderData });
        
    } catch (error) {
        console.error('Error tracking order:', error);
        res.status(500).json({ 
            success: false, 
            message: req.__('track_order.tracking_error')
        });
    }
});
router.get('/gift-cards', (req, res) => res.render('gift-cards', { title: 'Gift Cards' }));
router.get('/student-discount', (req, res) => res.render('student-discount', { title: 'Student Discount' }));
router.get('/military-discount', (req, res) => res.render('military-discount', { title: 'Military Discount' }));
router.get('/wholesale', (req, res) => res.render('wholesale', { title: 'Wholesale' }));
router.get('/affiliate', (req, res) => res.render('affiliate', { title: 'Affiliate' }));

// Returns page route
router.get('/returns', mainCtrl.returns);

// Journey redirects
router.get('/women/journey', (req, res) => {
    res.redirect('/journey?gender=women');
});

router.get('/men/journey', (req, res) => {
    res.redirect('/journey?gender=men');
});

// Journey routes
router.get('/api/journey', mainCtrl.getJourneyJson);
router.get('/journey', mainCtrl.journey);

// Allday redirects
router.get('/women/allday', (req, res) => {
    res.redirect('/allday?gender=women');
});

router.get('/men/allday', (req, res) => {
    res.redirect('/allday?gender=men');
});

// Allday routes
router.get('/api/allday', mainCtrl.getAlldayJson);
router.get('/allday', mainCtrl.allday);

// Drive redirects
router.get('/women/drive', (req, res) => {
    res.redirect('/drive?gender=women');
});

router.get('/men/drive', (req, res) => {
    res.redirect('/drive?gender=men');
});

// Drive routes
router.get('/api/drive', mainCtrl.getDriveJson);
router.get('/drive', mainCtrl.drive);

// Outwork redirects
router.get('/women/outwork', (req, res) => {
    res.redirect('/outwork?gender=women');
});

router.get('/men/outwork', (req, res) => {
    res.redirect('/outwork?gender=men');
});

// Outwork routes
router.get('/api/outwork', mainCtrl.getOutworkJson);
router.get('/outwork', mainCtrl.outwork);

// Redirect gender-specific trainer routes to the main trainers page with query parameter
router.get('/women/trainers', (req, res) => {
    res.redirect('/trainers?gender=women');
});

router.get('/men/trainers', (req, res) => {
    res.redirect('/trainers?gender=men');
});

router.get('/products', mainCtrl.products); // Add products page route
router.get('/products/:id', mainCtrl.viewProduct);
router.get('/footwear', mainCtrl.footwear); // Add footwear page route
router.get('/apparel', mainCtrl.apparel); // Add apparel page route
router.get('/accessories', mainCtrl.accessories); // Add accessories page route
router.get('/trainers', mainCtrl.trainers); // Add trainers page route
router.get('/women/running', mainCtrl.womenRunning); // Add women's running page route
router.get('/new-arrivals', mainCtrl.newArrivals); // Add new arrivals route
router.get('/:gender/running', mainCtrl.running); // Add dynamic route for men's and women's running
router.get('/:gender/apparel', mainCtrl.genderApparel); // Add dynamic route for men's and women's apparel
router.get('/:gender/tops', mainCtrl.genderTops); // Add dynamic route for tops
router.get('/:gender/shorts', mainCtrl.genderShorts); // Add dynamic route for shorts
router.get('/:gender/pants', mainCtrl.genderPants); // Add dynamic route for pants
router.get('/:gender/leggings', mainCtrl.genderLeggings); // Add dynamic route for leggings
router.get('/:gender/sports-bras', mainCtrl.genderSportsBras); // Add dynamic route for sports bras
router.get('/:gender/hoodies', mainCtrl.genderHoodies); // Add dynamic route for hoodies
router.get('/:gender', mainCtrl.genderPage); // Add dynamic route for /woman and /man
router.get('/api/search', mainCtrl.searchProducts); // Add search API endpoint
router.get('/api/trainers', mainCtrl.getTrainersJson); // API endpoint for trainers by gender
router.get('/trainers', (req, res) => mainCtrl.trainers(req, res)); // Single trainers page

module.exports = router;