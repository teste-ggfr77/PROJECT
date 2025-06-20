const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const profileController = require('../controllers/profileController');

// Profile view routes
router.get('/', auth, profileController.getProfile);
router.get('/edit', auth, profileController.getEditProfile);

// Profile update route with file upload
router.post('/update', 
    auth, 
    upload.single('profilePicture'),
    profileController.updateProfile
);

// Theme preference route
router.post('/theme', auth, profileController.updateTheme);

// Password change routes
router.get('/change-password', auth, profileController.getChangePassword);
router.post('/change-password', auth, profileController.updatePassword);

module.exports = router;