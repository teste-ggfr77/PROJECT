exports.csrfErrorHandler = (err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        req.flash('error', 'Invalid form submission, please try again');
        return res.redirect('back');
    }
    next(err);
};

exports.globalErrorHandler = (err, req, res, next) => {
    console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        query: req.query,
        body: req.body,
        files: req.files
    });

    const statusCode = err.statusCode || 500;
    const errorMessage = process.env.NODE_ENV === 'production' 
        ? 'Something went wrong! Our team has been notified.' 
        : err.message;
    
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
