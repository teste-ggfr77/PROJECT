exports.csrfErrorHandler = (err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        req.flash('error', 'Invalid form submission, please try again');
        return res.redirect('back');
    }
    next(err);
};

exports.globalErrorHandler = (err, req, res, next) => {
    console.error(err.stack);
    const statusCode = err.statusCode || 500;
    const errorMessage = process.env.NODE_ENV === 'production' 
        ? 'Something went wrong!' 
        : err.message;
    
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
