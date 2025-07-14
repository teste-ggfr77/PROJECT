const mongoose = require('mongoose');
const Notification = require('../models/Notification');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nobull-store', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function createSampleNotifications() {
    try {
        console.log('Creating sample notifications...');

        const sampleNotifications = [
            {
                title: 'New Order Received',
                message: 'Order #12345 has been placed by John Doe',
                type: 'order',
                link: '/admin/view-orders/12345',
                priority: 'high'
            },
            {
                title: 'New User Registration',
                message: 'Jane Smith (jane@example.com) has registered',
                type: 'user',
                link: '/admin/users/67890',
                priority: 'medium'
            },
            {
                title: 'New Contact Message',
                message: 'Mike Johnson sent a message: Product Inquiry',
                type: 'message',
                link: '/admin/contacts',
                priority: 'medium'
            },
            {
                title: 'Product Created',
                message: 'Product "Premium Running Shoes" has been created',
                type: 'product',
                link: '/admin/edit-product/54321',
                priority: 'low'
            },
            {
                title: 'System Update',
                message: 'Admin notification system has been successfully implemented',
                type: 'system',
                priority: 'medium'
            }
        ];

        // Clear existing notifications
        await Notification.deleteMany({});
        console.log('Cleared existing notifications');

        // Create new notifications
        for (const notificationData of sampleNotifications) {
            await Notification.createNotification(notificationData);
            console.log(`Created notification: ${notificationData.title}`);
        }

        console.log('Sample notifications created successfully!');
        
        // Display stats
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

        console.log('\nNotification Statistics:');
        console.log('Total notifications:', await Notification.countDocuments());
        console.log('Unread notifications:', await Notification.getUnreadCount());
        console.log('By type:', stats);

    } catch (error) {
        console.error('Error creating sample notifications:', error);
    } finally {
        mongoose.connection.close();
    }
}

createSampleNotifications();