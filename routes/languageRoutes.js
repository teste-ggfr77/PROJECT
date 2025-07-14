const express = require('express');
const router = express.Router();

// Set language preference
router.post('/set', (req, res) => {
    const { language } = req.body;
    
    // Validate language
    const supportedLanguages = ['fr', 'ar', 'en'];
    if (!supportedLanguages.includes(language)) {
        return res.status(400).json({ error: 'Unsupported language' });
    }
    
    // Store language preference in session
    req.session.language = language;
    
    // If user is logged in, save to user profile
    if (req.user) {
        req.user.preferredLanguage = language;
        req.user.save().catch(err => console.error('Error saving user language:', err));
    }
    
    console.log('Language set to:', language, 'Session ID:', req.sessionID);
    res.json({ success: true, language });
});

// Get current language preference
router.get('/current', (req, res) => {
    let language = 'en'; // default
    
    // Check session first
    if (req.session.language) {
        language = req.session.language;
    }
    // Then check user preference
    else if (req.user && req.user.preferredLanguage) {
        language = req.user.preferredLanguage;
    }
    
    res.json({ language });
});

module.exports = router;