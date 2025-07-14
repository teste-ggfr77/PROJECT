const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['order', 'user', 'message', 'product', 'system'],
        default: 'system'
    },
    link: {
        type: String,
        default: null
    },
    read: {
        type: Boolean,
        default: false
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    relatedId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    relatedModel: {
        type: String,
        default: null
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

// Index for efficient queries
notificationSchema.index({ read: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ priority: 1, createdAt: -1 });

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
    try {
        const notification = new this(data);
        await notification.save();
        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function() {
    try {
        return await this.countDocuments({ read: false });
    } catch (error) {
        console.error('Error getting unread count:', error);
        return 0;
    }
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = async function() {
    try {
        return await this.updateMany({ read: false }, { read: true });
    } catch (error) {
        console.error('Error marking all as read:', error);
        throw error;
    }
};

// Static method to get error notifications
notificationSchema.statics.getErrorNotifications = async function(limit = 50) {
    try {
        return await this.find({ 
            type: 'system',
            $or: [
                { 'metadata.source': 'error-logger' },
                { title: { $regex: /error|failed|exception/i } }
            ]
        })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    } catch (error) {
        console.error('Error getting error notifications:', error);
        return [];
    }
};

// Static method to clean old notifications
notificationSchema.statics.cleanOldNotifications = async function(daysOld = 30) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        
        const result = await this.deleteMany({
            createdAt: { $lt: cutoffDate },
            read: true
        });
        
        console.log(`Cleaned ${result.deletedCount} old notifications`);
        return result;
    } catch (error) {
        console.error('Error cleaning old notifications:', error);
        throw error;
    }
};

module.exports = mongoose.model('Notification', notificationSchema);