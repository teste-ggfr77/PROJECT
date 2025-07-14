const mongoose = require('mongoose');
const Notification = require('../models/Notification');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nobull-store', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function testNotifications() {
    try {
        console.log('Testing notification system...');

        // Test 1: Create a simple notification
        console.log('\n1. Creating a test notification...');
        const testNotification = await Notification.createNotification({
            title: 'Test Notification',
            message: 'This is a test notification to verify the system is working',
            type: 'system',
            priority: 'medium'
        });
        console.log('✅ Test notification created:', testNotification._id);

        // Test 2: Get all notifications
        console.log('\n2. Fetching all notifications...');
        const allNotifications = await Notification.find().sort({ createdAt: -1 });
        console.log(`✅ Found ${allNotifications.length} notifications`);

        // Test 3: Get unread count
        console.log('\n3. Getting unread count...');
        const unreadCount = await Notification.getUnreadCount();
        console.log(`✅ Unread notifications: ${unreadCount}`);

        // Test 4: Test order notification creation
        console.log('\n4. Testing order notification creation...');
        const mockOrder = {
            _id: new mongoose.Types.ObjectId(),
            customerName: 'Test Customer',
            total: 99.99
        };

        const notificationCtrl = require('../controllers/notificationController');
        await notificationCtrl.createOrderNotification(mockOrder);
        console.log('✅ Order notification created successfully');

        // Test 5: Verify the order notification was created
        console.log('\n5. Verifying order notification...');
        const orderNotifications = await Notification.find({ type: 'order' }).sort({ createdAt: -1 });
        console.log(`✅ Found ${orderNotifications.length} order notifications`);
        if (orderNotifications.length > 0) {
            console.log('Latest order notification:', {
                title: orderNotifications[0].title,
                message: orderNotifications[0].message,
                type: orderNotifications[0].type,
                priority: orderNotifications[0].priority,
                read: orderNotifications[0].read
            });
        }

        // Test 6: Test API endpoint simulation
        console.log('\n6. Testing notification retrieval...');
        const notifications = await Notification.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();
        
        console.log(`✅ Retrieved ${notifications.length} notifications for API`);
        notifications.forEach((notif, index) => {
            console.log(`  ${index + 1}. ${notif.title} (${notif.type}) - ${notif.read ? 'Read' : 'Unread'}`);
        });

        console.log('\n✅ All tests completed successfully!');
        console.log('\nNotification system is working correctly.');

    } catch (error) {
        console.error('❌ Error testing notifications:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        mongoose.connection.close();
    }
}

testNotifications();