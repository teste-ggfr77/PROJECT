const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const adminAuth = require('../middleware/adminAuth');

router.use((req, res, next) => {
    if (req.baseUrl === '/admin/contacts') {
        if (!req.path.startsWith('/')) {
            req.url = '/' + req.url;
        }
        return next();
    }
    next();
});

// Public routes
router.get('/', (req, res, next) => {
    if (req.baseUrl === '/admin/contacts') {
        return contactController.getAdminContacts(req, res, next);
    }
    return contactController.getContactPage(req, res, next);
});

router.post('/', (req, res, next) => {
    if (req.baseUrl === '/admin/contacts') {
        return res.redirect('/admin/contacts');
    }
    return contactController.submitContact(req, res, next);
});

// Admin routes
router.post('/:id/status', adminAuth, contactController.updateContactStatus);
router.delete('/:id', adminAuth, contactController.deleteContact);

// Social Media Management Routes
router.post('/social-media', adminAuth, contactController.addSocialMedia);
router.post('/social-media/:id', adminAuth, contactController.updateSocialMedia);
router.delete('/social-media/:id', adminAuth, contactController.deleteSocialMedia);
router.post('/social-media/:id/toggle', adminAuth, contactController.toggleSocialMedia);

module.exports = router;
