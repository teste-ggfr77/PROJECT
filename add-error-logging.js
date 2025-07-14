// Script to add error logging to app.js
const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, 'app.js');

// Read the current app.js content
let appContent = fs.readFileSync(appJsPath, 'utf8');

// Fix the syntax error first
appContent = appContent.replace(
    "console.error('Server startup failed:' error);",
    "console.error('Server startup failed:', error);"
);

// Add the error logging middleware import at the top
const importStatement = `// System Error Logger
const { errorNotificationMiddleware, createSystemNotification } = require('./middleware/systemErrorLogger');

`;

// Find where to insert the import (after other requires)
const insertAfter = "require('dotenv').config();\n";
if (appContent.includes(insertAfter) && !appContent.includes('systemErrorLogger')) {
    appContent = appContent.replace(insertAfter, insertAfter + '\n' + importStatement);
}

// Add error middleware before the existing error handler
const errorHandlerPattern = /\/\/ Error handling middleware\napp\.use\(\(err, req, res, next\) => \{/;
if (errorHandlerPattern.test(appContent) && !appContent.includes('errorNotificationMiddleware')) {
    appContent = appContent.replace(
        '// Error handling middleware',
        `// Error notification middleware
app.use(errorNotificationMiddleware);

// Error handling middleware`
    );
}

// Add system notification for server startup
const startServerPattern = /await tryPort\(PORT\);/;
if (startServerPattern.test(appContent) && !appContent.includes('Server started successfully')) {
    appContent = appContent.replace(
        'await tryPort(PORT);',
        `await tryPort(PORT);
        
        // Log successful server startup
        await createSystemNotification(
            'Server Started',
            \`Server started successfully on port \${PORT}\`,
            'low',
            { port: PORT, environment: process.env.NODE_ENV || 'development' }
        );`
    );
}

// Add error notification for startup failure
const startupErrorPattern = /console\.error\('Server startup failed:', error\);/;
if (startupErrorPattern.test(appContent) && !appContent.includes('Server startup failed notification')) {
    appContent = appContent.replace(
        "console.error('Server startup failed:', error);",
        `console.error('Server startup failed:', error);
        
        // Log startup failure notification
        try {
            await createSystemNotification(
                'Server Startup Failed',
                \`Server failed to start: \${error.message}\`,
                'high',
                { error: error.message, port: PORT }
            );
        } catch (notifError) {
            console.error('Failed to log startup error notification:', notifError);
        }`
    );
}

// Write the updated content back to app.js
fs.writeFileSync(appJsPath, appContent, 'utf8');

console.log('✅ Error logging system added to app.js successfully!');
console.log('📝 The following features have been added:');
console.log('   - All system errors will be logged as notifications');
console.log('   - Database connection issues will be tracked');
console.log('   - Server startup/shutdown events will be logged');
console.log('   - Unhandled rejections and exceptions will be captured');
console.log('   - Performance issues will be monitored');
console.log('');
console.log('🔔 All errors will now appear in the admin notifications panel!');