const notificationController = require('../controllers/notificationController');

// Error notification handler middleware
const errorNotificationHandler = (err, req, res, next) => {
    // Create a system notification for the error
    createErrorNotification(err, req).catch(notifErr => {
        console.error('Failed to create error notification:', notifErr);
    });
    
    // Continue with normal error handling
    next(err);
};

async function createErrorNotification(error, req) {
    try {
        const errorInfo = {
            message: error.message || 'Unknown error occurred',
            stack: error.stack,
            url: req ? req.originalUrl : 'Unknown',
            method: req ? req.method : 'Unknown',
            userAgent: req ? req.get('User-Agent') : 'Unknown',
            ip: req ? req.ip : 'Unknown',
            timestamp: new Date().toISOString()
        };

        // Determine error severity
        let priority = 'medium';
        if (error.status >= 500 || error.name === 'MongoError' || error.name === 'ValidationError') {
            priority = 'high';
        } else if (error.status >= 400) {
            priority = 'low';
        }

        // Create notification
        const notificationData = {
            title: `System Error: ${error.name || 'Error'}`,
            message: `${errorInfo.message} | URL: ${errorInfo.url} | Method: ${errorInfo.method}`,
            type: 'system',
            priority: priority,
            link: null,
            metadata: {
                errorType: error.name,
                statusCode: error.status,
                stack: errorInfo.stack,
                url: errorInfo.url,
                method: errorInfo.method,
                userAgent: errorInfo.userAgent,
                ip: errorInfo.ip,
                timestamp: errorInfo.timestamp
            }
        };

        // Use the notification controller to create the notification
        const Notification = require('../models/Notification');
        await Notification.createNotification(notificationData);
        
        console.log('Error notification created:', notificationData.title);
    } catch (notificationError) {
        console.error('Failed to create error notification:', notificationError);
    }
}

// Function to create custom system notifications
async function createSystemNotification(title, message, priority = 'medium', metadata = {}) {
    try {
        const notificationData = {
            title: `System: ${title}`,
            message: message,
            type: 'system',
            priority: priority,
            link: null,
            metadata: {
                ...metadata,
                timestamp: new Date().toISOString(),
                source: 'system'
            }
        };

        const Notification = require('../models/Notification');
        await Notification.createNotification(notificationData);
        
        console.log('System notification created:', notificationData.title);
    } catch (error) {
        console.error('Failed to create system notification:', error);
    }
}

// Function to log database errors
async function logDatabaseError(operation, error, collection = null) {
    try {
        await createSystemNotification(
            'Database Error',
            `Database operation failed: ${operation}${collection ? ` on ${collection}` : ''} - ${error.message}`,
            'high',
            {
                operation,
                collection,
                errorType: error.name,
                errorCode: error.code
            }
        );
    } catch (notifError) {
        console.error('Failed to log database error:', notifError);
    }
}

// Function to log authentication errors
async function logAuthError(type, details, ip = null) {
    try {
        await createSystemNotification(
            'Authentication Error',
            `Authentication failed: ${type} - ${details}`,
            'medium',
            {
                authType: type,
                details,
                ip,
                securityEvent: true
            }
        );
    } catch (error) {
        console.error('Failed to log auth error:', error);
    }
}

// Function to log performance issues
async function logPerformanceIssue(operation, duration, threshold = 5000) {
    if (duration > threshold) {
        try {
            await createSystemNotification(
                'Performance Warning',
                `Slow operation detected: ${operation} took ${duration}ms (threshold: ${threshold}ms)`,
                'medium',
                {
                    operation,
                    duration,
                    threshold,
                    performanceIssue: true
                }
            );
        } catch (error) {
            console.error('Failed to log performance issue:', error);
        }
    }
}

// Function to log system events
async function logSystemEvent(event, details, priority = 'low') {
    try {
        await createSystemNotification(
            event,
            details,
            priority,
            {
                eventType: event,
                systemEvent: true
            }
        );
    } catch (error) {
        console.error('Failed to log system event:', error);
    }
}

module.exports = {
    errorNotificationHandler,
    createSystemNotification,
    logDatabaseError,
    logAuthError,
    logPerformanceIssue,
    logSystemEvent
};