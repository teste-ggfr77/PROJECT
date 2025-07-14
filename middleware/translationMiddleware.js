const fs = require('fs');
const path = require('path');

// Cache for translations
const translationCache = {};

// Load translation file
function loadTranslation(language) {
    if (translationCache[language]) {
        return translationCache[language];
    }
    
    try {
        const filePath = path.join(__dirname, '..', 'translations', `${language}.json`);
        const data = fs.readFileSync(filePath, 'utf8');
        translationCache[language] = JSON.parse(data);
        return translationCache[language];
    } catch (error) {
        console.error(`Error loading translation for ${language}:`, error);
        // Fallback to English
        if (language !== 'en') {
            return loadTranslation('en');
        }
        return {};
    }
}

// Get nested translation value
function getTranslation(translations, key) {
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            return key; // Return key if translation not found
        }
    }
    
    return value;
}

// Translation helper function
function t(key, replacements = {}) {
    const language = this.language || 'en';
    const translations = loadTranslation(language);
    let translation = getTranslation(translations, key);
    
    // Handle replacements like {count}
    if (typeof translation === 'string' && Object.keys(replacements).length > 0) {
        Object.keys(replacements).forEach(placeholder => {
            const regex = new RegExp(`{${placeholder}}`, 'g');
            translation = translation.replace(regex, replacements[placeholder]);
        });
    }
    
    return translation;
}

// Middleware function
module.exports = (req, res, next) => {
    // Determine language from various sources
    let language = 'en'; // default
    
    // 1. Check query parameter (for immediate language switching)
    if (req.query.lang && ['en', 'fr', 'ar'].includes(req.query.lang)) {
        language = req.query.lang;
        // Save to session
        req.session.language = language;
    }
    // 2. Check session
    else if (req.session && req.session.language) {
        language = req.session.language;
    }
    // 3. Check user preference
    else if (req.user && req.user.preferredLanguage) {
        language = req.user.preferredLanguage;
        // Save to session for consistency
        req.session.language = language;
    }
    // 4. Check Accept-Language header
    else if (req.headers['accept-language']) {
        const acceptedLanguages = req.headers['accept-language'].split(',');
        for (const lang of acceptedLanguages) {
            const langCode = lang.split(';')[0].split('-')[0].toLowerCase();
            if (['fr', 'ar', 'en'].includes(langCode)) {
                language = langCode;
                break;
            }
        }
    }
    
    // Set language in response locals
    res.locals.language = language;
    res.locals.isRTL = language === 'ar'; // Right-to-left for Arabic
    
    // Load translations
    const translations = loadTranslation(language);
    res.locals.translations = translations;
    
    // Add translation function to locals
    res.locals.t = t.bind({ language });
    res.locals.__ = t.bind({ language }); // Add __ as alias for t
    
    // Add translation function to request for controllers
    req.t = t.bind({ language });
    req.__ = t.bind({ language }); // Add __ as alias for t
    
    // Debug logging
    if (req.url === '/' || req.url.includes('lang=')) {
        console.log('Translation middleware - URL:', req.url, 'Language:', language, 'Session:', req.session?.language);
    }
    
    next();
};