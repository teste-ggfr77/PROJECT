const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');

const UserSchema = new Schema({
    name: { type: String, required: true },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    profilePicture: String,    contactNumber: { 
        type: String, 
        trim: true,
        validate: {
            validator: function(v) {
                return !v || /^[0-9+\-\(\) ]*$/.test(v);
            },
            message: 'Invalid phone number format'
        }
    },
    shippingAddress: { 
        type: String, 
        trim: true,
        maxlength: [500, 'Address cannot be longer than 500 characters']
    },    lastLogin: { type: Date, default: Date.now },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    createdAt: { type: Date, default: Date.now },
    preferredPaymentMethod: {
        type: String,
        enum: ['credit_card', 'debit_card', 'paypal', null],
        default: null
    },
    challenges: [{
        type: {
            type: String,
            enum: ['purchase', 'review', 'profile', 'referral']
        },
        name: String,
        completedAt: Date,
        reward: String,
        description: String
    }]
}, {
    timestamps: true
});

// Update profile method
UserSchema.methods.updateProfile = async function(data) {
    // Only update allowed fields
    const allowedFields = ['name', 'email', 'contactNumber', 'shippingAddress', 'preferredPaymentMethod'];
    allowedFields.forEach(field => {
        if (data[field] !== undefined) {
            this[field] = data[field];
        }
    });
    return await this.save();
};

// Update password method
UserSchema.methods.updatePassword = async function(newPassword) {
    this.password = await bcrypt.hash(newPassword, 10);
    return this.save();
};

// Update theme preference
UserSchema.methods.updateTheme = async function(darkMode) {
    this.darkMode = darkMode;
    return this.save();
};

// Update last login
UserSchema.methods.updateLastLogin = async function() {
    this.lastLogin = new Date();
    return this.save();
};

module.exports = mongoose.model('User', UserSchema);