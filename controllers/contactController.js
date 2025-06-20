const Contact = require('../models/Contact');
const Newsletter = require('../models/Newsletter');
const SocialMedia = require('../models/SocialMedia');

exports.getContactPage = (req, res) => {
    res.render('contact', {
        title: 'Contact Us',
        user: req.user,
        messages: {
            success: req.flash('success'),
            error: req.flash('error')
        }
    });
};

exports.submitContact = async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        await Contact.create({
            name,
            email,
            subject,
            message
        });
        req.flash('success', 'Your message has been sent successfully!');
        res.redirect('/contact');
    } catch (error){
        console.error(error);
        req.flash('error', 'Error sending message. Please try again.');
        res.redirect('/contact');
    }
};

// Admin Controllers
exports.getAdminContacts = async (req, res) => {
    try {
        const [contacts, newsletters, socialMediaLinks] = await Promise.all([
            Contact.find().sort({ createdAt: -1 }),
            Newsletter.find({}).sort({ subscribedAt: -1 }),
            SocialMedia.find({}).sort({ order: 1, createdAt: -1 })
        ]);
        
        res.render('admin/contacts', {
            title: 'Manage Contacts',
            contacts,
            newsletters,
            socialMediaLinks,
            user: req.user,
            csrfToken: req.csrfToken(),
            messages: {
                success: req.flash('success'),
                error: req.flash('error')
            }
        });
    } catch (error) {
        console.error(error);
        req.flash('error', 'Error fetching contacts');
        res.redirect('/admin/dashboard');
    }
};

// Helper function to check if user is on admin route
exports.isAdminRoute = (req) => {
    return req.path.startsWith('/admin');
};

exports.updateContactStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        await Contact.findByIdAndUpdate(id, { status });
        
        req.flash('success', 'Contact status updated successfully');
        res.redirect('/admin/contacts');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Error updating contact status');
        res.redirect('/admin/contacts');
    }
};

exports.deleteContact = async (req, res) => {
    try {
        const { id } = req.params;
        
        await Contact.findByIdAndDelete(id);
        
        req.flash('success', 'Contact deleted successfully');
        res.redirect('/admin/contacts');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Error deleting contact');
        res.redirect('/admin/contacts');
    }
};

exports.updateContactStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        await Contact.findByIdAndUpdate(id, { status });
        req.flash('success', 'Contact status updated successfully');
        res.redirect('/admin/contacts');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Error updating contact status');
        res.redirect('/admin/contacts');
    }
};

exports.deleteContact = async (req, res) => {
    try {
        const { id } = req.params;
        await Contact.findByIdAndDelete(id);
        req.flash('success', 'Contact deleted successfully');
        res.redirect('/admin/contacts');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Error deleting contact');
        res.redirect('/admin/contacts');
    }
};

// Social Media Management
exports.addSocialMedia = async (req, res) => {
    try {
        const { platform, name, url, order } = req.body;
        
        if (!platform || !name || !url) {
            req.flash('error', 'Platform, name, and URL are required');
            return res.redirect('/admin/contacts');
        }

        const icon = SocialMedia.getDefaultIcon(platform);
        
        const socialMedia = new SocialMedia({
            platform,
            name,
            url,
            icon,
            order: parseInt(order) || 0
        });

        await socialMedia.save();
        req.flash('success', 'Social media link added successfully');
        res.redirect('/admin/contacts');
    } catch (error) {
        console.error('Error adding social media:', error);
        req.flash('error', 'Error adding social media link');
        res.redirect('/admin/contacts');
    }
};

exports.updateSocialMedia = async (req, res) => {
    try {
        const { id } = req.params;
        const { platform, name, url, order, isActive } = req.body;
        
        const updateData = {
            platform,
            name,
            url,
            order: parseInt(order) || 0,
            isActive: isActive === 'on'
        };

        // Update icon if platform changed
        if (platform) {
            updateData.icon = SocialMedia.getDefaultIcon(platform);
        }

        await SocialMedia.findByIdAndUpdate(id, updateData);
        req.flash('success', 'Social media link updated successfully');
        res.redirect('/admin/contacts');
    } catch (error) {
        console.error('Error updating social media:', error);
        req.flash('error', 'Error updating social media link');
        res.redirect('/admin/contacts');
    }
};

exports.deleteSocialMedia = async (req, res) => {
    try {
        const { id } = req.params;
        await SocialMedia.findByIdAndDelete(id);
        req.flash('success', 'Social media link deleted successfully');
        res.redirect('/admin/contacts');
    } catch (error) {
        console.error('Error deleting social media:', error);
        req.flash('error', 'Error deleting social media link');
        res.redirect('/admin/contacts');
    }
};

exports.toggleSocialMedia = async (req, res) => {
    try {
        const { id } = req.params;
        const socialMedia = await SocialMedia.findById(id);
        
        if (!socialMedia) {
            req.flash('error', 'Social media link not found');
            return res.redirect('/admin/contacts');
        }

        socialMedia.isActive = !socialMedia.isActive;
        await socialMedia.save();
        
        req.flash('success', `Social media link ${socialMedia.isActive ? 'activated' : 'deactivated'} successfully`);
        res.redirect('/admin/contacts');
    } catch (error) {
        console.error('Error toggling social media:', error);
        req.flash('error', 'Error updating social media status');
        res.redirect('/admin/contacts');
    }
};
