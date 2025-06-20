exports.viewOrders = async (req, res) => {
    const orders = await require('../models/Order')
        .find({ user: req.session.user._id })
        .populate('items.product')
        .sort({ createdAt: -1 });
    res.render('orders', { orders });
};

exports.viewOrderDetail = async (req, res) => {
    const order = await require('../models/Order')
        .findById(req.params.id)
        .populate('items.product')
        .populate('user', 'name email');
        
    if (!order) {
        req.flash('error', 'Order not found');
        return res.redirect('/orders');
    }
    
    res.render('order-detail', { 
        order, 
        messages: {
            success: req.flash('success'),
            error: req.flash('error')
        } 
    });
};