const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const cloudinary = require('./config/cloudinary.config');
const path = require('path');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const csrf = require('csurf');
require('dotenv').config();

const app = express();

// Connect to MongoDB
connectDB();

// Basic middleware
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Parse cookies and enable cookie-parser
const cookieParser = require('cookie-parser');
app.use(cookieParser(process.env.SESSION_SECRET || 'your-secret-key'));

// Session setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.DATABASE_URL }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        secure: process.env.NODE_ENV === 'production'
    }
}));

// Auth middleware to set up req.user from session
const authMiddleware = require('./middleware/authMiddleware');
app.use(authMiddleware);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Flash messages
app.use(flash());

// Setup CSRF protection with proper configuration
const csrfProtection = csrf({
    cookie: true,
    sessionKey: 'session'
});

// CSRF Middleware with multipart form handling
app.use((req, res, next) => {
    // Skip CSRF for multipart form data
    if (req.headers['content-type']?.startsWith('multipart/form-data')) {
        return next();
    }
    
    // Skip CSRF for newsletter routes (public API)
    if (req.path.startsWith('/newsletter/')) {
        console.log('Skipping CSRF for newsletter route:', req.path);
        return next();
    }
    
    // Temporarily skip CSRF for cart routes to debug
    if (req.path.startsWith('/cart/')) {
        console.log('Skipping CSRF for cart route:', req.path);
        return next();
    }
    
    csrfProtection(req, res, next);
});

// Global variables and CSRF token
app.use((req, res, next) => {
    // Flash messages
    res.locals.messages = {
        success: req.flash('success'),
        error: req.flash('error')
    };
    
    // User info
    res.locals.user = req.user;
    
    // Generate CSRF token for non-multipart requests
    if (!req.headers['content-type']?.startsWith('multipart/form-data')) {
        try {
            res.locals.csrfToken = req.csrfToken();
        } catch (err) {
            console.warn('Could not generate CSRF token:', err.message);
        }
    }
    
    next();
});

// Single CSRF error handler
app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        console.error('CSRF Error:', {
            url: req.originalUrl,
            method: req.method,
            contentType: req.headers['content-type'],
            accept: req.headers.accept,
            body: req.is('multipart/form-data') ? 'multipart form data' : req.body
        });
        
        // Handle AJAX requests differently
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(403).json({ 
                error: 'Security validation failed. Please refresh the page and try again.',
                code: 'CSRF_ERROR'
            });
        }
        
        // Store error in flash and redirect for regular requests
        req.flash('error', 'Security validation failed. Please try again.');
        const returnUrl = req.header('Referer') || '/admin/dashboard';
        return res.redirect(returnUrl);
    }
    next(err);
});

// Passport config
const User = require('./models/User');
passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return done(null, false, { message: 'Invalid credentials' });
        }
        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

// Set user in res.locals for all views and load global data
app.use(async (req, res, next) => {
    res.locals.user = req.user || null;
    
    // Load social media links for footer
    try {
        const SocialMedia = require('./models/SocialMedia');
        res.locals.socialMediaLinks = await SocialMedia.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
    } catch (error) {
        console.error('Error loading social media links:', error);
        res.locals.socialMediaLinks = [];
    }
    
    next();
});

// Debug middleware to track request flow
app.use((req, res, next) => {
    console.log('Incoming request:', {
        method: req.method,
        url: req.url,
        sessionId: req.sessionID
    });
    next();
});

// Import routes
const mainRoutes = require('./routes/mainRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const contactRoutes = require('./routes/contactRoutes');
const profileRoutes = require('./routes/profileRoutes');
const newsletterRoutes = require('./routes/newsletterRoutes');
const communityRoutes = require('./routes/communityRoutes');

// Use routes (removing duplicate admin routes)
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/cart', cartRoutes);
app.use('/orders', orderRoutes);
app.use('/contact', contactRoutes);
app.use('/profile', profileRoutes);
app.use('/newsletter', newsletterRoutes);
app.use('/community', communityRoutes);
app.use('/', mainRoutes); // Main routes last to avoid conflicts

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', {
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// 404 handler
app.use((req, res) => {
    console.warn('404 Not Found:', req.method, req.originalUrl);
    res.status(404).render('error', {
        message: 'Page not found',
        error: { status: 404 }
    });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 3000;
const MAX_PORT_ATTEMPTS = 10;
const MAX_PORT = 65535;

const tryPort = (port, attempts = 0) => {
    return new Promise((resolve, reject) => {
        // Validate port number
        port = parseInt(port, 10);
        if (isNaN(port) || port < 0 || port >= MAX_PORT) {
            return reject(new Error(`Invalid port number: ${port}`));
        }

        if (attempts >= MAX_PORT_ATTEMPTS) {
            return reject(new Error(`Could not find an available port after ${MAX_PORT_ATTEMPTS} attempts`));
        }

        const server = app.listen(port)
            .on('listening', () => {
                console.log(`Server is running on port ${port}`);
                resolve(server);
            })
            .on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.log(`Port ${port} is busy, trying ${port + 1}...`);
                    server.close(() => {
                        // Try the next port, ensuring it's within valid range
                        const nextPort = Math.min(port + 1, MAX_PORT);
                        if (nextPort === MAX_PORT) {
                            reject(new Error('No available ports found in valid range'));
                            return;
                        }
                        tryPort(nextPort, attempts + 1)
                            .then(resolve)
                            .catch(reject);
                    });
                } else {
                    reject(err);
                }
            });
    });
};

const startServer = async () => {
    try {
        await connectDB();
        console.log('MongoDB connected successfully');
        
        await tryPort(PORT);
    } catch (error) {
        console.error('Server startup failed:', error);
        process.exit(1);
    }
};

startServer();