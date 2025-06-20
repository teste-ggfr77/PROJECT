const mongoose = require('mongoose');

const featuredItemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    image: String,
    category: String,
    ctaText: String,
    ctaLink: String
}, { _id: false });

// Call this when the module loads to ensure indexes are correct
async function setupIndexes() {
    if (mongoose.connection.readyState === 1) {
        try {
            const collection = mongoose.connection.collection('pagecontents');
            // Drop all indexes first
            await collection.dropIndexes();
            // Create only the indexes we need
            await mongoose.model('PageContent').createIndexes();
            console.log('PageContent indexes updated successfully');
        } catch (error) {
            console.error('Error setting up indexes:', error);
        }
    }
}

const pageContentSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: [
            'hero',
            'event',
            'promotion',
            'featured',
            'banner',
            'testimonial',
            'product-showcase',
            'newsletter',
            'category-grid',
            'cta-section',
            'info-cards',
            'video-section',
            'landing-hero',
            'steps-section',
            'reviews-section',
            'shop-section',
            'community'
        ]
    },
    title: {
        type: String,
        required: true
    },
    subtitle: String,
    description: String,
    image: String,
    additionalImages: [String], // For carousel or grid layouts
    videoUrl: String, // For video sections
    buttonText: String,
    buttonLink: String,
    backgroundColor: String,
    textColor: String,
    customClass: String,
    layout: String,
    animation: String,
    spacing: {
        paddingTop: String,
        paddingBottom: String,
        marginTop: String,
        marginBottom: String
    },
    responsive: {
        hideOnMobile: Boolean,
        hideOnTablet: Boolean,
        hideOnDesktop: Boolean
    },
    isActive: {
        type: Boolean,
        default: true
    },
    order: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    // Promotion-specific fields
    promotionStartDate: {
        type: Date,
        required: function() { return this.type === 'promotion'; }
    },
    promotionEndDate: {
        type: Date,
        required: function() { return this.type === 'promotion'; }
    },
    promotionType: {
        type: String,
        enum: ['default', 'urgent', 'special', 'seasonal', 'flash'],
        default: 'default'
    },
    showCountdown: {
        type: Boolean,
        default: false
    },
    isUrgent: {
        type: Boolean,
        default: false
    },
    items: [featuredItemSchema],
    theme: {
        type: String,
        enum: ['light', 'dark'],
        default: 'dark'
    },
    layout: {
        type: String,
        enum: ['contained', 'full-width', 'grid'],
        default: 'contained'
    },
    // Community-specific fields
    instagram: String,
    posts: String, // JSON string containing community posts data
    // Product showcase specific field
    products: String // JSON string containing product data
});

// Update the updatedAt timestamp before saving
// Drop all indexes and recreate only what we need
pageContentSchema.statics.setupIndexes = async function() {
    if (mongoose.connection.readyState === 1) {
        try {
            await mongoose.connection.collection('pagecontents').dropIndexes();
            await this.createIndexes();
            console.log('PageContent indexes updated successfully');
        } catch (error) {
            console.error('Error setting up indexes:', error);
        }
    }
};

// Update timestamps and handle section activation
pageContentSchema.pre('save', async function(next) {
    this.updatedAt = new Date();

    // If this is an active section, deactivate other sections of the same type
    if (this.isActive) {
        try {
            await this.constructor.updateMany(
                { 
                    type: this.type,
                    _id: { $ne: this._id }
                },
                { isActive: false }
            );
        } catch (error) {
            console.error('Error updating section status:', error);
        }
    }
    next();
});

// Set up indexes when the model is created
const PageContent = mongoose.model('PageContent', pageContentSchema);
PageContent.setupIndexes().catch(console.error);

module.exports = PageContent;
