const User = require('../models/User');
const Order = require('../models/Order');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// View profile page
exports.getProfile = async (req, res) => {
    try {
        const user = req.user;
        const orders = await Order.find({ user: user._id })
            .populate('items.product')
            .sort({ createdAt: -1 })
            .limit(5);

        res.render('profile', {
            title: 'Your Profile',
            user,
            orders,
            messages: {
                success: req.flash('success'),
                error: req.flash('error')
            }
        });
    } catch (error) {
        console.error('Profile error:', error);
        req.flash('error', 'Error loading profile');
        res.redirect('/');
    }
};

// Get edit profile form
exports.getEditProfile = (req, res) => {
    res.render('edit-profile', {
        title: 'Edit Profile',
        user: req.user,
        messages: {
            success: req.flash('success'),
            error: req.flash('error')
        }
    });
};

// Helper function to add a challenge
async function addChallenge(userId, challengeData) {
    try {
        await User.findByIdAndUpdate(userId, {
            $push: {
                challenges: {
                    ...challengeData,
                    completedAt: new Date()
                }
            }
        });
    } catch (error) {
        console.error('Error adding challenge:', error);
    }
}

exports.checkAndAddProfileChallenge = async (userId) => {
    const user = await User.findById(userId);
    const hasProfileChallenge = user.challenges.some(c => c.type === 'profile');
    
    if (!hasProfileChallenge && user.name && user.email && user.contactNumber && user.shippingAddress) {
        await addChallenge(userId, {
            type: 'profile',
            name: 'Profile Perfectionist',
            description: 'Completed all profile information',
            reward: 'Profile badge'
        });
    }
};

// Update profile
exports.updateProfile = async (req, res) => {
    try {
        const updateData = {
            name: req.body.name.trim(),
            email: req.body.email.trim(),
            contactNumber: req.body.contactNumber ? req.body.contactNumber.trim() : undefined,
            preferredPaymentMethod: req.body.preferredPaymentMethod || null,
            shippingAddress: req.body.shippingAddress ? req.body.shippingAddress.trim() : undefined
        };

        // Handle profile picture upload
        if (req.file) {
            // Store the path relative to the public directory
            updateData.profilePicture = '/uploads/' + req.file.filename;
            
            // Delete old profile picture if it exists
            if (req.user.profilePicture) {
                const fs = require('fs').promises;
                const path = require('path');
                const oldPicturePath = path.join(__dirname, '../public', req.user.profilePicture);
                try {
                    await fs.unlink(oldPicturePath);
                } catch (err) {
                    console.error('Error deleting old profile picture:', err);
                }
            }
        }

        // Find user and update with new data
        const user = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/profile/edit');
        }

        // Update session user data
        req.session.user = user;

        // Check and add profile completion challenge
        await exports.checkAndAddProfileChallenge(user._id);

        req.flash('success', 'Profile updated successfully');
        res.redirect('/profile');
    } catch (error) {
        console.error('Profile update error:', error);
        req.flash('error', error.message || 'Error updating profile');
        res.redirect('/profile/edit');
    }
};

// Handle profile picture upload
exports.updateProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            throw new Error('Please select an image to upload');
        }

        // Additional validation
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (req.file.size > maxSize) {
            throw new Error('File size cannot exceed 5MB');
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            throw new Error('Only JPEG, PNG and GIF images are allowed');
        }

        const user = req.user;

        // Delete old profile picture if it exists
        if (user.profilePicture) {
            const fs = require('fs');
            const path = require('path');
            const oldPath = path.join(__dirname, '../public', user.profilePicture);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        user.profilePicture = '/uploads/' + req.file.filename;
        await user.save();

        req.flash('success', 'Profile picture updated successfully');
        res.json({ success: true, url: user.profilePicture });
    } catch (error) {
        console.error('Profile picture upload error:', error);
        res.status(400).json({ 
            success: false,
            error: error.message || 'Error uploading profile picture'
        });
    }
};

// Update theme preference
exports.updateTheme = async (req, res) => {
    try {
        const { darkMode } = req.body;
        const user = req.user;

        await user.updateTheme(darkMode);
        res.json({ success: true });
    } catch (error) {
        console.error('Theme update error:', error);
        res.status(400).json({ error: error.message });
    }
};

// Change password form
exports.getChangePassword = (req, res) => {
    res.render('change-password', {
        title: 'Change Password',
        messages: {
            success: req.flash('success'),
            error: req.flash('error')
        }
    });
};

// Update password
exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const user = req.user;

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            req.flash('error', 'Current password is incorrect');
            return res.redirect('/profile/change-password');
        }

        // Verify new password match
        if (newPassword !== confirmPassword) {
            req.flash('error', 'New passwords do not match');
            return res.redirect('/profile/change-password');
        }

        await user.updatePassword(newPassword);
        req.flash('success', 'Password updated successfully');
        res.redirect('/profile');
    } catch (error) {
        console.error('Password update error:', error);
        req.flash('error', 'Error updating password');
        res.redirect('/profile/change-password');
    }
};