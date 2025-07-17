const cloudinaryErrorCodes = {
    'cdg1::4qsdh': { retryable: true, wait: 5000 },
    'cdg1::twg4r': { retryable: true, wait: 5000 },
    'cdg1::q9rmp': { retryable: true, wait: 3000 }
};

function isCloudinaryError(error) {
    return error?.message?.includes('cdg1::') || 
           error?.error?.includes('cdg1::') || 
           error?.cloudinaryError;
}

function getCloudinaryErrorCode(error) {
    const errorMatch = (error.message || error.error || '').match(/cdg1::\S+/);
    return errorMatch ? errorMatch[0] : null;
}

exports.csrfErrorHandler = (err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        req.flash('error', 'Invalid form submission, please try again');
        return res.redirect('back');
    }
    next(err);
};

exports.globalErrorHandler = (err, req, res, next) => {
    // Basic error info
    const errorDetails = {
        message: err.message,
        type: err.type || err.name,
        code: err.code,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
        requestId: req.id || Date.now().toString(),
        files: req.files ? Object.keys(req.files).join(', ') : undefined
    };

    // Log detailed error information
    console.error('Error details:', errorDetails);

    // Log the full error object for debugging
    console.error('Full error object:', JSON.stringify(err, Object.getOwnPropertyNames(err)));

    const statusCode = err.statusCode || 500;
    let errorMessage = err.message;
    let errorType = 'GENERAL_ERROR';

    // Handle specific error types
    if (err.name === 'MulterError' || err.message?.includes('Failed to upload file')) {
        statusCode = 400;
        errorType = 'UPLOAD_ERROR';
        errorMessage = 'File upload failed. Please ensure your file is not too large and is in a supported format.';
    } else if (isCloudinaryError(err)) {
        const errorCode = getCloudinaryErrorCode(err);
        const errorInfo = cloudinaryErrorCodes[errorCode] || { retryable: true, wait: 5000 };
        
        statusCode = errorInfo.retryable ? 503 : 500;
        errorType = 'CLOUDINARY_ERROR';
        errorMessage = 'Image upload service is temporarily unavailable. Please try again in a few moments.';
        
        // Set retry headers
        if (errorInfo.retryable && !res.headersSent) {
            res.set('Retry-After', Math.ceil(errorInfo.wait / 1000).toString());
        }

        // Check if it's a known error pattern
        if (errorCode.includes('4qsdh') || errorCode.includes('twg4r')) {
            errorMessage = 'The upload service is temporarily unavailable. Please try again in a few moments.';
            // Add retry-after header for better client handling
            if (res && !res.headersSent) {
                res.set('Retry-After', '10');
            }
        } else {
            // Get specific error message or fall back to default
            errorMessage = cloudinaryErrorMessages[err.error_type] || cloudinaryErrorMessages.default;
        }

        // Log specific details for monitoring
        console.error('Cloudinary Upload Error:', {
            errorCode,
            timestamp: new Date().toISOString(),
            requestId: errorDetails.requestId,
            path: req.path
        });

    } else if (process.env.NODE_ENV === 'production') {
        errorMessage = 'Something went wrong! Our team has been notified.';
    }
    
    // Check if request expects JSON
    if (req.accepts('json') && !req.accepts('html')) {
        const response = {
            success: false,
            message: errorMessage,
            type: errorType,
            code: errorDetails.code || 'UNKNOWN',
            requestId: errorDetails.requestId,
            retryable: statusCode === 503,
            retryAfter: res.get('Retry-After'),
            error: process.env.NODE_ENV === 'development' ? {
                stack: err.stack,
                details: errorDetails
            } : undefined
        };

        // For Cloudinary errors, add upload guidance
        if (errorType === 'CLOUDINARY_ERROR') {
            response.suggestions = [
                'Try uploading a smaller image file',
                'Ensure the image is in a common format (JPG, PNG, WebP)',
                'Wait a few moments and try again',
                'If the problem persists, try uploading a different image'
            ];
        }

        return res.status(statusCode).json(response);
    }
    
    res.status(statusCode).render('error', {
        error: errorMessage,
        type: errorType,
        requestId: errorDetails.requestId,
        retryable: statusCode === 503,
        suggestions: errorType === 'CLOUDINARY_ERROR' ? [
            'Try uploading a smaller image file',
            'Ensure the image is in a common format (JPG, PNG, WebP)',
            'Wait a few moments and try again',
            'If the problem persists, try uploading a different image'
        ] : null,
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
