const express = require('express');
const router = express.Router();
const csrf = require('csurf');
const adminCtrl = require('../controllers/adminController');
const analyticsCtrl = require('../controllers/analyticsController');
const promoCtrl = require('../controllers/promoController');
const pageContentCtrl = require('../controllers/pageContentController');
const notificationCtrl = require('../controllers/notificationController');
const contactRoutes = require('./contactRoutes');
const adminAuth = require('../middleware/adminAuth');
const upload = require('../middleware/upload');
const { uploadProductImages } = require('../middleware/multipleUpload');
const { handleAdminError } = require('../middleware/adminErrorHandler');

// Debug middleware
router.use((req, res, next) => {
    console.log('Admin Route:', {
        method: req.method,
        url: req.url,
        body: req.method === 'POST' ? req.body : undefined,
        files: req.files || req.file,
        params: req.params
    });
    next();
});

router.get('/login', adminCtrl.loginForm);
router.post('/login', adminCtrl.login);
router.get('/logout', adminCtrl.logout);
router.post('/logout', adminCtrl.logout);

// Test route to debug access issues
router.get('/test', (req, res) => {
    res.json({
        message: 'Admin routes are working',
        session: {
            user: !!req.session?.user,
            isAdmin: !!req.session?.isAdmin,
            sessionId: req.sessionID
        },
        user: req.user ? { id: req.user.id, email: req.user.email } : null
    });
});

// Test route for parameter debugging
router.get('/test-param/:id', (req, res) => {
    res.json({
        message: 'Parameter test route',
        params: req.params,
        id: req.params.id,
        url: req.url,
        originalUrl: req.originalUrl
    });
});

// Protected admin routes
router.get('/', adminAuth, (req, res) => res.redirect('/admin/dashboard'));
router.get('/dashboard', adminAuth, adminCtrl.dashboard);
router.get('/dashboard/edit-homepage', adminAuth, pageContentCtrl.getHomepageEditor);
router.post('/dashboard/update-section/:type', adminAuth, upload.any(), pageContentCtrl.updateSection);

// Add a redirect for common URL patterns
router.get('/edit-homepage', adminAuth, (req, res) => res.redirect('/admin/dashboard/edit-homepage'));

// Product Management Routes
router.get('/products', adminAuth, adminCtrl.viewProducts);
router.get('/add-product', adminAuth, adminCtrl.addProductForm);
router.post('/add-product', adminAuth, uploadProductImages, adminCtrl.addProduct);
router.delete('/product/:id', adminAuth, adminCtrl.deleteProduct);
router.get('/edit-product/:id', adminAuth, adminCtrl.editProductForm);
router.post('/edit-product/:id', 
    adminAuth,
    upload.fields([
        { name: 'image', maxCount: 1 },
        { name: 'additionalPhotos', maxCount: 10 }
    ]),
    (req, res, next) => {
        // Debug logging for form submission
        console.log('Processing edit product request:', {
            url: req.originalUrl,
            method: req.method,
            contentType: req.headers['content-type'],
            body: req.body,
            files: req.files ? Object.keys(req.files).map(key => ({
                field: key,
                count: req.files[key].length
            })) : null
        });
        next();
    },
    adminCtrl.editProduct);

// Image removal routes
router.post('/remove-additional-photo/:id', adminAuth, adminCtrl.removeAdditionalPhoto);
router.post('/remove-color-image/:id', adminAuth, adminCtrl.removeColorImage);
router.get('/view-orders', adminAuth, adminCtrl.viewOrders);
router.get('/view-orders/:id', adminAuth, (req, res, next) => {
    console.log('Route matched - view-orders/:id', {
        params: req.params,
        url: req.url,
        originalUrl: req.originalUrl,
        baseUrl: req.baseUrl
    });
    next();
}, adminCtrl.viewOrderDetail);
router.get('/categories', adminAuth, adminCtrl.viewCategories);
router.get('/add-category', adminAuth, adminCtrl.addCategoryForm);
router.post('/add-category', adminAuth, adminCtrl.addCategory);
router.get('/analytics', adminAuth, analyticsCtrl.dashboard);
router.get('/promo-codes', adminAuth, promoCtrl.listPromos);
router.get('/add-promo', adminAuth, promoCtrl.addPromoForm);
router.post('/add-promo', adminAuth, promoCtrl.addPromo);
router.get('/delete-promo/:id', adminAuth, promoCtrl.deletePromo);
router.post('/orders/:id/status', adminAuth, adminCtrl.updateOrderStatus);

// Contact Management Routes
router.use('/contacts', adminAuth, contactRoutes);

// Newsletter Management Routes
router.post('/newsletter/:id/unsubscribe', adminAuth, async (req, res) => {
    try {
        const Newsletter = require('../models/Newsletter');
        await Newsletter.findByIdAndUpdate(req.params.id, { isActive: false });
        req.flash('success', 'Subscriber unsubscribed successfully');
        res.redirect('/admin/contacts');
    } catch (error) {
        console.error('Error unsubscribing newsletter:', error);
        req.flash('error', 'Error unsubscribing subscriber');
        res.redirect('/admin/contacts');
    }
});

router.delete('/newsletter/:id', adminAuth, async (req, res) => {
    try {
        const Newsletter = require('../models/Newsletter');
        await Newsletter.findByIdAndDelete(req.params.id);
        req.flash('success', 'Newsletter subscriber deleted successfully');
        res.redirect('/admin/contacts');
    } catch (error) {
        console.error('Error deleting newsletter subscriber:', error);
        req.flash('error', 'Error deleting subscriber');
        res.redirect('/admin/contacts');
    }
});

// Page Content Management Routes
router.get('/page-contents', adminAuth, pageContentCtrl.getPageContents);
router.post('/api/content', adminAuth, upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'additionalImages', maxCount: 10 }
]), pageContentCtrl.addContent);
router.put('/api/content/:id', adminAuth, upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'additionalImages', maxCount: 10 }
]), pageContentCtrl.updateContent);
router.delete('/api/content/:id', adminAuth, pageContentCtrl.deleteContent);
router.post('/api/content/reorder', adminAuth, pageContentCtrl.reorderContent);

// Homepage content management routes (duplicate removed - using dashboard routes above)

// Notification Management Routes
router.get('/notifications', adminAuth, (req, res) => {
    res.render('admin/notifications', {
        title: 'Notification Management',
        csrfToken: req.csrfToken()
    });
});

// Notification API Routes
router.get('/api/notifications', adminAuth, notificationCtrl.getNotifications);
router.post('/api/notifications/:id/read', adminAuth, notificationCtrl.markAsRead);
router.post('/api/notifications/mark-all-read', adminAuth, notificationCtrl.markAllAsRead);
router.post('/api/notifications', adminAuth, notificationCtrl.createNotification);
router.delete('/api/notifications/:id', adminAuth, notificationCtrl.deleteNotification);
router.get('/api/notifications/stats', adminAuth, notificationCtrl.getStats);

// User Management Routes
router.get('/users', adminAuth, adminCtrl.getUsers);
router.get('/users/:id', adminAuth, adminCtrl.getUserDetails);
router.post('/users/:id/make-admin', adminAuth, adminCtrl.makeAdmin);
router.post('/users/:id/delete', adminAuth, adminCtrl.deleteUser);
router.get('/delete-category/:id', adminAuth, adminCtrl.deleteCategory);

module.exports = router;