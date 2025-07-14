// System Error Logger - Captures all errors and logs them as notifications
const mongoose = require('mongoose');

let Notification;

// Initialize the notification model
const initializeNotificationModel = () => {
    if (!Notification) {
        try {
            Notification = require('../models/Notification');
        } catch (error) {
            console.error('Failed to load Notification model:', error);
        }
    }
};

// Create error notification
async function createErrorNotification(error, req = null, context = 'Unknown') {
    try {
        initializeNotificationModel();
        
        if (!Notification) {
            console.error('Notification model not available');
            return;
        }

        // Extract error information
        const errorInfo = {
            name: error.name || 'Error',
            message: error.message || 'Unknown error occurred',
            stack: error.stack,
            code: error.code,
            status: error.status || error.statusCode,
            context: context
        };

        // Extract request information if available
        const requestInfo = req ? {
            url: req.originalUrl || req.url,
            method: req.method,
            userAgent: req.get('User-Agent'),
            ip: req.ip || req.connection.remoteAddress,
            userId: req.user ? req.user._id : null,
            sessionId: req.sessionID
        } : {};

        // Determine priority based on error type
        let priority = 'medium';
        if (error.status >= 500 || 
            error.name === 'MongoError' || 
            error.name === 'ValidationError' ||
            error.name === 'CastError' ||
            error.code === 'ECONNREFUSED' ||
            error.code === 'ENOTFOUND') {
            priority = 'high';
        } else if (error.status >= 400 && error.status < 500) {
            priority = 'low';
        }

        // Create notification data
        const notificationData = {
            title: `System Error: ${errorInfo.name}`,
            message: `${errorInfo.message}${requestInfo.url ? ` | URL: ${requestInfo.method} ${requestInfo.url}` : ''}${context !== 'Unknown' ? ` | Context: ${context}` : ''}`,
            type: 'system',
            priority: priority,
            link: null,
            metadata: {
                error: errorInfo,
                request: requestInfo,
                timestamp: new Date().toISOString(),
                source: 'error-logger'
            }
        };

        // Create the notification
        await Notification.createNotification(notificationData);
        console.log(`Error notification created: ${notificationData.title}`);

    } catch (notificationError) {
        console.error('Failed to create error notification:', notificationError.message);
    }
}

// Create system event notification
async function createSystemNotification(title, message, priority = 'low', metadata = {}) {
    try {
        initializeNotificationModel();
        
        if (!Notification) {
            console.error('Notification model not available');
            return;
        }

        const notificationData = {
            title: `System: ${title}`,
            message: message,
            type: 'system',
            priority: priority,
            link: null,
            metadata: {
                ...metadata,
                timestamp: new Date().toISOString(),
                source: 'system-logger'
            }
        };

        await Notification.createNotification(notificationData);
        console.log(`System notification created: ${notificationData.title}`);

    } catch (error) {
        console.error('Failed to create system notification:', error.message);
    }
}

// Express error middleware
const errorNotificationMiddleware = (err, req, res, next) => {
    // Log the error as a notification
    createErrorNotification(err, req, 'Express Middleware').catch(notifErr => {
        console.error('Error notification middleware failed:', notifErr);
    });
    
    // Continue with normal error handling
    next(err);
};

// Database error logger
const logDatabaseError = async (operation, error, collection = null) => {
    const context = `Database ${operation}${collection ? ` on ${collection}` : ''}`;
    await createErrorNotification(error, null, context);
};

// Authentication error logger
const logAuthError = async (type, details, req = null) => {
    const error = new Error(`Authentication failed: ${type} - ${details}`);
    error.name = 'AuthenticationError';
    error.status = 401;
    await createErrorNotification(error, req, 'Authentication');
};

// Performance issue logger
const logPerformanceIssue = async (operation, duration, threshold = 5000) => {
    if (duration > threshold) {
        await createSystemNotification(
            'Performance Warning',
            `Slow operation: ${operation} took ${duration}ms (threshold: ${threshold}ms)`,
            'medium',
            {
                operation,
                duration,
                threshold,
                performanceIssue: true
            }
        );
    }
};

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    
    const error = reason instanceof Error ? reason : new Error(String(reason));
    error.name = 'UnhandledRejection';
    
    createErrorNotification(error, null, 'Unhandled Promise Rejection').catch(notifErr => {
        console.error('Failed to log unhandled rejection:', notifErr);
    });
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    
    createErrorNotification(error, null, 'Uncaught Exception').catch(notifErr => {
        console.error('Failed to log uncaught exception:', notifErr);
    });
    
    // Exit gracefully
    process.exit(1);
});

// MongoDB connection error handler
mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error:', error);
    createErrorNotification(error, null, 'MongoDB Connection').catch(notifErr => {
        console.error('Failed to log MongoDB error:', notifErr);
    });
});

// MongoDB disconnection handler
mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
    createSystemNotification(
        'Database Disconnected',
        'MongoDB connection has been lost',
        'high',
        { event: 'mongodb_disconnected' }
    ).catch(notifErr => {
        console.error('Failed to log MongoDB disconnection:', notifErr);
    });
});

// MongoDB reconnection handler
mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected');
    createSystemNotification(
        'Database Reconnected',
        'MongoDB connection has been restored',
        'medium',
        { event: 'mongodb_reconnected' }
    ).catch(notifErr => {
        console.error('Failed to log MongoDB reconnection:', notifErr);
    });
});

module.exports = {
    errorNotificationMiddleware,
    createErrorNotification,
    createSystemNotification,
    logDatabaseError,
    logAuthError,
    logPerformanceIssue
};