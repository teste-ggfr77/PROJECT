// Test script to generate sample error notifications
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/new-project', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const { createErrorNotification, createSystemNotification } = require('./middleware/systemErrorLogger');

async function generateTestErrorNotifications() {
    try {
        console.log('🔥 Generating test error notifications...');

        // Simulate different types of errors
        const testErrors = [
            {
                error: new Error('Database connection timeout'),
                context: 'MongoDB Connection',
                priority: 'high'
            },
            {
                error: new Error('User authentication failed'),
                context: 'Authentication',
                priority: 'medium'
            },
            {
                error: new Error('File upload failed - disk space full'),
                context: 'File Upload',
                priority: 'high'
            },
            {
                error: new Error('API rate limit exceeded'),
                context: 'External API',
                priority: 'medium'
            },
            {
                error: new Error('Invalid JSON in request body'),
                context: 'Request Parsing',
                priority: 'low'
            }
        ];

        // Create error notifications
        for (const { error, context, priority } of testErrors) {
            error.status = priority === 'high' ? 500 : priority === 'medium' ? 400 : 200;
            await createErrorNotification(error, null, context);
            console.log(`✅ Created error notification: ${error.message}`);
        }

        // Create system event notifications
        const systemEvents = [
            {
                title: 'Database Backup Completed',
                message: 'Daily database backup completed successfully',
                priority: 'low'
            },
            {
                title: 'High Memory Usage Detected',
                message: 'Server memory usage is at 85% - monitoring required',
                priority: 'medium'
            },
            {
                title: 'Security Alert',
                message: 'Multiple failed login attempts detected from IP 192.168.1.100',
                priority: 'high'
            },
            {
                title: 'Cache Cleared',
                message: 'Application cache has been cleared and rebuilt',
                priority: 'low'
            },
            {
                title: 'SSL Certificate Expiring',
                message: 'SSL certificate will expire in 30 days - renewal required',
                priority: 'medium'
            }
        ];

        for (const { title, message, priority } of systemEvents) {
            await createSystemNotification(title, message, priority, {
                testData: true,
                generatedAt: new Date().toISOString()
            });
            console.log(`✅ Created system notification: ${title}`);
        }

        console.log('');
        console.log('🎉 Test error notifications generated successfully!');
        console.log('📱 Check your admin notifications panel to see all the errors');
        console.log('🔍 You should see:');
        console.log('   - 5 error notifications (various priorities)');
        console.log('   - 5 system event notifications');
        console.log('   - All marked as "system" type notifications');
        console.log('');
        console.log('🚀 Your error tracking system is now active!');

    } catch (error) {
        console.error('❌ Error generating test notifications:', error);
    } finally {
        mongoose.connection.close();
    }
}

generateTestErrorNotifications();