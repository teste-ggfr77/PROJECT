// Simple diagnostic script to identify Vercel deployment issues
const express = require('express');
const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get('/', (req, res) => {
    res.json({
        message: 'Server is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 3000
    });
});

// Test database connection
app.get('/test-db', async (req, res) => {
    try {
        const mongoose = require('mongoose');
        
        if (mongoose.connection.readyState === 1) {
            res.json({ 
                status: 'Database connected',
                readyState: mongoose.connection.readyState 
            });
        } else {
            // Try to connect
            await mongoose.connect(process.env.MONGO_URI);
            res.json({ 
                status: 'Database connection successful',
                readyState: mongoose.connection.readyState 
            });
        }
    } catch (error) {
        res.status(500).json({ 
            status: 'Database connection failed',
            error: error.message 
        });
    }
});

// Test environment variables
app.get('/test-env', (req, res) => {
    const envVars = {
        MONGO_URI: process.env.MONGO_URI ? 'Set' : 'Missing',
        SESSION_SECRET: process.env.SESSION_SECRET ? 'Set' : 'Missing',
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Missing',
        EMAIL_USER: process.env.EMAIL_USER ? 'Set' : 'Missing',
        NODE_ENV: process.env.NODE_ENV || 'Not set'
    };
    
    res.json({
        message: 'Environment variables check',
        variables: envVars
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.path,
        method: req.method
    });
});

const PORT = process.env.PORT || 3000;

// For Vercel, we need to export the app
module.exports = app;

// For local testing
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Diagnostic server running on port ${PORT}`);
    });
}