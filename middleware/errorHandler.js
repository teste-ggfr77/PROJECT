exports.csrfErrorHandler = (err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        req.flash('error', 'Invalid form submission, please try again');
        return res.redirect('back');
    }
    next(err);
};

exports.globalErrorHandler = (err, req, res, next) => {
    // Extract Cloudinary specific error details if present
    const cloudinaryError = err.error?.match?.(/cdg1::\S+/) || err.message?.match?.(/cdg1::\S+/);
    const errorDetails = {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        query: req.query,
        body: req.body,
        files: req.files ? Object.keys(req.files).join(', ') : undefined,
        type: err.type || err.name,
        code: err.code,
        cloudinaryError: cloudinaryError ? cloudinaryError[0] : undefined,
        originalError: err.originalError || err,
        requestId: err.http?.headers?.['x-request-id'] || req.id,
        timestamp: new Date().toISOString()
    };

    // Log detailed error information
    console.error('Error details:', errorDetails);

    // Log the full error object for debugging
    console.error('Full error object:', JSON.stringify(err, Object.getOwnPropertyNames(err)));

    const statusCode = err.statusCode || 500;
    let errorMessage = err.message;
    let errorType = 'GENERAL_ERROR';

    // Handle specific error types
    if (err.name === 'MulterError' || err.message.includes('Failed to upload file')) {
        statusCode = 400;
        errorType = 'UPLOAD_ERROR';
        errorMessage = 'File upload failed. Please ensure your file is not too large and is in a supported format.';
    } else if (cloudinaryError) {
        statusCode = 500;
        errorType = 'CLOUDINARY_ERROR';
        errorMessage = process.env.NODE_ENV === 'production' 
            ? 'Image processing failed. Please try again or contact support if the problem persists.'
            : `Cloudinary error: ${err.message}`;
    } else if (process.env.NODE_ENV === 'production') {
        errorMessage = 'Something went wrong! Our team has been notified.';
    }
    
    // Check if request expects JSON
    if (req.accepts('json') && !req.accepts('html')) {
        return res.status(statusCode).json({
            success: false,
            message: errorMessage,
            type: errorType,
            code: err.code || 'UNKNOWN',
            requestId: errorDetails.requestId,
            error: process.env.NODE_ENV !== 'production' ? {
                stack: err.stack,
                cloudinaryError: errorDetails.cloudinaryError,
                originalError: err.originalError?.message
            } : undefined
        });
    }
    
    res.status(statusCode).render('error', {
        error: errorMessage,
        type: errorType,
        requestId: errorDetails.requestId,
        details: process.env.NODE_ENV !== 'production' ? {
            stack: err.stack,
            cloudinaryError: errorDetails.cloudinaryError
        } : null
    });
};

exports.notFoundHandler = (req, res) => {
    res.status(404).render('error', {
        error: 'Page not found',
        details: null
    });
};
