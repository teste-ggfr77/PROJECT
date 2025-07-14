const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');

router.get('/register', authCtrl.registerForm);
router.post('/register', authCtrl.register);
router.get('/login', authCtrl.loginForm);
router.post('/login', authCtrl.login);
router.get('/logout', authCtrl.logout);
router.post('/logout', authCtrl.logout);
router.get('/forgot-password', authCtrl.forgotPasswordForm);
router.post('/forgot-password', authCtrl.forgotPassword);
router.get('/reset-password/:token', authCtrl.resetPasswordForm);
router.post('/reset-password/:token', authCtrl.resetPassword);

module.exports = router;