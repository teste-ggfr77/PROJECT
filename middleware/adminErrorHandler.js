// Admin route error handler
exports.handleAdminError = (err, req, res, next) => {
    console.error('Admin Error:', err);
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message);
        req.flash('error', messages.join(', '));
        return res.redirect('back');
    }
    
    // Handle file upload errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        req.flash('error', 'File size is too large. Maximum size is 5MB');
        return res.redirect('back');
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        req.flash('error', 'Unexpected file upload');
        return res.redirect('back');
    }
    
    // Handle database errors
    if (err.name === 'MongoError' || err.name === 'MongoServerError') {
        req.flash('error', 'Database error occurred');
        return res.redirect('back');
    }    // Handle CSRF errors
    if (err.code === 'EBADCSRFTOKEN') {
        console.error('CSRF Error:', {
            url: req.originalUrl,
            method: req.method,
            headers: req.headers,
            body: req.body,
            session: req.session ? 'exists' : 'missing',
            csrfToken: req.body._csrf || 'missing'
        });
        
        req.session.csrfError = 'Security validation failed. Please try again.';
        const returnUrl = req.header('Referer') || '/admin/dashboard';
        return res.redirect(returnUrl);
    }
    
    // Default error handler
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('back');
};
