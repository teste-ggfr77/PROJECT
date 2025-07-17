exports.csrfErrorHandler = (err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        req.flash('error', 'Invalid form submission, please try again');
        return res.redirect('back');
    }
    next(err);
};

exports.globalErrorHandler = (err, req, res, next) => {
    // Initialize basic error response
    const errorResponse = {
        success: false,
        message: 'An error occurred',
        requestId: req.id || Date.now().toString(),
        timestamp: new Date().toISOString()
    };

    // Check for Cloudinary errors first
    const isCloudinaryError = err.message?.includes('cdg1::') || 
                             err.error?.includes('cdg1::') || 
                             err.stack?.includes('cdg1::');

    if (isCloudinaryError) {
        // Set temporary error status
        errorResponse.status = 503;
        errorResponse.retryable = true;
        errorResponse.retryAfter = 5;
        
        // Set appropriate headers
        res.set('Retry-After', '5');
        
        errorResponse.message = 'Image upload service temporarily unavailable. Please try again in a few moments.';
        errorResponse.suggestions = [
            'Wait 5 seconds and try again',
            'Ensure your image is less than 5MB',
            'Try a different image if the problem persists'
        ];

        // Log the error for monitoring
        console.error('Cloudinary Upload Error:', {
            originalError: err.message,
            timestamp: errorResponse.timestamp,
            requestId: errorResponse.requestId,
            path: req.path
        });

        // Send JSON response for API requests
        if (req.accepts('json')) {
            return res.status(503).json(errorResponse);
        }

        // Render error page for browser requests
        return res.status(503).render('error', {
            error: errorResponse.message,
            suggestions: errorResponse.suggestions,
            requestId: errorResponse.requestId
        });
    }

    // Handle file upload errors
    if (err.name === 'MulterError' || err.message?.includes('Failed to upload')) {
        errorResponse.status = 400;
        errorResponse.message = 'File upload failed. Please check file size and format.';
        errorResponse.suggestions = [
            'Maximum file size is 5MB',
            'Supported formats: JPG, PNG, WebP'
        ];

        if (req.accepts('json')) {
            return res.status(400).json(errorResponse);
        }
        return res.status(400).render('error', {
            error: errorResponse.message,
            suggestions: errorResponse.suggestions
        });
    }

    // Handle all other errors
    errorResponse.status = err.status || 500;
    errorResponse.message = process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred. Please try again.'
        : err.message;

    // Log error for non-cloudinary errors
    console.error('Application Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        timestamp: errorResponse.timestamp,
        requestId: errorResponse.requestId
    });

    if (req.accepts('json')) {
        return res.status(errorResponse.status).json(errorResponse);
    }

    res.status(errorResponse.status).render('error', {
        error: errorResponse.message,
        requestId: errorResponse.requestId
    });
};

exports.notFoundHandler = (req, res) => {
    res.status(404).render('error', {
        error: 'Page not found',
        details: null
    });
};
