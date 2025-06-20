module.exports = (req, res, next) => {
    if (!req.session) {
        console.error('No session found');
        return res.redirect('/admin/login');
    }
    
    if (!req.session.user) {
        console.log('No user in session');
        return res.redirect('/admin/login');
    }

    if (!req.session.isAdmin) {
        console.log('User is not an admin');
        return res.redirect('/admin/login');
    }

    next();
};