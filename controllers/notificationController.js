const Notification = require('../models/Notification');

// Get all notifications
exports.getNotifications = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const notifications = await Notification.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const unreadCount = await Notification.getUnreadCount();

        res.json({
            success: true,
            notifications,
            unreadCount,
            pagination: {
                page,
                limit,
                total: await Notification.countDocuments()
            }
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching notifications',
            error: error.message
        });
    }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        
        const notification = await Notification.findByIdAndUpdate(
            id,
            { read: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.json({
            success: true,
            message: 'Notification marked as read',
            notification
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Error marking notification as read',
            error: error.message
        });
    }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
    try {
        const result = await Notification.markAllAsRead();
        
        res.json({
            success: true,
            message: 'All notifications marked as read',
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            message: 'Error marking all notifications as read',
            error: error.message
        });
    }
};

// Create new notification
exports.createNotification = async (req, res) => {
    try {
        const { title, message, type, link, priority, relatedId, relatedModel } = req.body;

        const notification = await Notification.createNotification({
            title,
            message,
            type,
            link,
            priority,
            relatedId,
            relatedModel
        });

        res.status(201).json({
            success: true,
            message: 'Notification created successfully',
            notification
        });
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating notification',
            error: error.message
        });
    }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        
        const notification = await Notification.findByIdAndDelete(id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.json({
            success: true,
            message: 'Notification deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting notification',
            error: error.message
        });
    }
};

// Get notification statistics
exports.getStats = async (req, res) => {
    try {
        const stats = await Notification.aggregate([
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                    unread: {
                        $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] }
                    }
                }
            }
        ]);

        const totalCount = await Notification.countDocuments();
        const unreadCount = await Notification.getUnreadCount();

        res.json({
            success: true,
            stats: {
                total: totalCount,
                unread: unreadCount,
                byType: stats
            }
        });
    } catch (error) {
        console.error('Error fetching notification stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching notification stats',
            error: error.message
        });
    }
};

// Helper function to create notifications for common events
exports.createOrderNotification = async (order) => {
    try {
        await Notification.createNotification({
            title: 'New Order Received',
            message: `Order #${order._id} has been placed by ${order.customerName}`,
            type: 'order',
            link: `/admin/view-orders/${order._id}`,
            priority: 'high',
            relatedId: order._id,
            relatedModel: 'Order'
        });
        console.log('Order notification created successfully for order:', order._id);
    } catch (error) {
        console.error('Error creating order notification:', error);
        throw error; // Re-throw to see the actual error
    }
};

exports.createUserNotification = async (user) => {
    try {
        await Notification.createNotification({
            title: 'New User Registration',
            message: `${user.name} (${user.email}) has registered`,
            type: 'user',
            link: `/admin/users/${user._id}`,
            priority: 'medium',
            relatedId: user._id,
            relatedModel: 'User'
        });
    } catch (error) {
        console.error('Error creating user notification:', error);
    }
};

exports.createContactNotification = async (contact) => {
    try {
        await Notification.createNotification({
            title: 'New Contact Message',
            message: `${contact.name} sent a message: ${contact.subject}`,
            type: 'message',
            link: `/admin/contacts`,
            priority: 'medium',
            relatedId: contact._id,
            relatedModel: 'Contact'
        });
    } catch (error) {
        console.error('Error creating contact notification:', error);
    }
};

exports.createProductNotification = async (product, action = 'created') => {
    try {
        await Notification.createNotification({
            title: `Product ${action}`,
            message: `Product "${product.name}" has been ${action}`,
            type: 'product',
            link: `/admin/edit-product/${product._id}`,
            priority: 'low',
            relatedId: product._id,
            relatedModel: 'Product'
        });
    } catch (error) {
        console.error('Error creating product notification:', error);
    }
};