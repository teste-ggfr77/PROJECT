const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

exports.registerForm = (req, res) => {
    res.render('register');
};

exports.register = async (req, res) => {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hashedPassword });
    res.redirect('/auth/login');
};

exports.loginForm = (req, res) => {
    res.render('login', {
        messages: {
            success: req.flash('success'),
            error: req.flash('error')
        }
    });
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            req.flash('error', 'Please provide both email and password');
            return res.redirect('/auth/login');
        }

        const user = await User.findOne({ email });
        if (!user) {
            req.flash('error', 'Invalid email or password');
            return res.redirect('/auth/login');
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            req.flash('error', 'Invalid email or password');
            return res.redirect('/auth/login');
        }
        
        // Start a new session for security
        await new Promise((resolve, reject) => {
            req.session.regenerate((err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });

        // Update last login time
        await user.updateLastLogin();
        
        // Set up session
        req.session.user = user;
        
        // Save session before redirecting
        await new Promise((resolve, reject) => {
            req.session.save((err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });

        res.redirect('/');
    } catch (error) {
        console.error('Login error:', error);
        req.flash('error', 'An error occurred while logging in. Please try again.');
        res.redirect('/auth/login');
    }
};

exports.logout = (req, res) => {
    // Simple logout - just destroy the session
    if (req.session) {
        // Clear user data first
        req.session.user = null;
        
        // Destroy the session
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destroy error:', err);
            }
            // Clear the session cookie
            res.clearCookie('connect.sid', { path: '/' });
            res.redirect('/');
        });
    } else {
        // No session, just clear cookie and redirect
        res.clearCookie('connect.sid', { path: '/' });
        res.redirect('/');
    }
};

exports.forgotPasswordForm = (req, res) => {
    res.render('forgot-password', {
        messages: {
            success: req.flash('success'),
            error: req.flash('error')
        }
    });
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ error: 'No account with that email address exists.' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        // Send email with reset link
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const resetUrl = `http://${req.headers.host}/auth/reset-password/${resetToken}`;
        await transporter.sendMail({
            to: user.email,
            subject: 'Password Reset Request',
            html: `
                <h1>Password Reset</h1>
                <p>You requested a password reset. Click the link below to reset your password. This link will expire in 1 hour.</p>
                <a href="${resetUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 25px; display: inline-block; margin: 16px 0;">Reset Password</a>
                <p>If you didn't request this, you can safely ignore this email.</p>
            `
        });

        res.status(200).json({ message: 'Password reset email sent successfully' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'An error occurred while sending the reset email. Please try again.' });
    }
};

exports.resetPasswordForm = async (req, res) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/auth/forgot-password');
        }

        res.render('reset-password', {
            token: req.params.token,
            messages: {
                error: req.flash('error')
            }
        });
    } catch (error) {
        req.flash('error', 'An error occurred. Please try again.');
        res.redirect('/auth/forgot-password');
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/auth/forgot-password');
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        req.flash('success', 'Your password has been reset. Please log in.');
        res.redirect('/auth/login');
    } catch (error) {
        req.flash('error', 'An error occurred. Please try again.');
        res.redirect('/auth/forgot-password');
    }
};