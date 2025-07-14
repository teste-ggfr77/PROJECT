const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProductSchema = new Schema({
    name: { 
        type: String, 
        required: true,
        trim: true
    },
    description: { 
        type: String, 
        required: true 
    },
    price: { 
        type: Number, 
        required: true,
        min: 0 
    },
    colors: {
        type: [String],
        default: []
    },
    colorVariants: [{
        name: {
            type: String,
            required: true
        },
        images: [{
            type: String
        }]
    }],
    sizes: {
        type: [String],
        default: []
    },
    category: { 
        type: String, 
        required: true,
        ref: 'Category'
    },
    quantity: { 
        type: Number, 
        required: true,
        min: 0,
        default: 0
    },
    image: { 
        type: String,
        required: true
    },
    additionalPhotos: [{
        type: String
    }]
}, {
    timestamps: true,
    strict: true,
    strictQuery: true
});

// Pre-save middleware
ProductSchema.pre('save', async function(next) {
    if (this.isModified('name')) this.name = this.name.trim();
    if (this.isModified('description')) this.description = this.description.trim();
    if (this.isModified('category')) this.category = this.category.trim();
    if (this.isModified('colors')) {
        this.colors = this.colors
            .map(c => c.trim())
            .filter(Boolean);
    }
    if (this.isModified('sizes')) {
        this.sizes = this.sizes
            .map(s => s.trim())
            .filter(Boolean);
    }
    next();
});

// Pre-update middleware
ProductSchema.pre(['updateOne', 'findOneAndUpdate'], async function(next) {
    const update = this.getUpdate();
    if (!update) return next();

    // Clean up strings
    if (update.name) update.name = update.name.trim();
    if (update.description) update.description = update.description.trim();
    if (update.category) update.category = update.category.trim();
    if (update.colors) {
        update.colors = update.colors
            .map(c => c.trim())
            .filter(Boolean);
    }
    if (update.sizes) {
        update.sizes = update.sizes
            .map(s => s.trim())
            .filter(Boolean);
    }

    next();
});

module.exports = mongoose.model('Product', ProductSchema);