exports.csrfErrorHandler = (err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        req.flash('error', 'Invalid form submission, please try again');
        return res.redirect('back');
    }
    next(err);
};

exports.globalErrorHandler = (err, req, res, next) => {
    // Log detailed error information
    console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        query: req.query,
        body: req.body,
        files: req.files,
        type: err.type || err.name,
        code: err.code
    });

    const statusCode = err.statusCode || 500;
    let errorMessage = err.message;

    // Handle specific error types
    if (err.name === 'MulterError' || err.message.includes('Failed to upload file')) {
        statusCode = 400;
        errorMessage = 'File upload failed. Please ensure your file is not too large and is in a supported format.';
    } else if (process.env.NODE_ENV === 'production') {
        errorMessage = 'Something went wrong! Our team has been notified.';
    }
    
    // Check if request expects JSON
    if (req.accepts('json') && !req.accepts('html')) {
        return res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: process.env.NODE_ENV !== 'production' ? err.stack : undefined
        });
    }
    
    res.status(statusCode).render('error', {
        error: errorMessage,
        details: process.env.NODE_ENV !== 'production' ? err.stack : null
    });
};

exports.notFoundHandler = (req, res) => {
    res.status(404).render('error', {
        error: 'Page not found',
        details: null
    });
};
