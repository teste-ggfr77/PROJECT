const PromoCode = require('../models/PromoCode');

exports.listPromos = async (req, res) => {
    try {
        const promos = await PromoCode.find().sort({ createdAt: -1 });
        res.render('admin/promo-codes', { promos });
    } catch (error) {
        console.error('Error fetching promo codes:', error);
        req.flash('error', 'Failed to load promo codes');
        res.redirect('/admin/dashboard');
    }
};

exports.addPromoForm = (req, res) => {
    res.render('admin/add-promo');
};

exports.addPromo = async (req, res) => {
    try {
        const { code, discountType, discountValue, expiryDate, usageLimit } = req.body;
        
        // Validate inputs
        if (!code || !discountType || !discountValue) {
            req.flash('error', 'Missing required fields');
            return res.redirect('/admin/add-promo');
        }

        // Create promo code
        await PromoCode.create({
            code: code.toUpperCase(),
            discountType,
            discountValue: parseFloat(discountValue),
            expiryDate: expiryDate || null,
            usageLimit: parseInt(usageLimit) || 1
        });

        req.flash('success', 'Promo code created successfully');
        res.redirect('/admin/promo-codes');
    } catch (error) {
        console.error('Error creating promo code:', error);
        req.flash('error', error.code === 11000 ? 'Promo code already exists' : 'Failed to create promo code');
        res.redirect('/admin/add-promo');
    }
};

exports.deletePromo = async (req, res) => {
    try {
        const result = await PromoCode.findByIdAndDelete(req.params.id);
        if (!result) {
            req.flash('error', 'Promo code not found');
        } else {
            req.flash('success', 'Promo code deleted successfully');
        }
    } catch (error) {
        console.error('Error deleting promo code:', error);
        req.flash('error', 'Failed to delete promo code');
    }
    res.redirect('/admin/promo-codes');
};