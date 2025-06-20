module.exports = (req, res, next) => {
    // Set up req.user from session
    if (req.session && req.session.user) {
        req.user = req.session.user;
    }
    
    next();
};