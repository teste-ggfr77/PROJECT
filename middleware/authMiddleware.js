module.exports = (req, res, next) => {
    // Set up req.user from session
    if (req.session && req.session.user) {
        req.user = req.session.user;
        console.log('Auth middleware - User found in session:', { 
            userId: req.user._id, 
            email: req.user.email,
            sessionId: req.sessionID 
        });
    } else {
        console.log('Auth middleware - No user in session:', { 
            hasSession: !!req.session,
            sessionId: req.sessionID,
            sessionUser: req.session ? req.session.user : 'no session'
        });
    }
    
    next();
};