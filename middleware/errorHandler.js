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
        statusCode = 503; // Service Unavailable
        errorType = 'CLOUDINARY_ERROR';
        
        // Extract specific Cloudinary error code
        const errorCode = cloudinaryError[0].split('::')[1];
        
        // Map specific Cloudinary error codes to user-friendly messages
        const cloudinaryErrorMessages = {
            'rate_limit_reached': 'Upload service is temporarily busy. Please try again in a few moments.',
            'upload_failed': 'Image upload failed. Please try again.',
            'invalid_image': 'The image file appears to be corrupted or in an unsupported format.',
            'file_size_too_large': 'The image file is too large. Please choose a smaller file.',
            'default': 'There was a problem processing your image. Please try again.'
        };

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
            code: err.code || 'UNKNOWN',
            requestId: errorDetails.requestId,
            retryable: statusCode === 503, // Indicate if the error is temporary
            retryAfter: res.get('Retry-After'), // Include retry timing if set
            error: process.env.NODE_ENV !== 'production' ? {
                stack: err.stack,
                cloudinaryError: errorDetails.cloudinaryError,
                originalError: err.originalError?.message
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
