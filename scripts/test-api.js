const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nobull-store', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function testAPI() {
    try {
        console.log('Testing notification API...');

        // Import the controller
        const notificationCtrl = require('../controllers/notificationController');
        const Notification = require('../models/Notification');

        // Mock request and response objects
        const mockReq = {
            query: { page: 1, limit: 20 }
        };

        const mockRes = {
            json: function(data) {
                console.log('API Response:', JSON.stringify(data, null, 2));
            },
            status: function(code) {
                console.log('Status Code:', code);
                return this;
            }
        };

        console.log('\n1. Testing getNotifications API...');
        await notificationCtrl.getNotifications(mockReq, mockRes);

        console.log('\n2. Testing getStats API...');
        await notificationCtrl.getStats(mockReq, mockRes);

        console.log('\n3. Direct database query...');
        const notifications = await Notification.find().sort({ createdAt: -1 }).limit(5);
        console.log('Direct DB query result:');
        notifications.forEach(notif => {
            console.log(`- ${notif.title} (${notif.type}) - ${notif.read ? 'Read' : 'Unread'}`);
            console.log(`  ID: ${notif._id}`);
            console.log(`  Created: ${notif.createdAt}`);
        });

    } catch (error) {
        console.error('Error testing API:', error);
    } finally {
        mongoose.connection.close();
    }
}

testAPI();